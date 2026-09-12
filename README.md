# WhatsApp SaaS

Plataforma completa de gestão de WhatsApp profissional com modelo multi-tenant. Desenvolvida como projeto de portfólio demonstrando arquitetura full-stack, integração com APIs externas e boas práticas de engenharia de software.

![Go](https://img.shields.io/badge/Go-1.23-00ADD8?style=flat&logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript)

## Visão Geral

SaaS para gestão de WhatsApp profissional permitindo que organizações gerenciem múltiplas contas de WhatsApp com conversas em tempo real, automação de respostas, relatórios e gestão de equipe.

## Funcionalidades

### Core
- **Autenticação JWT** — Registro, login, refresh token, perfil
- **Multi-tenant** — Organizações isoladas por `org_id`
- **WhatsApp Inbox** — Conversas em tempo real via WebSocket
- **Envio de mensagens** — Texto, mídia (imagem, vídeo, áudio, documento)
- **Formatação estilo WhatsApp** — Bold, italic, strikethrough, code
- **Citação de mensagens** — Citar e navegar até mensagem original

### Gestão
- **Contatos** — CRUD completo, sincronização com Evolution API, importação/exportação CSV
- **Grupos** — Listagem, edição, exclusão, links de convite
- **Respostas rápidas** — Templates reutilizáveis com variáveis
- **Notas internas** — Anotações por conversa (visível apenas para a equipe)
- **Tags e filtros** — Categorização avançada de conversas
- **Atribuição de guias** — Designar responsável por conversa

### Automação
- **Mensagem de boas-vindas** — Auto-resposta para primeiro contato
- **Regras automáticas** — Respostas por palavra-chave (contém, exato, começa com)
- **Arquivamento automático** — Conversas inativas arquivadas

### Dashboard & Relatórios
- **Métricas em tempo real** — Conversas, mensagens enviadas/recebidas, grupos
- **Gráficos** — Evolução de mensagens (7, 14, 30 dias)
- **Tempo médio de resposta** — KPI de atendimento
- **Top contatos** — Contatos mais engajados
- **Performance por guia** — Estatísticas individuais
- **Exportação de relatórios** — Download em JSON

### Enterprise
- **Planos e assinaturas** — Free, Starter, Professional, Enterprise
- **Feature gating** — Funcionalidades por plano
- **Rate limiting** — Limites por tier
- **API keys** — Chaves de acesso à API
- **Auditoria** — Logs de ações dos usuários

### UX
- **Tema dark/light** — Toggle com detecção de sistema
- **i18n** — Português, Inglês, Espanhol
- **Notificações do navegador** — Alertas de novas mensagens
- **Sidebar colapsável** — Layout responsivo
- **Áudio melhorado** — Gravação com timer, pausa e cancelamento

## Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│    Backend    │────▶│  PostgreSQL   │
│  React/Vite  │◀────│   Go/Chi     │◀────│     16        │
│   :3080      │     │    :8090     │     │    :5435      │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────▼───────┐
                    │  Evolution    │
                    │     API      │
                    │   :8082      │
                    └──────────────┘
```

### Backend (Go)

```
cmd/api/main.go              # Entry point, rotas, middleware
internal/
├── config/config.go         # Variáveis de ambiente
├── database/database.go     # Pool pgx + migrações
├── handler/                 # Handlers HTTP
│   ├── handlers.go          # Auth, WhatsApp, Upload, Webhook
│   ├── contact_handler.go   # CRUD de contatos
│   └── extended_handler.go  # Grupos, perfil, auditoria, automação
├── middleware/
│   ├── auth.go              # JWT middleware
│   ├── feature_gating.go    # Controle por plano
│   └── rate_limit.go        # Rate limiting
├── models/models.go         # Structs e DTOs
├── repository/              # Queries SQL
├── service/                 # Lógica de negócio
└── socket/hub.go            # WebSocket hub
migrations/
├── 001_initial.up.sql       # Schema completo
├── 004_contacts.up.sql      # Tabela de contatos
└── 005_audit_automation.up.sql # Auditoria e automação
```

### Frontend (React)

```
src/
├── App.tsx                   # Rotas
├── main.tsx                  # Entry + ThemeProvider
├── components/
│   ├── layout/DashboardLayout.tsx
│   ├── ThemeProvider.tsx
│   └── ThemeSwitch.tsx
├── features/
│   ├── auth/                 # Login, Registro
│   ├── contacts/             # Gestão de contatos
│   ├── dashboard/            # Dashboard com métricas
│   ├── groups/               # Grupos WhatsApp
│   ├── inbox/                # Inbox com chat
│   └── settings/             # Configurações (5 tabs)
├── hooks/                    # useSocket, useBrowserNotifications
├── locales/                  # pt-BR, en, es
├── services/api.ts           # Cliente HTTP com JWT
├── store/authStore.ts        # Zustand (persist)
└── types/                    # Interfaces TypeScript
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, Vite 5, Tailwind 3, shadcn/ui, Zustand, React Query, React Hook Form, Zod |
| Backend | Go 1.23, Chi Router, pgx/v5, JWT, bcrypt |
| Banco | PostgreSQL 16 |
| Infra | Docker Compose, Nginx |
| WhatsApp | Evolution API |
| i18n | react-i18next (PT-BR, EN, ES) |

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Evolution API](https://github.com/EvolutionAPI/evolution-api) rodando na porta 8082

## Instalação

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/whatsapp-saas.git
cd whatsapp-saas

# Copiar variáveis de ambiente
cp .env.example .env

# Editar .env (obrigatório definir JWT_SECRET)
# ...
```

<br>

**Configurando JWT_SECRET:**

```bash
# Linux/Mac
sed -i "s/change-this-to-a-strong-random-secret/$(openssl rand -hex 32)/" .env

# Windows (PowerShell)
(Get-Content .env) -replace 'change-this-to-a-strong-random-secret', (-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })) | Set-Content .env
```

<br>

```bash
# Subir os serviços
docker compose up -d

# Verificar se está rodando
docker compose ps
```

Acesse:
- **Frontend:** http://localhost:3080
- **Backend API:** http://localhost:8090
- **PostgreSQL:** localhost:5435

## Desenvolvimento

### Comandos úteis

```bash
# Subir tudo
docker compose up -d

# Rebuild backend após alterações
docker compose build backend && docker compose up -d backend

# Rebuild frontend após alterações
docker compose build frontend && docker compose up -d frontend

# Ver logs
docker compose logs -f backend
docker compose logs -f frontend

# Parar tudo
docker compose down

# Parar e limpar volumes
docker compose down -v
```

### Testar API

```bash
# Registrar usuário
Invoke-RestMethod -Uri "http://localhost:8090/api/auth/register" `
  -Method POST `
  -Body '{"name":"Admin","email":"admin@example.com","password":"123456"}' `
  -ContentType "application/json"

# Login
Invoke-RestMethod -Uri "http://localhost:8090/api/auth/login" `
  -Method POST `
  -Body '{"email":"admin@example.com","password":"123456"}' `
  -ContentType "application/json"
```

### Stack de Desenvolvimento

| Ferramenta | Uso |
|-----------|-----|
| ESLint | Linting TypeScript |
| Prettier | Formatação de código |
| TypeScript | Type checking |
| Vite | Dev server com HMR |
| React Query | Server state management |
| React Hook Form + Zod | Forms com validação |

## Estrutura de Rotas

### Backend

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Renovar token |
| GET | `/api/auth/profile` | Perfil |
| PUT | `/api/auth/profile` | Atualizar perfil |
| POST | `/api/auth/password` | Alterar senha |
| POST | `/api/whatsapp/connect` | Conectar instância |
| GET | `/api/whatsapp/status` | Status conexão |
| POST | `/api/whatsapp/disconnect` | Desconectar |
| GET | `/api/whatsapp/conversations` | Listar conversas |
| GET | `/api/whatsapp/conversations/{jid}/messages` | Mensagens |
| POST | `/api/whatsapp/conversations/{jid}/messages` | Enviar mensagem |
| POST | `/api/whatsapp/conversations/{jid}/media` | Enviar mídia |
| GET | `/api/whatsapp/contacts` | Listar contatos |
| POST | `/api/whatsapp/contacts` | Criar contato |
| PUT | `/api/whatsapp/contacts/{id}` | Atualizar contato |
| DELETE | `/api/whatsapp/contacts/{id}` | Excluir contato |
| GET | `/api/whatsapp/groups` | Listar grupos |
| GET | `/api/dashboard/stats` | Estatísticas |
| GET | `/api/dashboard/chart` | Dados gráficos |
| POST | `/api/webhook/whatsapp` | Webhook Evolution |
| GET | `/ws?token=` | WebSocket |

### Frontend

| Rota | Descrição |
|------|-----------|
| `/login` | Login |
| `/register` | Registro |
| `/` | Dashboard |
| `/inbox` | WhatsApp Inbox |
| `/inbox/:jid` | Conversa específica |
| `/contacts` | Gestão de contatos |
| `/groups` | Grupos WhatsApp |
| `/settings` | Configurações (5 tabs) |

## Banco de Dados

Multi-tenancy por coluna — todas as queries escopadas por `org_id`.

| Tabela | Finalidade |
|--------|-----------|
| `organizations` | Tenants |
| `users` | Usuários |
| `organization_members` | M2M org-usuário |
| `whatsapp_conversations` | Conversas |
| `whatsapp_messages` | Mensagens |
| `whatsapp_notes` | Notas internas |
| `whatsapp_quick_replies` | Respostas rápidas |
| `whatsapp_contacts` | Contatos |
| `whatsapp_groups` | Grupos |
| `whatsapp_group_messages` | Mensagens de grupos |
| `audit_logs` | Logs de auditoria |
| `auto_reply_rules` | Regras automáticas |
| `welcome_messages` | Mensagens de boas-vindas |
| `plans` | Planos de assinatura |
| `subscriptions` | Assinaturas |
| `feature_usage` | Controle de uso |
| `api_keys` | Chaves de API |
| `rate_limits` | Rate limiting |

## Produção

```bash
# Usar docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d
```

Veja `docker-compose.prod.yml` para configurações de produção com:
- Senhas seguras via variáveis de ambiente
- SSL/TLS via Nginx reverse proxy
- Health checks
- Restart policies

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## Autor

**Gustavo Marques** — [GitHub](https://github.com/seu-usuario)

Desenvolvido como projeto de portfólio demonstrando:
- Arquitetura full-stack (Go + React)
- Integração com APIs externas (Evolution API)
- Modelagem de banco de dados relacional
- Autenticação JWT e autorização
- WebSocket para comunicação em tempo real
- Sistema multi-tenant
- Design system com Tailwind CSS
- Internacionalização (i18n)
- Docker e deploy containerizado
