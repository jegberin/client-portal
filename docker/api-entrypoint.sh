#!/bin/sh
set -e

echo "Running database schema sync..."
bunx prisma db push --schema=./packages/database/prisma/schema.prisma --skip-generate
echo "Database ready."

if [ "${SUPABASE}" = "true" ]; then
  echo "Applying Row Level Security..."
  bun run ./packages/database/scripts/apply-rls.ts
  echo "RLS applied."
fi

exec bun run start:prod
