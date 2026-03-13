#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_DIR="$ROOT_DIR/packages/database"
SHARED_DIR="$ROOT_DIR/packages/shared"

# Ensure Bun is available — the deployment container may only have Node.js
if ! command -v bun &>/dev/null; then
  echo "==> Bun not found — installing..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
echo "==> Using Bun $(bun --version)"
export PATH="$HOME/.bun/bin:$PATH"

echo "==> Installing dependencies with Bun..."
cd "$ROOT_DIR"
bun install --frozen-lockfile

echo "==> Building shared package..."
cd "$SHARED_DIR"
bun x tsc --build

echo "==> Generating Prisma client..."
cd "$DB_DIR"
bun x prisma generate

echo "==> Building database package..."
bun x tsc --build

echo "==> Building API..."
cd "$ROOT_DIR/apps/api"
bun x nest build

echo "==> Building web (Next.js standalone)..."
cd "$ROOT_DIR/apps/web"
NODE_ENV=production bun x next build

echo "==> Copying public assets into standalone output..."
STANDALONE_DIR="$ROOT_DIR/apps/web/.next/standalone"
if [ -d "$STANDALONE_DIR" ]; then
  cp -r "$ROOT_DIR/apps/web/public" "$STANDALONE_DIR/public" 2>/dev/null || true
  mkdir -p "$STANDALONE_DIR/.next"
  cp -r "$ROOT_DIR/apps/web/.next/static" "$STANDALONE_DIR/.next/static" 2>/dev/null || true
fi

echo "==> Build complete!"
