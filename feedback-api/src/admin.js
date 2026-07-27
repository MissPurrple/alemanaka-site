/**
 * The review dashboard, served at /admin.
 *
 * Asks for the admin token once and keeps it in sessionStorage, so it is gone
 * when the tab closes. Every request carries it in the X-Admin-Token header.
 */

export const ADMIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Alemanaka — Suggestions</title>
<style>
  :root{
    --bg:#0b1020; --panel:#141a30; --edge:rgba(242,238,224,.14);
    --ink:#f2eee0; --soft:rgba(242,238,224,.78); --mute:rgba(242,238,224,.6);
    --gold:#e8b34a; --ember:#e2604a; --green:#5fd9a6;
    --serif:Georgia,serif; --sans:'Helvetica Neue',Helvetica,system-ui,sans-serif;
    --mono:'Courier New',Consolas,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.6}
  header{position:sticky;top:0;z-index:10;background:rgba(11,16,32,.95);backdrop-filter:blur(8px);
    border-bottom:1px solid var(--edge);padding:16px 22px;display:flex;flex-wrap:wrap;gap:14px;align-items:center}
  h1{font-family:var(--serif);font-size:1.15rem;margin:0;font-weight:600}
  .wrap{max-width:1000px;margin:0 auto;padding:26px 22px 80px}

  .tabs{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}
  .tabs button{font-family:var(--mono);font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;
    padding:8px 14px;border-radius:999px;border:1px solid var(--edge);background:transparent;
    color:var(--mute);cursor:pointer;transition:all .15s ease}
  .tabs button:hover{color:var(--ink);background:rgba(255,255,255,.06)}
  .tabs button.on{color:var(--gold);border-color:var(--gold);background:rgba(232,179,74,.1)}

  .item{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:20px 22px;margin-bottom:14px}
  .meta{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;font-family:var(--mono);
    font-size:.76rem;color:var(--mute);margin-bottom:12px}
  .who{font-family:var(--sans);font-size:.95rem;color:var(--ink);font-weight:600}
  .tag{padding:3px 10px;border-radius:999px;border:1px solid var(--edge);font-size:.7rem;letter-spacing:.06em}
  .tag.section{color:var(--gold);border-color:rgba(232,179,74,.4)}
  .tag.warn{color:var(--ember);border-color:rgba(226,96,74,.5);background:rgba(226,96,74,.1)}
  .body{white-space:pre-wrap;color:var(--soft);margin:0 0 16px;font-size:1rem}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .row button{font-size:.8rem;padding:8px 16px;border-radius:999px;border:1px solid var(--edge);
    background:transparent;color:var(--soft);cursor:pointer;transition:all .15s ease}
  .row button:hover{background:rgba(255,255,255,.08);color:var(--ink)}
  .row button.ok:hover{border-color:var(--green);color:var(--green)}
  .row button.no:hover{border-color:var(--ember);color:var(--ember)}
  .row input{flex:1;min-width:180px;padding:8px 14px;border-radius:999px;border:1px solid var(--edge);
    background:rgba(0,0,0,.25);color:var(--ink);font-family:var(--sans);font-size:.85rem}
  .row input:focus{outline:2px solid var(--gold);outline-offset:1px}

  .empty{text-align:center;color:var(--mute);padding:70px 20px;font-family:var(--serif);font-style:italic;font-size:1.1rem}
  .gate{max-width:34ch;margin:16vh auto;text-align:center}
  .gate input{width:100%;padding:12px 18px;border-radius:12px;border:1px solid var(--edge);
    background:rgba(0,0,0,.3);color:var(--ink);font-family:var(--mono);margin:14px 0}
  .gate button{padding:12px 28px;border-radius:999px;border:0;background:var(--gold);color:#05060d;
    font-weight:700;cursor:pointer}
  .err{color:var(--ember);font-size:.85rem;min-height:1.4em}
  .note{color:var(--mute);font-size:.8rem;font-style:italic}
</style>
</head>
<body>

<div id="gate" class="gate" hidden>
  <h1>Alemanaka suggestions</h1>
  <p class="note">Enter your review token.</p>
  <input id="token" type="password" placeholder="Admin token" autocomplete="off">
  <p class="err" id="gate-err"></p>
  <button id="enter">Open</button>
</div>

<div id="app" hidden>
  <header>
    <h1>Suggestions</h1>
    <div class="tabs" id="tabs"></div>
  </header>
  <div class="wrap"><div id="list"></div></div>
</div>

<script>
(function(){
  "use strict";
  var KEY = "alemanaka-admin-token";
  var status = "new";
  var counts = {};

  var gate = document.getElementById("gate");
  var app = document.getElementById("app");
  var list = document.getElementById("list");

  function token(){ return sessionStorage.getItem(KEY) || ""; }

  function api(path, opts){
    opts = opts || {};
    opts.headers = Object.assign({ "X-Admin-Token": token(), "Content-Type":"application/json" }, opts.headers||{});
    return fetch(path, opts);
  }

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function when(iso){
    if(!iso) return "";
    var d = new Date(iso);
    return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) +
           " · " + d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
  }

  function showGate(msg){
    gate.hidden = false; app.hidden = true;
    document.getElementById("gate-err").textContent = msg || "";
  }

  document.getElementById("enter").addEventListener("click", function(){
    var v = document.getElementById("token").value.trim();
    if(!v) return;
    sessionStorage.setItem(KEY, v);
    load();
  });
  document.getElementById("token").addEventListener("keydown", function(e){
    if(e.key === "Enter") document.getElementById("enter").click();
  });

  var TABS = [
    { id:"new", label:"To read" },
    { id:"accepted", label:"Accepted" },
    { id:"declined", label:"Set aside" },
    { id:"spam", label:"Spam" }
  ];

  function drawTabs(){
    var el = document.getElementById("tabs");
    el.textContent = "";
    TABS.forEach(function(t){
      var b = document.createElement("button");
      b.textContent = t.label + (counts[t.id] ? " (" + counts[t.id] + ")" : "");
      if(t.id === status) b.className = "on";
      b.addEventListener("click", function(){ status = t.id; load(); });
      el.appendChild(b);
    });
  }

  function load(){
    api("/api/admin/suggestions?status=" + encodeURIComponent(status))
      .then(function(r){
        if(r.status === 401){ sessionStorage.removeItem(KEY); showGate("That token wasn't accepted."); return null; }
        return r.json();
      })
      .then(function(data){
        if(!data) return;
        gate.hidden = true; app.hidden = false;
        counts = data.counts || {};
        drawTabs();
        render(data.rows || []);
      })
      .catch(function(){ showGate("Couldn't reach the server."); });
  }

  function render(rows){
    list.textContent = "";
    if(!rows.length){
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = status === "new" ? "Nothing waiting. The queue is clear." : "Nothing here.";
      list.appendChild(e);
      return;
    }

    rows.forEach(function(r){
      var item = document.createElement("div");
      item.className = "item";

      var meta = document.createElement("div");
      meta.className = "meta";

      var who = document.createElement("span");
      who.className = "who";
      who.textContent = r.name;
      meta.appendChild(who);

      var mail = document.createElement("span");
      mail.textContent = r.email;
      meta.appendChild(mail);

      var date = document.createElement("span");
      date.textContent = when(r.verified_at || r.created_at);
      meta.appendChild(date);

      if(r.section){
        var sec = document.createElement("span");
        sec.className = "tag section";
        sec.textContent = r.section;
        meta.appendChild(sec);
      }

      // Signals that the same person may be writing under several names.
      if(r.count_from_email > 1){
        var t1 = document.createElement("span");
        t1.className = "tag";
        t1.textContent = r.count_from_email + " from this address";
        meta.appendChild(t1);
      }
      if(r.emails_from_network > 1){
        var t2 = document.createElement("span");
        t2.className = "tag warn";
        t2.textContent = r.emails_from_network + " addresses from this network";
        meta.appendChild(t2);
      }

      item.appendChild(meta);

      var body = document.createElement("p");
      body.className = "body";
      body.textContent = r.body;
      item.appendChild(body);

      if(r.review_note){
        var n = document.createElement("p");
        n.className = "note";
        n.textContent = "Note: " + r.review_note;
        item.appendChild(n);
      }

      var row = document.createElement("div");
      row.className = "row";

      var note = document.createElement("input");
      note.placeholder = "Note to self (optional)";
      note.value = r.review_note || "";
      row.appendChild(note);

      function act(label, next, cls){
        var b = document.createElement("button");
        b.textContent = label;
        if(cls) b.className = cls;
        b.addEventListener("click", function(){
          b.disabled = true;
          api("/api/admin/review", {
            method:"POST",
            body: JSON.stringify({ id: r.id, status: next, note: note.value })
          }).then(function(){ load(); });
        });
        row.appendChild(b);
      }

      if(status !== "accepted") act("Accept", "accepted", "ok");
      if(status !== "declined") act("Set aside", "declined");
      if(status !== "spam") act("Spam", "spam", "no");
      if(status !== "new") act("Back to queue", "new");

      item.appendChild(row);
      list.appendChild(item);
    });
  }

  if(token()) load(); else showGate();
})();
</script>
</body>
</html>`;
