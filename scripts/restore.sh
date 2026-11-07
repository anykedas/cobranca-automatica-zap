#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE RESTAURAÇÃO DE BACKUP - SISTEMA DE COBRANÇA WHATSAPP
# ==============================================================================

set -e

if [ -z "$1" ]; then
  echo "Uso: bash scripts/restore.sh <caminho_do_arquivo.tar.gz>"
  echo "Exemplo: bash scripts/restore.sh ./backups/backup_20261106_120000.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERRO] Arquivo de backup não encontrado: $BACKUP_FILE"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if [ -f .env ]; then
  source .env
fi

DB_USER=${DB_USER:-cobranca_user}
DB_NAME=${DB_NAME:-cobrancadb}

TEMP_RESTORE_DIR="${PROJECT_DIR}/backups/temp_restore"
rm -rf "$TEMP_RESTORE_DIR"
mkdir -p "$TEMP_RESTORE_DIR"

echo "========================================================"
echo "Iniciando restauração de backup..."
echo "Arquivo: $BACKUP_FILE"
echo "========================================================"

read -p "AVISO: A restauração substituirá os dados atuais do banco de dados. Deseja continuar? (s/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  echo "Restauração cancelada pelo usuário."
  exit 0
fi

# Descompactar
echo "[1/3] Extraindo arquivos do backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_RESTORE_DIR"

EXTRACTED_FOLDER=$(find "$TEMP_RESTORE_DIR" -maxdepth 1 -type d -name "temp_*" | head -n 1)

if [ -z "$EXTRACTED_FOLDER" ] || [ ! -f "${EXTRACTED_FOLDER}/database_dump.sql" ]; then
  echo "[ERRO] O arquivo database_dump.sql não foi localizado dentro do arquivo de backup."
  rm -rf "$TEMP_RESTORE_DIR"
  exit 1
fi

# Restaurar banco PostgreSQL
echo "[2/3] Restaurando dados no PostgreSQL..."
docker exec -i cobranca_postgres psql -U "$DB_USER" -d "$DB_NAME" < "${EXTRACTED_FOLDER}/database_dump.sql"

# Restaurar .env caso solicitado
if [ -f "${EXTRACTED_FOLDER}/.env.backup" ] && [ ! -f .env ]; then
  echo "Restaurando arquivo .env do backup..."
  cp "${EXTRACTED_FOLDER}/.env.backup" .env
fi

# Reiniciar containers para recarregar o estado
echo "[3/3] Reiniciando containers da aplicação..."
docker compose restart backend evolution-api

# Limpeza
rm -rf "$TEMP_RESTORE_DIR"

echo "========================================================"
echo "Restauração concluída com sucesso!"
echo "O banco de dados e as instâncias foram restabelecidos."
echo "========================================================"
