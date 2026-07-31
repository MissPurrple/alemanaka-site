# Suggestion box — setup

The site is static, but confirming that a real person sent a suggestion needs a
server. This is that server: one Cloudflare Worker, one small database, one email
provider. Everything sits inside free tiers at this scale.

**How it works.** Someone writes a suggestion → it is stored as *unverified* and an
email goes out → they click the link → it becomes *new* and appears in your
dashboard → you accept, set aside, or mark it spam. Unconfirmed entries are deleted
after three days. Nothing ever reaches the site by itself.

## What you need

Two free accounts: [Cloudflare](https://dash.cloudflare.com/sign-up) and
[Resend](https://resend.com) for sending mail. Plus Node.js installed locally.

## The easy way

Open PowerShell in this folder and run:

```powershell
.\setup.ps1
```

It signs you in, creates the database and tables, fills in `wrangler.toml`,
takes your secrets, and deploys — then tells you the two values to paste back.
Safe to run more than once; it skips whatever is already done.

If you'd rather do it by hand, or the script stops partway, the same steps are
below.

## The steps by hand

**0. Sign in to Cloudflare first**

Nothing else works until this is done — it is what "you are not authenticated"
means if you have seen that error.

```bash
cd feedback-api && npx wrangler login
```

A browser window opens; approve the request and come back.

**1. Create the database**

```bash
cd feedback-api && npx wrangler d1 create alemanaka-feedback
```

Copy the `database_id` it prints into `wrangler.toml`.

**2. Create the tables**

```bash
cd feedback-api && npx wrangler d1 execute alemanaka-feedback --file=./schema.sql --remote
```

**3. Get a Turnstile key**

In the Cloudflare dashboard: **Turnstile → Add site**. Add your domain
(`misspurrple.github.io`). It gives you a *site key* and a *secret key*.

Turnstile is Cloudflare's bot check. Unlike a CAPTCHA it usually shows nothing at
all — most people just see a tick.

**4. Verify your sending domain with Resend**

In Resend: **Domains → Add domain**, enter `misspurple.io`, and add the DNS records
it asks for. Then create an API key.

Until this is done, mail can only be sent to your own address.

**5. Set the secrets**

```bash
cd feedback-api && npx wrangler secret put ADMIN_TOKEN
```

Repeat for `TURNSTILE_SECRET`, `RESEND_API_KEY`, and `IP_SALT`.

For `ADMIN_TOKEN` and `IP_SALT`, use long random strings. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**6. Deploy**

```bash
cd feedback-api && npx wrangler deploy
```

It prints your Worker URL. Put that URL into two places, then redeploy:

- `PUBLIC_API_URL` in `wrangler.toml` — builds the link inside the email
- `apiUrl` in the `window.ALEMANAKA_FEEDBACK` block near the bottom of `../index.html`

Also put your Turnstile **site key** into `turnstileKey` in that same block. (The
key that ships in the file is Cloudflare's public test key — it always passes, so
the form works before you set anything up. Replace it before launch.)

**7. Open your dashboard**

Visit `https://YOUR-WORKER-URL/admin` and paste your `ADMIN_TOKEN`. It is held only
for that browser tab.

## Spotting manufactured consensus

Each entry in the dashboard shows two counts:

- **"3 from this address"** — how many suggestions that email has sent
- **"4 addresses from this network"** — how many different email addresses have
  written in from the same network

The second is the one to watch. One person with several mailboxes pushing the same
point will usually show up as several addresses from one network. It is a signal,
not a verdict — a school, an office, or a shared phone hotspot will look the same.

Networks are stored as a salted hash, never as an actual address, so the raw
information does not exist to be leaked.

## Limits, honestly

Email confirmation proves someone controls a mailbox. It does not prove they are
who they say, and a determined person with ten Gmail accounts can still get ten
suggestions through. What it does is raise the cost enough to stop casual spam and
automated flooding, and give you the signals to notice the rest.

Current limits: three unreviewed suggestions per email address, five submissions
per network per day. Both are constants at the top of `src/index.js`.

## Cost

At any realistic volume for this project: nothing. Workers allow 100,000 requests a
day free, D1 gives 5 GB, and Resend sends 3,000 emails a month free. A busy week
here might be fifty suggestions.
