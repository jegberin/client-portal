#!/bin/bash
set -e

# Disable Corepack so it does not interfere with npm
corepack disable 2>/dev/null || true

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

echo "==> Pushing database schema..."
bunx prisma db push --skip-generate 2>&1 | grep -v "^$" | tail -5 || echo "Warning: Could not push schema"

cd "$ROOT_DIR"
echo "==> Starting services..."
exec bunx turbo run dev --filter=@atrium/api --filter=@atrium/web
