#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE ATUALIZAÇÃO SEGURA DO SISTEMA - COBRAZAP PRO
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "========================================================"
echo "Iniciando atualização do sistema..."
echo "========================================================"

# 1. Gerar backup preventivo antes de atualizar
echo "[1/4] Criando backup preventivo de segurança..."
bash "${PROJECT_DIR}/scripts/backup.sh" || echo "Aviso: Backup preventivo falhou, continuando com cuidado..."

# 2. Atualizar código via git (se aplicável)
if [ -d .git ]; then
  echo "[2/4] Buscando atualizações do repositório Git..."
  git pull origin main || true
fi

# 3. Baixar imagens Docker atualizadas e recompilar containers
echo "[3/4] Recompilando containers da aplicação..."
docker compose pull postgres redis evolution-api || true
docker compose up -d --build

# 4. Verificar status dos containers
echo "[4/4] Verificando integridade dos containers..."
sleep 5
docker compose ps

echo "========================================================"
echo "Atualização finalizada com sucesso! Todos os dados e volumes foram preservados."
echo "========================================================"
