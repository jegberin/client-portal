#!/bin/bash
set -e

# Disable Corepack so it does not interfere with npm
corepack disable 2>/dev/null || true

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_DIR="$ROOT_DIR/packages/database"
SHARED_DIR="$ROOT_DIR/packages/shared"

echo "==> Installing dependencies..."
cd "$ROOT_DIR"
npm install --legacy-peer-deps

echo "==> Building shared package..."
cd "$SHARED_DIR"
npx --no-install tsc --build

echo "==> Generating Prisma client..."
cd "$DB_DIR"
npx --no-install prisma generate

echo "==> Building database package..."
npx --no-install tsc --build

echo "==> Building API..."
cd "$ROOT_DIR/apps/api"
npx --no-install nest build

echo "==> Building web (Next.js standalone)..."
cd "$ROOT_DIR/apps/web"
NODE_ENV=production npx --no-install next build

echo "==> Copying public assets into standalone output..."
# In a monorepo, server.js is at standalone/apps/web/server.js so static
# assets must be placed relative to that location, not the standalone root.
STANDALONE_DIR="$ROOT_DIR/apps/web/.next/standalone"
SERVER_JS=$(find "$STANDALONE_DIR" -maxdepth 4 -name "server.js" \
  -not -path "*/node_modules/*" 2>/dev/null | head -1)
if [ -n "$SERVER_JS" ]; then
  SERVER_DIR=$(dirname "$SERVER_JS")
  echo "==> server.js found at: $SERVER_JS"
  cp -r "$ROOT_DIR/apps/web/public" "$SERVER_DIR/public" 2>/dev/null || true
  mkdir -p "$SERVER_DIR/.next"
  cp -r "$ROOT_DIR/apps/web/.next/static" "$SERVER_DIR/.next/static" 2>/dev/null || true
  echo "==> Static assets copied to $SERVER_DIR"
else
  echo "WARNING: Could not find standalone server.js to copy assets next to"
fi

echo "==> Build complete!"
