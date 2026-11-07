# SISTEMA WEB DE COBRANÇA AUTOMÁTICA VIA WHATSAPP (COBRAZAP PRO)

Sistema web completo e profissional para gerenciamento de clientes, controle de mensalidades recorrentes e envio automático de mensagens de cobrança via WhatsApp por data de vencimento.

Desenvolvido para implantação em VPS com **Ubuntu Server 24.04 LTS**, utilizando **Docker**, **Docker Compose** e a engine open source **Evolution API v2**.

---

## 1. Arquitetura e Tecnologias

- **Sistema Operacional Hospedeiro:** Ubuntu Server 24.04 LTS (ou qualquer distribuição Linux moderna com Docker).
- **Backend:** Node.js 20+ com TypeScript, Express, Prisma ORM, JWT e Bcrypt.
- **Frontend:** React 18 com TypeScript, Tailwind CSS, Lucide Icons, empacotado via Vite e servido por Nginx como Reverse Proxy transparente.
- **Banco de Dados:** PostgreSQL 16 (dados persistidos no volume Docker `pgdata`).
- **Fila e Cache:** Redis 7 Alpine (dados persistidos no volume Docker `redisdata`).
- **Engine WhatsApp:** Evolution API v2 (open source, baseada na biblioteca Baileys, multi-instâncias e sessões persistidas no volume `evolution_instances`).
- **Agendamento de Envios:** Agendador integrado via `node-cron` com travas anti-duplicidade e controle de horários permitidos.
- **Segurança de Rede:** Apenas a porta configurada no painel (`APP_PORT=3000`) fica exposta externamente. Banco de dados, Redis e APIs internas comunicam-se exclusivamente pela rede privada `cobranca_net`.

---

## 2. Documentação de Riscos e Boas Práticas (WhatsApp Baileys)

Como a Evolution API utiliza o protocolo WhatsApp Web Multi-Device (Baileys):

### Riscos Inerentes
1. **Desconexão Ocasional:** O WhatsApp periodicamente invalida sessões não utilizadas ou após grandes atualizações no aplicativo. O sistema monitora a conexão em tempo real e permite reconectar rapidamente via QR Code sem perder os clientes cadastrados.
2. **Bloqueio por Spam:** O envio massivo ou para destinatários que bloqueiam/denunciam o número pode resultar no banimento temporário ou permanente do chip.

### Mecanismos de Proteção Implementados
- **Janela de Horário Comercial:** Os envios automáticos ocorrem estritamente entre os horários configurados (padrão: 08:00 às 18:00).
- **Delay Aleatório Anti-Ban:** Intervalo aleatório configurável (padrão: 15 a 35 segundos) entre cada mensagem para simular o comportamento humano.
- **Trava Estrita Anti-Duplicidade:** O banco armazena o ciclo e a etapa enviada (`BEFORE_DUE`, `ON_DUE`, `AFTER_DUE`). O sistema nunca envia a mesma mensagem duas vezes para o mesmo ciclo de fatura.
- **Recomendação Operacional:** Utilize chips que já tenham sido "aquecidos" (com histórico de conversas ativas) e envie mensagens exclusivamente para clientes com relacionamento comercial prévio e autorização.

---

## 3. Requisitos Mínimos da VPS

- **VPS:** Ubuntu Server 24.04 LTS 64-bit.
- **Hardware Recomendado:** 2 vCPUs e 2 GB a 4 GB de memória RAM.
- **Disco:** Mínimo de 25 GB SSD.
- **Portas Liberadas:** Porta 22 (SSH) e a porta configurada no `.env` (Padrão: `3000`).

---

## 4. Guia de Instalação Rápida no Ubuntu 24.04

### Passo 1: Acessar a VPS via SSH
```bash
ssh root@SEU_IP_DA_VPS
```

### Passo 2: Baixar ou Transferir o Projeto para a VPS
Clone o repositório ou transfira a pasta do projeto para o diretório `/opt/cobranca-whatsapp`:
```bash
mkdir -p /opt/cobranca-whatsapp
cd /opt/cobranca-whatsapp
# (Transfira os arquivos do projeto para este diretório)
```

### Passo 3: Executar o Script de Instalação Automática
O script instala o Docker, Docker Compose, utilitários, configura o firewall (UFW), gera chaves criptográficas seguras no `.env` e inicializa todos os containers:
```bash
chmod +x scripts/*.sh
sudo bash scripts/install.sh
```

Ao final, o script exibirá a URL de acesso com seu IP público e as credenciais padrão de acesso.

---

## 5. Como Acessar o Painel Administrativo

Abra o navegador de sua preferência e acesse:
```
http://IP_DA_SUA_VPS:3000
```
*(Caso tenha alterado a variável `APP_PORT` no `.env`, substitua `3000` pela porta configurada).*

### Credenciais Iniciais de Administrador
- **E-mail:** `admin@cobranca.com`
- **Senha:** `Admin@Seguro2026!`

> **IMPORTANTE:** Após realizar o primeiro login, acesse a aba **Configurações** no menu lateral e altere a senha do administrador.

---

## 6. Conectando seus Números de WhatsApp

1. No menu lateral, acesse **Números WhatsApp**.
2. No campo **Adicionar Novo Número WhatsApp**, digite um nome identificador (ex: *Financeiro 01*, *Cobrança Matriz*).
3. Clique em **Cadastrar e Conectar**.
4. O modal de conexão será aberto automaticamente exibindo o **QR Code**.
5. No seu celular:
   - Abra o WhatsApp.
   - Acesse **Configurações** (ou menu de 3 pontos no Android) > **Aparelhos Conectados** > **Conectar um aparelho**.
   - Aponte a câmera para o QR Code na tela.
6. O sistema detectará a leitura automaticamente em poucos segundos, atualizando o status para **Conectado** (verde com indicador pulsante).
7. É possível cadastrar quantos números de WhatsApp forem necessários. As sessões ficam salvas em volume Docker e **não caem após reinicializações da VPS**.

---

## 7. Cadastrando e Gerenciando Clientes

1. No menu lateral, acesse **Clientes** e clique no botão verde **Novo Cliente**.
2. Preencha as informações:
   - **Nome Completo:** Ex: *Maria Souza*.
   - **Telefone:** Informe DDD + Número com DDI (Ex: `5511999998888`).
   - **Data de Vencimento:** Data da próxima fatura.
   - **Recorrência:**
     - *Mensal:* +1 mês após a confirmação do pagamento.
     - *Trimestral:* +3 meses.
     - *Semestral:* +6 meses.
     - *Anual:* +1 ano.
   - **Valor da Mensalidade (R$):** Ex: `180.00`.
   - **WhatsApp Responsável:** Selecione qual dos números conectados fará os disparos para este cliente.
   - **Mensagem Personalizada (Opcional):** Você pode deixar em branco para usar o padrão da empresa ou personalizar com variáveis (`{nome}`, `{vencimento}`, `{valor}`, `{chave_pix}`, etc.).
   - **Status:** Ativo (recebe cobranças) ou Inativo.
   - **Observações:** Anotações internas sobre o cliente.
3. Clique em **Cadastrar Cliente**.

---

## 8. Configurando as Cobranças Automáticas

No menu lateral, acesse **Cobranças**:
1. **Régua de Cobrança:**
   - **Lembrete Prévio:** Quantos dias antes do vencimento avisar (ex: `3` dias).
   - **No Dia do Vencimento:** Marque se deseja disparar uma mensagem no dia do vencimento.
   - **Aviso de Atraso:** Quantos dias após o vencimento avisar quem não pagou (ex: `2` dias).
2. **Janela de Horário Comercial:** Ex: Início às `08:00` e Término às `18:00`.
3. **Anti-Bloqueio (Delays):** Intervalo aleatório em segundos entre disparos (ex: Mínimo `15s`, Máximo `35s`).
4. **Chave PIX e Nome da Empresa:** Informe a chave PIX e o nome da sua empresa para que sejam injetados automaticamente nos templates.
5. **Modelos de Mensagens:** Edite o texto das 3 etapas da régua utilizando os botões de variáveis rápidas.
6. Clique em **Salvar Regras e Mensagens**.

> O agendador executa automaticamente a cada 10 minutos em segundo plano verificando os clientes que atingiram o prazo. Você também pode clicar em **Executar Cobranças Agora** ou no botão de play no topo da tela para processar a fila imediatamente.

---

## 9. Controle de Pagamentos ("Marcar como Pago")

Quando um cliente realizar o pagamento:
1. Acesse **Clientes** ou localize-o no **Dashboard**.
2. Clique no botão verde **Baixar** (Marcar como Pago).
3. Uma janela abrirá com o valor da fatura, data do pagamento e observações.
4. Clique em **Confirmar e Avançar Vencimento**.
5. **O sistema automaticamente:**
   - Registra o pagamento no histórico financeiro.
   - Avança o vencimento para o próximo ciclo com base na recorrência (ex: se era mensal, soma 1 mês).
   - Reinicia o ciclo de cobrança e cancela mensagens pendentes do ciclo antigo para evitar cobranças indevidas.

---

## 10. Histórico de Envios e Auditoria

Na seção **Histórico de Envios**:
- Consulte todos os disparos realizados com data, hora, cliente, número do WhatsApp e status (**Enviada**, **Falha**, **Pendente** ou **Cancelada**).
- Em caso de falha (ex: WhatsApp do cliente temporariamente fora do ar ou sem internet), o motivo exato retornado pela API fica visível.
- Clique em **Ver Detalhes** > **Tentar Reenviar Mensagem** para reenviar manualmente com um clique.

---

## 11. Rotinas de Backup e Restauração

Todos os comandos devem ser executados na pasta do projeto na VPS:

### Como Gerar um Backup Completo:
```bash
sudo bash scripts/backup.sh
```
O script gera um arquivo compactado `.tar.gz` dentro de `./backups/` contendo:
- Dump integral do banco de dados PostgreSQL.
- Cópia do arquivo `.env` com as chaves criptográficas.

### Como Restaurar um Backup:
```bash
sudo bash scripts/restore.sh ./backups/backup_NOME_DO_ARQUIVO.tar.gz
```
O script valida o arquivo, restaura o banco de dados e reinicia os serviços automaticamente.

---

## 12. Atualização do Sistema

Para atualizar o sistema sem perder dados nem desconectar o WhatsApp:
```bash
sudo bash scripts/update.sh
```
O script cria um backup preventivo automático, baixa as alterações e recompila os containers com segurança.

---

## 13. Comandos Docker do Dia a Dia

- **Ver status de todos os serviços:**
  ```bash
  docker compose ps
  ```
- **Acompanhar logs em tempo real:**
  ```bash
  docker compose logs -f
  ```
- **Acompanhar logs apenas do backend (cobranças e scheduler):**
  ```bash
  docker compose logs -f backend
  ```
- **Acompanhar logs da Evolution API:**
  ```bash
  docker compose logs -f evolution-api
  ```
- **Reiniciar todos os containers:**
  ```bash
  docker compose restart
  ```
- **Parar os serviços:**
  ```bash
  docker compose down
  ```
- **Subir os serviços em segundo plano:**
  ```bash
  docker compose up -d
  ```

---

## 14. Inicialização Automática após Reinício da VPS

Todos os serviços possuem a diretiva `restart: unless-stopped` configurada no `docker-compose.yml`. Quando a VPS é reiniciada ou ligada após uma manutenção, o Docker inicia automaticamente todos os containers (Postgres, Redis, Evolution API, Backend e Frontend), mantendo as conexões e o agendamento ativos sem necessidade de intervenção manual.
