#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE INSTALAÇÃO AUTOMATIZADA - UBUNTU SERVER 24.04 LTS
# PROJETO: SISTEMA DE COBRANÇA AUTOMÁTICA VIA WHATSAPP (COBRAZAP PRO)
# ==============================================================================

set -e

# Cores para feedback visual
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${GREEN}   INICIANDO INSTALAÇÃO DO SISTEMA DE COBRANÇA AUTOMÁTICA VIA WHATSAPP       ${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# Verificar permissões de root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERRO] Este script deve ser executado como root ou com sudo.${NC}"
  echo -e "Exemplo: sudo bash scripts/install.sh"
  exit 1
fi

echo -e "\n${YELLOW}[1/6] Atualizando repositórios do Ubuntu 24.04...${NC}"
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw tar jq openssl

echo -e "\n${YELLOW}[2/6] Verificando e instalando Docker & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
  echo "Instalando Docker oficial..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}Docker instalado com sucesso!${NC}"
else
  echo -e "${GREEN}Docker já está instalado.${NC}"
fi

echo -e "\n${YELLOW}[3/6] Configurando variáveis de ambiente (.env)...${NC}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  echo "Criando arquivo .env a partir de .env.example com senhas seguras geradas automaticamente..."
  cp .env.example .env

  # Gerar chaves aleatórias e seguras
  RANDOM_JWT=$(openssl rand -hex 24)
  RANDOM_DB_PASS=$(openssl rand -hex 16)
  RANDOM_EVOL_KEY=$(openssl rand -hex 20)

  sed -i "s|JWT_SECRET=.*|JWT_SECRET=$RANDOM_JWT|g" .env
  sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$RANDOM_DB_PASS|g" .env
  sed -i "s|EVOLUTION_API_KEY=.*|EVOLUTION_API_KEY=$RANDOM_EVOL_KEY|g" .env
  echo -e "${GREEN}Arquivo .env gerado com chaves criptográficas seguras!${NC}"
else
  echo -e "${GREEN}Arquivo .env existente mantido.${NC}"
fi

# Carregar variáveis do .env
source .env
APP_PORT=${APP_PORT:-3000}

echo -e "\n${YELLOW}[4/6] Configurando Firewall UFW para a porta ${APP_PORT}...${NC}"
ufw allow 22/tcp || true
ufw allow ${APP_PORT}/tcp || true
# Habilitar ufw se não estiver ativo
ufw --force enable || true
echo -e "${GREEN}Porta ${APP_PORT} liberada com sucesso!${NC}"

# Criar diretórios de backup
mkdir -p backups

echo -e "\n${YELLOW}[5/6] Construindo e iniciando containers Docker...${NC}"
docker compose down || true
docker compose up -d --build

echo -e "\n${YELLOW}[6/6] Aguardando inicialização dos serviços (Postgres, Evolution API, Backend, Frontend)...${NC}"
sleep 10

# Obter IP público da VPS
PUBLIC_IP=$(curl -s -4 ifconfig.me || curl -s icanhazip.com || echo "SEU-IP-DA-VPS")

echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${GREEN}      SISTEMA INSTALADO E INICIADO COM SUCESSO NO UBUNTU 24.04!              ${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo -e "Acesse o painel administrativo pelo navegador:"
echo -e "${GREEN}👉 URL: http://${PUBLIC_IP}:${APP_PORT}${NC}"
echo -e "\nCredenciais iniciais do Administrador:"
echo -e "E-mail: ${YELLOW}${ADMIN_EMAIL:-admin@cobranca.com}${NC}"
echo -e "Senha:  ${YELLOW}${ADMIN_PASSWORD:-Admin@Seguro2026!}${NC}"
echo -e "\n${YELLOW}DICA DE SEGURANÇA:${NC} Troque a senha do administrador após o primeiro login na aba 'Configurações'!"
echo -e "${BLUE}==============================================================================${NC}"
