#!/bin/sh
set -e

echo "[Backend Entrypoint] Sincronizando schema com o banco de dados..."
npx prisma db push

echo "[Backend Entrypoint] Verificando semente de dados e configurações..."
npx tsx prisma/seed.ts || true

echo "[Backend Entrypoint] Iniciando servidor Node.js..."
exec node dist/index.js
