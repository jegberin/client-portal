#!/bin/sh
set -e

echo "=== Crettyard Digital Client Portal Starting ==="

PG_RUNNING=false

if [ "${USE_BUILT_IN_DB}" = "true" ] || [ -z "${DATABASE_URL}" ]; then
  echo "Starting built-in PostgreSQL..."
  export PGDATA="/var/lib/postgresql/data"
  DB_USER="${POSTGRES_USER:-crettyard}"
  DB_PASS="${POSTGRES_PASSWORD:-crettyard}"
  DB_NAME="${POSTGRES_DB:-crettyard}"
  PG_BIN="/usr/lib/postgresql/16/bin"

  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL data directory..."
    "$PG_BIN/initdb" -D "$PGDATA" -U "$DB_USER" --auth=trust >/dev/null 2>&1
    echo "listen_addresses = '127.0.0.1'" >> "$PGDATA/postgresql.conf"
    echo "unix_socket_directories = '/tmp'" >> "$PGDATA/postgresql.conf"

    "$PG_BIN/pg_ctl" -D "$PGDATA" -w start -o "-k /tmp" >/dev/null 2>&1
    "$PG_BIN/psql" -U "$DB_USER" -h /tmp -c "ALTER USER $DB_USER PASSWORD '$DB_PASS';" >/dev/null 2>&1
    "$PG_BIN/psql" -U "$DB_USER" -h /tmp -c "CREATE DATABASE $DB_NAME;" >/dev/null 2>&1 || true
    "$PG_BIN/pg_ctl" -D "$PGDATA" -w stop >/dev/null 2>&1
  fi

  "$PG_BIN/pg_ctl" -D "$PGDATA" -w start -o "-k /tmp" >/dev/null 2>&1
  PG_RUNNING=true
  echo "PostgreSQL started."
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
else
  echo "Using external database: ${DATABASE_URL%%@*}@***"
fi

cd /app
if [ "${SKIP_DB_PUSH}" = "true" ]; then
  echo "Skipping database schema push (SKIP_DB_PUSH=true)"
else
  echo "Syncing database schema..."
  MIGRATION_URL="${DIRECT_URL:-$DATABASE_URL}"
  DATABASE_URL="$MIGRATION_URL" npx prisma db push --schema=./packages/database/prisma/schema.prisma --skip-generate
  echo "Database schema synced."
fi

echo "Starting API server on :3001..."
cd /app/apps/api
PORT=3001 node dist/main &
API_PID=$!

echo "Starting Web server on :3000..."
cd /app
HOSTNAME=127.0.0.1 PORT=3000 node apps/web/server.js &
WEB_PID=$!

cleanup() {
  kill $API_PID $WEB_PID 2>/dev/null
  wait $API_PID $WEB_PID 2>/dev/null
  if [ "$PG_RUNNING" = "true" ]; then
    echo "Stopping PostgreSQL..."
    /usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" -w stop >/dev/null 2>&1
  fi
}
trap cleanup TERM INT

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

echo "Starting reverse proxy on :8080..."
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
