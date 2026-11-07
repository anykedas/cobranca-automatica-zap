#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE BACKUP COMPLETO - SISTEMA DE COBRANÇA WHATSAPP
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if [ -f .env ]; then
  source .env
fi

BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_DUMP_DIR="${BACKUP_DIR}/temp_${TIMESTAMP}"
BACKUP_ARCHIVE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

mkdir -p "$TEMP_DUMP_DIR"

echo "========================================================"
echo "Iniciando processo de backup: ${TIMESTAMP}"
echo "========================================================"

# 1. Backup do Banco PostgreSQL
DB_USER=${DB_USER:-cobranca_user}
DB_NAME=${DB_NAME:-cobrancadb}

echo "[1/3] Gerando dump do banco PostgreSQL..."
docker exec -t cobranca_postgres pg_dump -U "$DB_USER" "$DB_NAME" > "${TEMP_DUMP_DIR}/database_dump.sql"

# 2. Copiar arquivo .env (contendo chaves criptográficas para descriptografia das instâncias)
if [ -f .env ]; then
  echo "[2/3] Copiando credenciais e configurações (.env)..."
  cp .env "${TEMP_DUMP_DIR}/.env.backup"
fi

# 3. Compactar em arquivo tar.gz
echo "[3/3] Compactando arquivo final de backup..."
tar -czf "$BACKUP_ARCHIVE" -C "$BACKUP_DIR" "temp_${TIMESTAMP}"

# Limpar arquivos temporários
rm -rf "$TEMP_DUMP_DIR"

# Rotação de backups antigos (mantém os últimos 30 dias)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +30 -delete || true

echo "========================================================"
echo "Backup gerado com sucesso!"
echo "Arquivo: ${BACKUP_ARCHIVE}"
echo "Tamanho: $(du -sh "$BACKUP_ARCHIVE" | cut -f1)"
echo "========================================================"
