#!/bin/sh
set -e

echo "Running database schema sync..."
cd /app
npx prisma db push --schema=./packages/database/prisma/schema.prisma --skip-generate
echo "Database ready."

cd /app/apps/api
exec node dist/main
