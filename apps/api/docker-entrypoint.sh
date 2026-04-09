#!/bin/sh
set -e

echo "Running Prisma migrations..."
PRISMA_JS=$(find /app/node_modules/.pnpm -path "*/prisma/bin/prisma.js" | head -1)
if [ -z "$PRISMA_JS" ]; then
  echo "ERROR: prisma CLI not found in pnpm store" >&2
  exit 1
fi
node "$PRISMA_JS" migrate deploy --schema /app/apps/api/prisma/schema.prisma

echo "Starting API..."
exec node dist/server.js
