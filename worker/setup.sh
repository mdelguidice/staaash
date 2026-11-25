#!/usr/bin/env bash
# One-time setup of the staaash phone inbox on your Cloudflare account.
# Safe to run again: it reuses what exists and only deploys the latest code.
#   ./setup.sh            set up, or redeploy
#   ./setup.sh --rotate   also make new tokens (re-paste them on the Mac and phone)
set -euo pipefail
cd "$(dirname "$0")"

ROTATE=0
[[ "${1:-}" == "--rotate" ]] && ROTATE=1
DB_NAME=staaash-inbox
BUCKET=staaash-inbox-images
W="npx --no-install wrangler"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1/6  Installing tools"
npm ci --no-audit --no-fund >/dev/null

say "2/6  Checking you're logged in to Cloudflare"
if $W whoami 2>&1 | grep -qi "not authenticated"; then
  $W login
fi

say "3/6  Database and image bucket"
DB_ID=$($W d1 list --json 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    const db = JSON.parse(s).find(d => d.name === process.argv[1]); console.log(db ? db.uuid : "")
  })' "$DB_NAME")
if [[ -z "$DB_ID" ]]; then
  $W d1 create "$DB_NAME" >/dev/null
  DB_ID=$($W d1 list --json | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      console.log(JSON.parse(s).find(d => d.name === process.argv[1]).uuid)
    })' "$DB_NAME")
  echo "Created database $DB_NAME"
else
  echo "Using database $DB_NAME"
fi
if $W r2 bucket list 2>/dev/null | grep -q "$BUCKET"; then
  echo "Using bucket $BUCKET"
else
  if ! $W r2 bucket create "$BUCKET"; then
    echo "Couldn't create the R2 bucket. If Cloudflare says R2 isn't enabled, open the dashboard, go to R2, and turn it on (the free tier asks for a card), then run ./setup.sh again."
    exit 1
  fi
fi

# The real database id goes in a local copy, so wrangler.jsonc stays clean in git.
node -e '
  const fs = require("fs")
  const src = fs.readFileSync("wrangler.jsonc", "utf8").replace(/"database_id": "local-only"/, `"database_id": "${process.argv[1]}"`)
  fs.writeFileSync("wrangler.local.jsonc", src)' "$DB_ID"
CFG="-c wrangler.local.jsonc"

say "4/6  Database tables"
$W d1 migrations apply "$DB_NAME" --remote $CFG

say "5/6  Deploying"
OUT=$($W deploy $CFG 2>&1) || { echo "$OUT"; exit 1; }
URL=$(echo "$OUT" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1)
echo "$OUT" | tail -4

say "6/6  Tokens"
HAVE=$($W secret list $CFG 2>/dev/null | grep -c '"PHONE_TOKEN"\|"DESKTOP_TOKEN"' || true)
if [[ "$HAVE" -ge 2 && "$ROTATE" -eq 0 ]]; then
  echo "Tokens already set. Your Mac and phone keep working."
  echo "Lost them? Run ./setup.sh --rotate to make new ones."
  PHONE=""; DESK=""
else
  PHONE=$(openssl rand -hex 32)
  DESK=$(openssl rand -hex 32)
  printf '%s' "$PHONE" | $W secret put PHONE_TOKEN $CFG >/dev/null
  printf '%s' "$DESK" | $W secret put DESKTOP_TOKEN $CFG >/dev/null
fi

say "Done"
echo "Inbox address:  ${URL:-(see the deploy output above)}"
if [[ -n "$PHONE" ]]; then
  echo
  echo "Desktop token (staaash › Settings › Phone inbox):"
  echo "  $DESK"
  echo
  echo "Phone token (open ${URL:-the inbox address}/app in Chrome on your phone):"
  echo "  $PHONE"
  echo
  echo "These are shown once and not saved anywhere. Copy them now."
fi
