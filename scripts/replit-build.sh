#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_DIR="$ROOT_DIR/packages/database"
SHARED_DIR="$ROOT_DIR/packages/shared"

echo "==> Building shared package..."
cd "$SHARED_DIR"
bunx tsc --build

echo "==> Generating Prisma client..."
cd "$DB_DIR"
bunx prisma generate

echo "==> Building database package..."
bunx tsc --build

echo "==> Building API..."
cd "$ROOT_DIR/apps/api"
bunx nest build

echo "==> Building web (Next.js standalone)..."
cd "$ROOT_DIR/apps/web"
NODE_ENV=production bunx next build

echo "==> Copying public assets into standalone output..."
STANDALONE_DIR="$ROOT_DIR/apps/web/.next/standalone"
if [ -d "$STANDALONE_DIR" ]; then
  cp -r "$ROOT_DIR/apps/web/public" "$STANDALONE_DIR/public" 2>/dev/null || true
  mkdir -p "$STANDALONE_DIR/.next"
  cp -r "$ROOT_DIR/apps/web/.next/static" "$STANDALONE_DIR/.next/static" 2>/dev/null || true
fi

echo "==> Build complete!"
