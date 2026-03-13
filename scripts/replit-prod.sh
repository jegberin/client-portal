#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Disable Corepack so it does not interfere with npm
corepack disable 2>/dev/null || true

export NODE_ENV=production

# ── Domain configuration ────────────────────────────────────────────────────
# Priority: explicit secrets (set in Replit deployment env vars) win over
# REPLIT_DOMAINS auto-detection, which gives the .replit.app domain and would
# be wrong when a custom domain (e.g. clients.digital.crettyard.com) is used.
if [ -z "$BETTER_AUTH_URL" ] && [ -n "$REPLIT_DOMAINS" ]; then
  PRIMARY_DOMAIN=$(echo "$REPLIT_DOMAINS" | cut -d',' -f1)
  PUBLIC_URL="https://$PRIMARY_DOMAIN"
  export BETTER_AUTH_URL="$PUBLIC_URL"
  export WEB_URL="${WEB_URL:-$PUBLIC_URL}"
  export API_URL="${API_URL:-$PUBLIC_URL}"
  echo "==> Auto-detected deployment domain: $PRIMARY_DOMAIN"
else
  echo "==> Using explicit BETTER_AUTH_URL: $BETTER_AUTH_URL"
fi

echo "==> Applying database schema..."
cd "$ROOT_DIR/packages/database"
npx --no-install prisma db push --skip-generate 2>&1 | grep -v "^$" | tail -5 || echo "Warning: db push failed (non-fatal)"

echo "==> Starting API on :3001..."
cd "$ROOT_DIR/apps/api"
node dist/main.js &
API_PID=$!

# ── Wait for API to be ready before starting the web server ─────────────────
# Without this wait, the web server accepts traffic while the API is still
# initialising — login and other API calls fail with ECONNREFUSED.
echo "==> Waiting for API to be ready..."
MAX_WAIT=60
WAITED=0
until curl -sf http://localhost:3001/api/health >/dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "ERROR: API did not become ready within ${MAX_WAIT}s"
    kill $API_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done
echo "==> API is ready (${WAITED}s)"

echo "==> Locating Next.js standalone server..."
NEXT_SERVER=$(find "$ROOT_DIR/apps/web/.next/standalone" -maxdepth 4 -name "server.js" \
  -not -path "*/node_modules/*" 2>/dev/null | head -1)
if [ -z "$NEXT_SERVER" ]; then
  echo "ERROR: Could not find Next.js standalone server.js — was the build step run?"
  kill $API_PID 2>/dev/null || true
  exit 1
fi
NEXT_SERVER_DIR=$(dirname "$NEXT_SERVER")
echo "==> Starting web on :5000 (from $NEXT_SERVER_DIR)..."
cd "$NEXT_SERVER_DIR"
PORT=5000 HOSTNAME=0.0.0.0 node server.js &
WEB_PID=$!

echo "==> Both services started (API PID=$API_PID, Web PID=$WEB_PID)"

# Exit if either process dies so the container restarts cleanly
wait $API_PID $WEB_PID
