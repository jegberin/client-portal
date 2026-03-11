#!/bin/sh
set -e

echo "=== Atrium Starting ==="

# Sync database schema (skip with SKIP_DB_PUSH=true for pooled connections)
cd /app
if [ "${SKIP_DB_PUSH}" = "true" ]; then
  echo "Skipping database schema push (SKIP_DB_PUSH=true)"
else
  echo "Syncing database schema..."
  MIGRATION_URL="${DIRECT_URL:-$DATABASE_URL}"
  DATABASE_URL="$MIGRATION_URL" ./packages/database/node_modules/.bin/prisma db push --schema=./packages/database/prisma/schema.prisma --skip-generate
  echo "Database schema synced."

  # Apply Row Level Security (locks out Supabase anon/authenticated roles)
  # Only needed when using Supabase — set SUPABASE=true to activate
  if [ "${SUPABASE}" = "true" ]; then
    echo "Applying Row Level Security..."
    DATABASE_URL="$MIGRATION_URL" bun run ./packages/database/scripts/apply-rls.ts
    echo "RLS applied."
  fi
fi

# Start NestJS API in background
echo "Starting API server on :3001..."
cd /app/apps/api
PORT=3001 node -e "
process.on('uncaughtException', (e) => { console.error('API UNCAUGHT:', e.stack || e); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error('API UNHANDLED REJECTION:', e?.stack || e); process.exit(1); });
try { require('./dist/main'); }
catch(e) { console.error('API FATAL:', e.stack || e); process.exit(1); }
" &
API_PID=$!

# Start Next.js in background
echo "Starting Web server on :3000..."
cd /app
HOSTNAME=127.0.0.1 PORT=3000 node apps/web/server.js &
WEB_PID=$!

# Graceful shutdown
trap 'kill $API_PID $WEB_PID 2>/dev/null; wait $API_PID $WEB_PID 2>/dev/null' TERM INT

# Wait for API to be ready
echo "Waiting for API..."
for i in $(seq 1 30); do
  if ! kill -0 $API_PID 2>/dev/null; then
    echo "API failed to start. Check logs above."
    break
  fi
  if wget -qO- http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
    echo "API ready (took ${i}s)"
    break
  fi
  sleep 1
done

# Start Caddy reverse proxy in foreground
echo "Starting reverse proxy on :8080..."
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
