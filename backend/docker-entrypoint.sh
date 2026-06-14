#!/bin/sh
set -e

echo "[backend] Ensuring DynamoDB table exists..."
npm run db:create-table

echo "[backend] Starting API..."
exec npx tsx src/index.ts
