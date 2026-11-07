# PLANO DE DESENVOLVIMENTO - SISTEMA DE COBRANÇA AUTOMÁTICA VIA WHATSAPP

## 1. Visão Geral e Arquitetura

O sistema é uma plataforma completa e independente de gestão de cobranças recorrentes com notificações automáticas via WhatsApp, desenvolvida para ser hospedada em VPS Ubuntu 24.04 utilizando Docker e Docker Compose.

### Arquitetura de Componentes
1. **Frontend (SPA React + TypeScript + Tailwind CSS + Lucide Icons + Vite):**
   - Interface moderna, responsiva, com suporte a tema limpo e profissional.
   - Comunicação via Axios com interceptors de autenticação JWT.
   - Servido em produção através do Nginx que também atua como Reverse Proxy para o backend.

2. **Backend (Node.js 20/22 + TypeScript + Express + Prisma ORM):**
   - API RESTful estruturada em Controllers, Services e Middlewares.
   - Autenticação JWT com hash de senhas via Bcrypt.
   - Validação de dados de entrada com Zod.
   - Mecanismo de agendamento automático com verificador diário e scheduler em fila (BullMQ / Cron com lock de concorrência e delays anti-ban).

3. **Banco de Dados (PostgreSQL 16):**
   - Armazenamento persistente de usuários, números WhatsApp, clientes, faturas/ciclos, pagamentos, histórico de envios e configurações gerais.
   - Mapeado com Prisma ORM para migrações automáticas e integridade referencial.

4. **Engine WhatsApp (Evolution API v2):**
   - API open source consolidada no GitHub (baseada na biblioteca Baileys).
   - Suporte nativo a múltiplas instâncias (multi-device e multi-número).
   - Geração de QR Code via REST e status de conexão em tempo real.
   - Persistência das sessões e credenciais de autenticação em volume Docker (`evolution_instances`).

5. **Redis (Redis 7 Alpine):**
   - Gerenciamento de filas de disparos assíncronos, rate limiting e agendamento preciso.

---

## 2. Escolha e Avaliação da API de WhatsApp

### API Selecionada: **Evolution API v2 (Open Source - GitHub)**
- **Repositório:** `atendai/evolution-api` (licença Apache 2.0 / MIT compatível).
- **Engine Subjacente:** Baileys (protocolo WhatsApp Web multi-device).
- **Vantagens:**
  - 100% gratuita e de código aberto.
  - Multi-instâncias nativo (permite cadastrar e gerenciar N números simultâneos).
  - API RESTful limpa e documentada: criação de instância, obtenção de QR code em base64, status de conexão e envio de mensagens.
  - Compatibilidade total com Docker e orquestração via Docker Compose.
  - Armazenamento de sessões persistido no PostgreSQL ou diretório de arquivos montado.
- **Riscos e Boas Práticas (Documentação de Mitigação):**
  - *Risco de desconexão:* O WhatsApp pode invalidar sessões ocasionalmente por atualizações ou falta de uso. O sistema possui auto-reconexão e alerta visual na interface.
  - *Risco de banimento/bloqueio:* Disparos excessivos ou em massa podem violar os termos do WhatsApp. Para mitigar, o sistema implementa:
    1. Intervalo configurável e aleatório entre mensagens (ex: 20 a 50 segundos).
    2. Janela de horário comercial permitida (ex: 08:00 às 18:00).
    3. Trava anti-duplicidade estrita por ciclo e etapa de cobrança.
    4. Limitação estrita para clientes que já possuem relacionamento prévio e opt-in.

---

## 3. Modelo de Dados (PostgreSQL / Prisma Schema)

- **User:** Usuários administradores do painel (id, email, password_hash, name, role, createdAt).
- **WhatsAppInstance:** Instâncias cadastradas (id, name, instanceName, token, status, qrcode, phone, createdAt, updatedAt).
- **Customer:** Clientes (id, name, phone, dueDate, recurrence, amount, customMessage, status, notes, whatsappId, createdAt, updatedAt).
- **Payment:** Histórico de pagamentos (id, customerId, amount, paidAt, dueDatePaid, notes, createdAt).
- **MessageHistory:** Registro de envios (id, customerId, whatsappId, phone, message, stage, status, failureReason, sentAt, createdAt).
- **Setting:** Configurações globais de disparo e padrões do sistema (id, key, value, description, updatedAt).
- **BillingLog:** Registro de ciclo para garantir que cada cliente só receba 1 mensagem por etapa (ex: ANTES, DIA, DEPOIS) para cada ciclo de vencimento.

---

## 4. Etapas de Desenvolvimento

- [x] **Etapa 1:** Definição da Arquitetura, escolha técnica e criação do `PLAN.md`.
- [ ] **Etapa 2:** Estruturação dos diretórios do projeto e ambiente Docker (`docker-compose.yml`, `.env.example`).
- [ ] **Etapa 3:** Desenvolvimento do Backend Node.js + TypeScript:
  - Configuração do Prisma ORM e migrações.
  - Camada de autenticação JWT e segurança (Bcrypt, Helmet, CORS, Rate Limit).
  - Serviços de integração com a Evolution API (criar instância, conectar/QR Code, status, envio de mensagens, webhook).
  - CRUD de Números de WhatsApp.
  - CRUD e filtros de Clientes.
  - Motor de Cobrança Automática (Scheduler, cálculo de recorrência, validações e travas anti-duplicidade).
  - Módulo de Controle de Pagamentos (Marcar como pago, avanço de vencimento e histórico).
  - Histórico de Envios com reenvio manual.
  - Estatísticas para o Dashboard.
  - Configurações do Sistema (régua de cobrança, horário de disparos, mensagem padrão).
- [ ] **Etapa 4:** Desenvolvimento do Frontend React + TypeScript + Tailwind CSS:
  - Estrutura de rotas protegidas e contexto de autenticação.
  - Layout responsivo moderno com Sidebar, Header e Notificações Toast.
  - Tela de Login com feedback de validação.
  - Dashboard completo com métricas em tempo real.
  - Gestão de Números WhatsApp com Modal de QR Code ao vivo e status de conexão.
  - Gestão de Clientes com busca, filtros avançados e visualização de detalhes.
  - Modal/Ação de "Marcar como Pago" com avanço automático de ciclo.
  - Tela de Régua de Cobrança e Configurações de Mensagens.
  - Histórico de Envios com status visual e reenvio manual.
  - Tela de Backup e Informações do Sistema.
- [ ] **Etapa 5:** Scripts de Automação para VPS Ubuntu 24.04:
  - `install.sh`: Instalação automática de dependências, Docker, UFW e inicialização.
  - `update.sh`: Atualização contínua sem perda de dados.
  - `backup.sh`: Backup completo do banco de dados e sessões.
  - `restore.sh`: Restauração rápida e segura a partir de arquivo de backup.
- [ ] **Etapa 6:** Testes automatizados e manuais dos endpoints e componentes.
- [ ] **Etapa 7:** Documentação detalhada (`README.md`) com passo a passo para VPS Ubuntu 24.04.
