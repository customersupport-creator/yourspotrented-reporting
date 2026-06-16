#!/usr/bin/env bash
# Creates a public live URL for the Weekly Reporting dashboard.
#  - starts the app on http://localhost:4000 if it isn't already running
#  - opens a Cloudflare quick tunnel and prints your public https URL
# Leave this window open while sharing; press Ctrl+C to stop.

set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.local/node20/bin:$PATH"

CF="$HOME/.local/bin/cloudflared"

# 1) Make sure the app is up.
if ! curl -s http://localhost:4000/api/health >/dev/null 2>&1; then
  echo "→ Starting the app on http://localhost:4000 ..."
  NODE_ENV=production nohup node server/src/index.js >/tmp/yspr.log 2>&1 &
  for _ in $(seq 1 20); do
    curl -s http://localhost:4000/api/health >/dev/null 2>&1 && break
    sleep 1
  done
fi

if ! curl -s http://localhost:4000/api/health >/dev/null 2>&1; then
  echo "✗ Could not start the app. See /tmp/yspr.log"
  exit 1
fi
echo "✓ App is running on http://localhost:4000"

# 2) Make sure cloudflared can run (ad-hoc sign if macOS would block it).
if [ ! -x "$CF" ]; then
  echo "✗ cloudflared not found at $CF"
  exit 1
fi
codesign -v "$CF" >/dev/null 2>&1 || codesign --force --sign - "$CF" >/dev/null 2>&1 || true
xattr -dr com.apple.quarantine "$CF" >/dev/null 2>&1 || true

echo "→ Creating your public live URL (look for the https://….trycloudflare.com link below)"
echo "   Keep this window open. Press Ctrl+C to stop sharing."
echo
exec "$CF" tunnel --url http://localhost:4000 --no-autoupdate
