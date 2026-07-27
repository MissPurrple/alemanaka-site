/**
 * Alemanaka — suggestion box API
 *
 * A visitor writes a suggestion, confirms it by clicking a link in their email,
 * and it lands in a review queue. Nothing reaches the site automatically.
 *
 * Routes
 *   POST /api/suggestions          submit (Turnstile-checked, rate-limited)
 *   GET  /verify?token=…           confirm ownership of the email address
 *   GET  /admin                    review dashboard (token-gated)
 *   GET  /api/admin/suggestions    list for the dashboard
 *   POST /api/admin/review         set a status / leave a note
 */

import { ADMIN_PAGE } from "./admin.js";

const MAX_BODY = 4000;
const MAX_NAME = 120;
const UNVERIFIED_TTL_HOURS = 72;

// A person may hold this many suggestions awaiting review before being asked to wait.
const MAX_PENDING_PER_EMAIL = 3;
const MAX_PER_IP_PER_DAY = 5;

const SECTIONS = [
  "The seasons", "The months", "The moon", "The crops",
  "The Sesotho", "The printed calendar", "Something else"
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") return preflight(request, env);

    try {
      if (path === "/api/suggestions" && request.method === "POST") return await submit(request, env);
      if (path === "/api/subscribe" && request.method === "POST") return await subscribe(request, env);
      if (path === "/verify" && request.method === "GET") return await verify(url, env);
      if (path === "/unsubscribe" && request.method === "GET") return await unsubscribe(url, env);
      if (path === "/admin" && request.method === "GET") return html(ADMIN_PAGE);
      if (path === "/api/admin/suggestions" && request.method === "GET") return await adminList(request, env);
      if (path === "/api/admin/review" && request.method === "POST") return await adminReview(request, env);
      if (path === "/health") return json({ ok: true });
      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
  },

  /** Nightly sweep: drop submissions whose email was never confirmed. */
  async scheduled(event, env) {
    const cutoff = new Date(Date.now() - UNVERIFIED_TTL_HOURS * 3600_000).toISOString();
    await env.DB.prepare(
      "DELETE FROM suggestions WHERE status = 'unverified' AND created_at < ?"
    ).bind(cutoff).run();
  }
};

/* ------------------------------------------------------------------ *
 * Submission
 * ------------------------------------------------------------------ */

async function submit(request, env) {
  const origin = request.headers.get("Origin") || "";
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "We couldn't read that submission." }, 400, origin, env);
  }

  const name = str(payload.name).slice(0, MAX_NAME);
  const email = str(payload.email).toLowerCase();
  const body = str(payload.body).slice(0, MAX_BODY);
  const section = SECTIONS.includes(str(payload.section)) ? str(payload.section) : null;

  // Honeypot: a field hidden from people, irresistible to naive bots.
  if (str(payload.website)) return json({ ok: true }, 200, origin, env);

  if (name.length < 2) return json({ error: "Please add your name." }, 400, origin, env);
  if (!isEmail(email)) return json({ error: "That email address doesn't look right." }, 400, origin, env);
  if (body.length < 10) return json({ error: "Please say a little more about your suggestion." }, 400, origin, env);

  const okBot = await checkTurnstile(payload.turnstileToken, request, env);
  if (!okBot) return json({ error: "We couldn't verify that you're a person. Please reload and try again." }, 400, origin, env);

  const ipHash = await hashIp(request, env);

  const pending = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM suggestions WHERE email = ? AND status IN ('unverified','new')"
  ).bind(email).first();
  if (pending && pending.n >= MAX_PENDING_PER_EMAIL) {
    return json({
      error: "You already have suggestions waiting to be read. Please give us a chance to catch up before sending more — thank you."
    }, 429, origin, env);
  }

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM suggestions WHERE ip_hash = ? AND created_at > ?"
  ).bind(ipHash, since).first();
  if (recent && recent.n >= MAX_PER_IP_PER_DAY) {
    return json({ error: "That's a lot of suggestions from one place today. Please try again tomorrow." }, 429, origin, env);
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  await env.DB.prepare(
    `INSERT INTO suggestions (id, created_at, status, name, email, section, body, ip_hash, user_agent, verify_token)
     VALUES (?, ?, 'unverified', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, new Date().toISOString(), name, email, section, body,
    ipHash, str(request.headers.get("User-Agent")).slice(0, 300), token
  ).run();

  const sent = await sendVerifyEmail(env, { name, email, token });
  if (!sent.ok) {
    await env.DB.prepare("DELETE FROM suggestions WHERE id = ?").bind(id).run();
    return json({ error: "We couldn't send the confirmation email just now. Please try again shortly." }, 502, origin, env);
  }

  return json({ ok: true, message: "Check your email and click the link to send your suggestion through." }, 200, origin, env);
}

/* ------------------------------------------------------------------ *
 * Mailing list for the printed calendar
 * ------------------------------------------------------------------ */

async function subscribe(request, env) {
  const origin = request.headers.get("Origin") || "";
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "We couldn't read that." }, 400, origin, env);
  }

  if (str(payload.website)) return json({ ok: true }, 200, origin, env);

  const email = str(payload.email).toLowerCase();
  if (!isEmail(email)) return json({ error: "That email address doesn't look right." }, 400, origin, env);

  const existing = await env.DB.prepare(
    "SELECT status FROM subscribers WHERE email = ?"
  ).bind(email).first();

  if (existing && existing.status === "subscribed") {
    // Say the same thing either way, so the endpoint can't be used to find
    // out whether an address is on the list.
    return json({ ok: true }, 200, origin, env);
  }

  const ipHash = await hashIp(request, env);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM subscribers WHERE ip_hash = ? AND created_at > ?"
  ).bind(ipHash, since).first();
  if (recent && recent.n >= 10) {
    return json({ error: "Too many sign-ups from here today. Please try again tomorrow." }, 429, origin, env);
  }

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await env.DB.prepare(
    `INSERT INTO subscribers (email, created_at, status, ip_hash, verify_token)
     VALUES (?, ?, 'pending', ?, ?)
     ON CONFLICT(email) DO UPDATE SET created_at = excluded.created_at, verify_token = excluded.verify_token`
  ).bind(email, new Date().toISOString(), ipHash, token).run();

  const sent = await sendSubscribeEmail(env, { email, token });
  if (!sent.ok) return json({ error: "We couldn't send the confirmation email just now. Please try again shortly." }, 502, origin, env);

  return json({ ok: true }, 200, origin, env);
}

async function unsubscribe(url, env) {
  const token = str(url.searchParams.get("token"));
  if (!token) return html(confirmPage("This link is incomplete.", "Please use the whole link from your email."), 400);

  const row = await env.DB.prepare("SELECT email FROM subscribers WHERE verify_token = ?").bind(token).first();
  if (!row) return html(confirmPage("This link is no longer valid.", "You may already have been removed from the list."), 404);

  await env.DB.prepare(
    "UPDATE subscribers SET status = 'unsubscribed' WHERE verify_token = ?"
  ).bind(token).run();

  return html(confirmPage("You're removed from the list.", "We won't email you about the printed calendar again."));
}

/* ------------------------------------------------------------------ *
 * Email confirmation
 * ------------------------------------------------------------------ */

async function verify(url, env) {
  const token = str(url.searchParams.get("token"));
  if (!token) return html(confirmPage("This link is incomplete.", "Please use the whole link from your email."), 400);

  // The same link style confirms both a suggestion and a mailing-list sign-up.
  const sub = await env.DB.prepare(
    "SELECT email, status FROM subscribers WHERE verify_token = ?"
  ).bind(token).first();

  if (sub) {
    if (sub.status === "subscribed") {
      return html(confirmPage("Already confirmed.", "You're on the list for the printed calendar."));
    }
    await env.DB.prepare(
      "UPDATE subscribers SET status = 'subscribed', confirmed_at = ? WHERE verify_token = ?"
    ).bind(new Date().toISOString(), token).run();
    return html(confirmPage(
      "Kea leboha!",
      "You're on the list. We'll write to you once the printed Alemanaka is ready."
    ));
  }

  const row = await env.DB.prepare(
    "SELECT id, name, status FROM suggestions WHERE verify_token = ?"
  ).bind(token).first();

  if (!row) {
    return html(confirmPage("This link has expired.", "Unconfirmed suggestions are cleared after three days. Please send yours again."), 404);
  }
  if (row.status !== "unverified") {
    return html(confirmPage("Already confirmed.", "Thank you — your suggestion is in the queue."));
  }

  await env.DB.prepare(
    "UPDATE suggestions SET status = 'new', verified_at = ?, verify_token = NULL WHERE id = ?"
  ).bind(new Date().toISOString(), row.id).run();

  return html(confirmPage(
    "Kea leboha, " + escapeHtml(row.name) + ".",
    "Your suggestion is confirmed and waiting to be read. Every one is looked at by a person."
  ));
}

/* ------------------------------------------------------------------ *
 * Review dashboard
 * ------------------------------------------------------------------ */

function authed(request, env) {
  const given = str(request.headers.get("X-Admin-Token"));
  const expected = str(env.ADMIN_TOKEN);
  if (!expected || given.length !== expected.length) return false;
  // Constant-time-ish comparison so the token can't be guessed byte by byte.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function adminList(request, env) {
  if (!authed(request, env)) return json({ error: "Unauthorised" }, 401);

  const url = new URL(request.url);
  const status = str(url.searchParams.get("status")) || "new";
  const valid = ["new", "accepted", "declined", "spam"];
  if (!valid.includes(status)) return json({ error: "Unknown status" }, 400);

  const { results } = await env.DB.prepare(
    `SELECT id, created_at, verified_at, status, name, email, section, body, ip_hash, review_note
       FROM suggestions WHERE status = ? ORDER BY created_at DESC LIMIT 200`
  ).bind(status).all();

  // Context that makes manufactured consensus visible: how many other
  // suggestions share this email, and how many share this network.
  const rows = [];
  for (const r of results) {
    const byEmail = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM suggestions WHERE email = ? AND status != 'unverified'"
    ).bind(r.email).first();
    const byIp = await env.DB.prepare(
      "SELECT COUNT(DISTINCT email) AS n FROM suggestions WHERE ip_hash = ? AND status != 'unverified'"
    ).bind(r.ip_hash).first();
    rows.push({
      ...r,
      ip_hash: (r.ip_hash || "").slice(0, 8),
      count_from_email: byEmail ? byEmail.n : 1,
      emails_from_network: byIp ? byIp.n : 1
    });
  }

  const counts = {};
  for (const s of valid) {
    const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM suggestions WHERE status = ?").bind(s).first();
    counts[s] = c ? c.n : 0;
  }

  return json({ rows, counts });
}

async function adminReview(request, env) {
  if (!authed(request, env)) return json({ error: "Unauthorised" }, 401);

  const { id, status, note } = await request.json();
  if (!["accepted", "declined", "spam", "new"].includes(str(status))) {
    return json({ error: "Unknown status" }, 400);
  }

  await env.DB.prepare(
    "UPDATE suggestions SET status = ?, reviewed_at = ?, review_note = ? WHERE id = ?"
  ).bind(status, new Date().toISOString(), str(note).slice(0, 1000) || null, str(id)).run();

  return json({ ok: true });
}

/* ------------------------------------------------------------------ *
 * Bot check
 * ------------------------------------------------------------------ */

async function checkTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) return true; // Not configured yet — allow, so local testing works.
  if (!str(token)) return false;

  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  const data = await res.json();
  return data.success === true;
}

/* ------------------------------------------------------------------ *
 * Email
 * ------------------------------------------------------------------ */

async function sendVerifyEmail(env, { name, email, token }) {
  const link = `${env.PUBLIC_API_URL}/verify?token=${encodeURIComponent(token)}`;

  if (!env.RESEND_API_KEY) {
    // No mail provider configured yet: log the link so the flow can be tested.
    console.log("[dev] verification link for " + email + ": " + link);
    return { ok: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.RESEND_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [email],
      subject: "Confirm your suggestion for Alemanaka",
      text:
        `Lumela ${name},\n\n` +
        `Thank you for your suggestion for Alemanaka. Click the link below to confirm it ` +
        `and send it through for review:\n\n${link}\n\n` +
        `If you didn't write to us, you can ignore this — nothing will be sent.\n\n` +
        `The link expires in three days.\n\n` +
        `Alemanaka — Barefaced Media`,
      html:
        `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#20263a;max-width:520px">` +
        `<p>Lumela ${escapeHtml(name)},</p>` +
        `<p>Thank you for your suggestion for <strong>Alemanaka</strong>. Please confirm it so we know the address is yours:</p>` +
        `<p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#a3721c;color:#fff;text-decoration:none;border-radius:999px">Confirm my suggestion</a></p>` +
        `<p style="font-size:14px;color:#5a6072">If you didn't write to us, you can ignore this — nothing will be sent. The link expires in three days.</p>` +
        `<p style="font-size:14px;color:#5a6072">Alemanaka — Barefaced Media</p>` +
        `</div>`
    })
  });

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    return { ok: false };
  }
  return { ok: true };
}

async function sendSubscribeEmail(env, { email, token }) {
  const link = `${env.PUBLIC_API_URL}/verify?token=${encodeURIComponent(token)}`;
  const stop = `${env.PUBLIC_API_URL}/unsubscribe?token=${encodeURIComponent(token)}`;

  if (!env.RESEND_API_KEY) {
    console.log("[dev] subscribe link for " + email + ": " + link);
    return { ok: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [email],
      subject: "Confirm your place for the printed Alemanaka",
      text:
        `Lumela,\n\nPlease confirm you'd like to hear when the printed Alemanaka ` +
        `calendar is ready:\n\n${link}\n\n` +
        `If you didn't ask for this, ignore this email and nothing happens.\n\n` +
        `Alemanaka — Barefaced Media\nRemove me from this list: ${stop}`,
      html:
        `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#20263a;max-width:520px">` +
        `<p>Lumela,</p>` +
        `<p>Please confirm you'd like to hear when the printed <strong>Alemanaka</strong> calendar is ready:</p>` +
        `<p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#a3721c;color:#fff;text-decoration:none;border-radius:999px">Confirm my place</a></p>` +
        `<p style="font-size:14px;color:#5a6072">If you didn't ask for this, ignore this email and nothing happens.</p>` +
        `<p style="font-size:13px;color:#8b90a0">Alemanaka — Barefaced Media · <a href="${stop}" style="color:#8b90a0">remove me from this list</a></p>` +
        `</div>`
    })
  });

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    return { ok: false };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function str(v) { return typeof v === "string" ? v.trim() : ""; }

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;
}

async function hashIp(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const data = new TextEncoder().encode(ip + "|" + (env.IP_SALT || "alemanaka"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function allowOrigin(origin, env) {
  const list = str(env.ALLOWED_ORIGINS).split(",").map(s => s.trim()).filter(Boolean);
  if (!list.length) return "*";
  return list.includes(origin) ? origin : list[0];
}

function corsHeaders(origin, env) {
  return {
    "Access-Control-Allow-Origin": allowOrigin(origin, env),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Admin-Token",
    "Access-Control-Max-Age": "86400"
  };
}

function preflight(request, env) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("Origin") || "", env) });
}

function json(data, status = 200, origin = "", env = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin, env) }
  });
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function confirmPage(heading, message) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Alemanaka</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
    background:radial-gradient(ellipse 90% 60% at 50% 0%,#141a30 0%,#05060d 60%) fixed,#05060d;
    color:#f2eee0;font-family:'Helvetica Neue',Helvetica,system-ui,sans-serif;line-height:1.65}
  .card{max-width:44ch;text-align:center}
  h1{font-family:Georgia,serif;font-size:1.9rem;font-weight:600;margin:0 0 14px}
  p{color:rgba(242,238,224,.78);margin:0 0 26px}
  a{display:inline-block;padding:12px 26px;border-radius:999px;border:1px solid rgba(242,238,224,.2);
    color:#e8b34a;text-decoration:none;font-size:.9rem}
  a:hover{background:rgba(255,255,255,.06)}
</style></head><body><div class="card">
<h1>${heading}</h1><p>${message}</p>
<a href="https://misspurrple.github.io/alemanaka-site">Back to Alemanaka</a>
</div></body></html>`;
}
