#!/bin/sh
set -e

echo "Running database migrations..."
pnpm prisma migrate deploy

echo "Starting server..."
exec node dist/index.js
