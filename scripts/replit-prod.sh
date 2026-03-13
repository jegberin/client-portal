#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

export NODE_ENV=production

# Auto-detect the deployed public domain from Replit's environment.
# REPLIT_DOMAINS is set automatically in deployed replits (e.g. "myapp.replit.app").
# We always override the URL env vars when REPLIT_DOMAINS is present because the
# [userenv.shared] values in .replit point to the dev-preview domain, not production.
if [ -n "$REPLIT_DOMAINS" ]; then
  PRIMARY_DOMAIN=$(echo "$REPLIT_DOMAINS" | cut -d',' -f1)
  PUBLIC_URL="https://$PRIMARY_DOMAIN"
  export BETTER_AUTH_URL="$PUBLIC_URL"
  export WEB_URL="$PUBLIC_URL"
  export API_URL="$PUBLIC_URL"
  echo "==> Detected deployment domain: $PRIMARY_DOMAIN"
fi

echo "==> Applying database schema..."
cd "$ROOT_DIR/packages/database"
bunx prisma db push --skip-generate 2>&1 | grep -v "^$" | tail -5 || echo "Warning: db push failed (non-fatal)"

echo "==> Starting API on :3001..."
cd "$ROOT_DIR/apps/api"
node dist/main.js &
API_PID=$!

echo "==> Locating Next.js standalone server..."
NEXT_SERVER=$(find "$ROOT_DIR/apps/web/.next/standalone" -maxdepth 3 -name "server.js" 2>/dev/null | head -1)
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
