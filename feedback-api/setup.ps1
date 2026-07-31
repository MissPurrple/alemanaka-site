# Alemanaka — one-shot setup for the suggestion box and mailing list.
#
# Run it from this folder in PowerShell:
#     .\setup.ps1
#
# It logs you into Cloudflare, creates the database, fills in wrangler.toml,
# creates the tables, takes your secrets, and deploys. Safe to run again —
# it skips anything already done.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Say($msg)  { Write-Host "`n$msg" -ForegroundColor Cyan }
function Good($msg) { Write-Host "  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  $msg" -ForegroundColor Yellow }

Say "Alemanaka setup"
Write-Host "  This will set up the server that receives suggestions and email sign-ups."

# --- 1. Node -----------------------------------------------------------------
Say "1/6  Checking Node.js"
try {
  $nodeVersion = node --version
  Good "Node $nodeVersion"
} catch {
  Warn "Node.js isn't installed. Get it from https://nodejs.org (choose LTS), then run this again."
  exit 1
}

# --- 2. Cloudflare login -----------------------------------------------------
Say "2/6  Signing in to Cloudflare"
$who = npx --yes wrangler@latest whoami 2>&1 | Out-String
if ($who -match "not authenticated") {
  Warn "A browser window will open. Approve the request, then come back here."
  npx --yes wrangler@latest login
  $who = npx --yes wrangler@latest whoami 2>&1 | Out-String
  if ($who -match "not authenticated") {
    Warn "Still not signed in. Run '.\setup.ps1' again once the browser step completes."
    exit 1
  }
}
Good "Signed in"

# --- 3. Database -------------------------------------------------------------
Say "3/6  Creating the database"
$toml = Get-Content .\wrangler.toml -Raw

if ($toml -match 'database_id\s*=\s*"PASTE_AFTER_CREATING_THE_DATABASE"') {
  npx --yes wrangler@latest d1 create alemanaka-feedback 2>&1 | Out-String | Out-Null

  $list = npx --yes wrangler@latest d1 list --json 2>&1 | Out-String
  $dbId = $null
  try {
    $json = $list | ConvertFrom-Json
    $dbId = ($json | Where-Object { $_.name -eq "alemanaka-feedback" } | Select-Object -First 1).uuid
  } catch {
    if ($list -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { $dbId = $Matches[1] }
  }

  if (-not $dbId) {
    Warn "Couldn't read the database id automatically."
    Warn "Run 'npx wrangler d1 list', copy the uuid, and paste it into wrangler.toml as database_id."
    exit 1
  }

  $toml = $toml -replace 'database_id\s*=\s*"PASTE_AFTER_CREATING_THE_DATABASE"', "database_id = `"$dbId`""
  Set-Content .\wrangler.toml -Value $toml -Encoding utf8 -NoNewline
  Good "Database created and wrangler.toml updated"
} else {
  Good "Database already configured"
}

# --- 4. Tables ---------------------------------------------------------------
Say "4/6  Creating the tables"
npx --yes wrangler@latest d1 execute alemanaka-feedback --file=./schema.sql --remote --yes
Good "Tables ready"

# --- 5. Secrets --------------------------------------------------------------
Say "5/6  Setting your secrets"
Write-Host "  Four values. Press Enter to skip any you've already set."

function New-Token { -join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) }) }

Write-Host "`n  ADMIN_TOKEN — your password for the review dashboard."
$suggested = New-Token
Write-Host "  Suggested (copy this somewhere safe): $suggested" -ForegroundColor Magenta
$adminToken = Read-Host "  ADMIN_TOKEN (Enter to use the suggested one)"
if (-not $adminToken) { $adminToken = $suggested }
$adminToken | npx --yes wrangler@latest secret put ADMIN_TOKEN

Write-Host "`n  IP_SALT — scrambles stored network fingerprints. Any long random string."
$salt = New-Token
$salt | npx --yes wrangler@latest secret put IP_SALT

Write-Host "`n  TURNSTILE_SECRET — from Cloudflare dashboard, Turnstile, Add site."
$ts = Read-Host "  TURNSTILE_SECRET (Enter to skip for now)"
if ($ts) { $ts | npx --yes wrangler@latest secret put TURNSTILE_SECRET }

Write-Host "`n  RESEND_API_KEY — from resend.com, API Keys."
$rs = Read-Host "  RESEND_API_KEY (Enter to skip for now)"
if ($rs) { $rs | npx --yes wrangler@latest secret put RESEND_API_KEY }

Good "Secrets stored"

# --- 6. Deploy ---------------------------------------------------------------
Say "6/6  Deploying"
$deploy = npx --yes wrangler@latest deploy 2>&1 | Out-String
Write-Host $deploy

$workerUrl = $null
if ($deploy -match '(https://[a-z0-9\-\.]+\.workers\.dev)') { $workerUrl = $Matches[1] }

Say "Done"
if ($workerUrl) {
  Write-Host "  Your server is at: $workerUrl" -ForegroundColor Green
  Write-Host "  Your dashboard is at: $workerUrl/admin" -ForegroundColor Green
  Write-Host "`n  Two last edits, then you're live:" -ForegroundColor Yellow
  Write-Host "   1. In feedback-api\wrangler.toml set PUBLIC_API_URL to $workerUrl"
  Write-Host "      then run: npx wrangler deploy"
  Write-Host "   2. In index.html find ALEMANAKA_FEEDBACK and set apiUrl to $workerUrl"
  Write-Host "      and turnstileKey to your Turnstile *site* key."
} else {
  Warn "Deployed, but couldn't read the URL. Find it in the output above or at dash.cloudflare.com."
}
