#!/bin/sh
set -e

echo "Running Prisma migrations..."
/app/node_modules/.bin/prisma migrate deploy --schema /app/apps/api/prisma/schema.prisma

echo "Starting API..."
exec node dist/server.js
