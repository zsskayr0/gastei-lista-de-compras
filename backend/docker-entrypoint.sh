#!/bin/sh
set -e

echo "Aplicando migrações do Prisma..."
npx prisma migrate deploy

exec "$@"
