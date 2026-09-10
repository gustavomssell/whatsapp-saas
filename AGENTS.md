# WhatsApp SaaS — Contexto do Projeto

## Visão Geral

SaaS para gestão de WhatsApp profissional. Multi-tenant com autenticação JWT, integrado à Evolution API para envio/recebimento de mensagens.

| App | Stack | Porta |
|---|---|---|
| `backend/` | Go 1.23 + Chi Router + pgx/v5 + JWT + bcrypt | `:8090` |
| `frontend/` | React 18 + Vite 5 + Tailwind 3 + shadcn/ui | `:3080` |
| PostgreSQL | PostgreSQL 16-alpine | `:5435` |

**Infra:** Docker Compose (PostgreSQL + backend Go alpine ~15MB + frontend nginx)

---

## Convenções de Código

- **Idioma:** Todo o código em **português brasileiro**
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) em português
- **Estilo:** Sem comentários no código salvo quando absolutamente necessário
- **CSS:** Variáveis CSS no formato RGB (ex: `--primary: 0 255 167`) para transparência com `rgb(var(--primary) / <alpha-value>)`

---

## Estrutura do Projeto

### Backend (`backend/`)

```
cmd/api/main.go          # Entry point, rotas, middleware
internal/
├── config/config.go     # Env vars (DATABASE_URL, JWT_SECRET, EVOLUTION_API_URL, etc.)
├── database/database.go # Pool pgx + migrações
├── handler/             # Handlers HTTP (auth, whatsapp, upload, webhook)
├── middleware/auth.go    # JWT middleware (extract user_id, org_id, role)
├── models/models.go     # Structs Go + DTOs
├── repository/          # SQL queries (pgx/v5)
├── service/             # Lógica de negócio
│   ├── auth_service.go        # Register/Login/JWT
│   ├── evolution_client.go    # Evolution API client
│   ├── upload_service.go      # Upload de arquivos
│   └── whatsapp_service.go    # WhatsApp Inbox + webhook handler
└── socket/hub.go        # WebSocket hub para notificações em tempo real
migrations/
├── 001_initial.up.sql   # Schema completo (9 tabelas + índices)
└── 001_initial.down.sql
```

**Rotas da API:**

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Criar conta + organização |
| POST | `/api/auth/login` | Login + JWT |
| POST | `/api/auth/refresh` | Renovar token |
| GET | `/api/auth/profile` | Perfil do usuário |
| POST | `/api/whatsapp/connect` | Conectar instância Evolution |
| GET | `/api/whatsapp/status` | Status da conexão |
| POST | `/api/whatsapp/disconnect` | Desconectar |
| GET | `/api/whatsapp/conversations` | Listar conversas (paginado, filtros) |
| GET | `/api/whatsapp/conversations/{jid}/messages` | Mensagens da conversa |
| POST | `/api/whatsapp/conversations/{jid}/messages` | Enviar mensagem |
| POST | `/api/whatsapp/conversations/{jid}/media` | Enviar mídia |
| POST | `/api/whatsapp/conversations/{jid}/reaction` | Reação |
| POST | `/api/whatsapp/conversations/{jid}/archive` | Arquivar |
| POST | `/api/whatsapp/conversations/{jid}/unarchive` | Desarquivar |
| POST | `/api/whatsapp/conversations/{jid}/assign` | Atribuir guia |
| POST | `/api/whatsapp/conversations/{jid}/tags` | Atualizar tags |
| POST | `/api/whatsapp/conversations/{jid}/pin` | Fixar/desfixar |
| POST | `/api/whatsapp/conversations/bulk` | Ações em massa |
| GET | `/api/whatsapp/quick-replies` | Respostas rápidas |
| POST | `/api/whatsapp/quick-replies` | Criar resposta rápida |
| DELETE | `/api/whatsapp/quick-replies/{qrId}` | Deletar resposta rápida |
| GET | `/api/whatsapp/groups` | Listar grupos |
| GET | `/api/whatsapp/groups/{groupJid}/messages` | Mensagens do grupo |
| GET | `/api/dashboard/stats` | Estatísticas |
| POST | `/api/upload` | Upload de arquivo |
| POST | `/api/webhook/whatsapp` | Webhook Evolution API |
| GET | `/ws?token=` | WebSocket |

### Frontend (`frontend/`)

```
src/
├── App.tsx                    # Rotas (BrowserRouter)
├── main.tsx                   # Entry + ThemeProvider
├── index.css                  # CSS variables (dark/light)
├── components/
│   ├── layout/DashboardLayout.tsx  # Sidebar + topbar + theme switch
│   ├── ThemeProvider.tsx           # Context de tema (system/light/dark)
│   └── ThemeSwitch.tsx             # Pill toggle (system/light/dark)
├── features/
│   ├── auth/LoginPage.tsx
│   ├── auth/RegisterPage.tsx
│   ├── dashboard/DashboardPage.tsx
│   ├── inbox/InboxPage.tsx         # WhatsApp Inbox (conversas + chat)
│   ├── groups/GroupsPage.tsx       # Grupos WhatsApp
│   └── settings/SettingsPage.tsx   # Perfil + conexão WhatsApp
├── services/api.ts            # Axios/fetch client com JWT
├── store/authStore.ts         # Zustand (token, user, orgId)
├── lib/utils.ts               # cn() utility
└── types/                     # Interfaces TypeScript
```

**Rotas do Frontend:**

| Rota | Descrição |
|---|---|
| `/login` | Login |
| `/register` | Registro |
| `/` | Dashboard (stats) |
| `/inbox` | WhatsApp Inbox |
| `/inbox/:jid` | Conversa específica |
| `/groups` | Grupos WhatsApp |
| `/settings` | Configurações |

---

## Banco de Dados

**Multi-tenancy por coluna:** Todas as queries escopadas por `org_id`.

| Tabela | Finalidade |
|---|---|
| `organizations` | Tenants (name, slug, logo_url, whatsapp_instance_id, whatsapp_instance_name) |
| `users` | Contas (name, email, password_hash, role, avatar, phone) |
| `organization_members` | M2M org-usuário (role: owner/admin/member) |
| `whatsapp_conversations` | Conversas (jid, name, phone, is_group, unread_count, tags, assigned_guide) |
| `whatsapp_messages` | Mensagens (content, msg_type, media_url, from_me, status, reactions) |
| `whatsapp_notes` | Notas internas por conversa |
| `whatsapp_quick_replies` | Respostas rápidas (shortcut, content, variables) |
| `whatsapp_groups` | Grupos (group_jid, subject, description, participant_count) |
| `whatsapp_group_messages` | Mensagens de grupos |

---

## Autenticação

- **Registro:** `POST /api/auth/register` — cria user + org + owner
- **Login:** `POST /api/auth/login` — valida credenciais, gera JWT
- **JWT:** HS256, 24h expiry, claims: `user_id`, `org_id`, `role`
- **Frontend:** Zustand persist (localStorage), header `Authorization: Bearer <token>`

---

## Theme System

- **Formato:** CSS variables RGB (`--primary: 0 255 167`)
- **Toggle:** Pill switch (system/light/dark) idêntico ao Evolution docs
- **Storage:** `localStorage.wpsaas-theme`
- **Classes:** `html.dark` / `html.light`
- **Font:** Inter (Google Fonts)
- **Default:** Dark mode

---

## Evolution API

- **URL:** `EVOLUTION_API_URL` (default: `http://host.docker.internal:8082`)
- **Key:** `EVOLUTION_API_KEY`
- **Events:** `messages.upsert`, `message-receipt.update`, `groups.update`, `connection.update`
- **Endpoints usados:**
  - `POST /instance/create` — criar instância
  - `GET /instance/{name}/connect` — status/QR code
  - `DELETE /instance/{name}/connect` — desconectar
  - `POST /instance/{name}/sendText` — enviar texto
  - `POST /instance/{name}/sendMedia` — enviar mídia
  - `POST /instance/{name}/sendReaction` — reação
  - `GET /instance/{name}/chat/findContacts` — contatos
  - `GET /instance/{name}/group/fetchAllGroups` — grupos

---

## Design System

| Elemento | Dark | Light |
|---|---|---|
| Background | `rgb(11 14 14)` | `rgb(255 255 255)` |
| Card | `rgb(22 30 27)` | `rgb(255 255 255)` |
| Border | `rgb(37 45 42)` | `rgb(222 230 227)` |
| Primary | `rgb(0 255 167)` | `rgb(0 255 167)` |
| Text | `rgb(238 245 243)` | `rgb(22 30 27)` |
| Muted | `rgb(37 45 42)` | `rgb(242 250 247)` |

**Componentes:** Rounded-2xl, bordas sutis, hover com `border-primary/30`, transitions suaves.

---

## Comandos Úteis

```bash
# Subir tudo
cd whatsapp-saas && docker compose up -d

# Rebuild backend
docker compose build backend && docker compose up -d backend

# Rebuild frontend
docker compose build frontend && docker compose up -d frontend

# Ver logs
docker compose logs -f backend
docker compose logs -f frontend

# Testar API
Invoke-RestMethod -Uri "http://localhost:8090/api/auth/login" -Method POST -Body '{"email":"test@test.com","password":"teste123"}' -ContentType "application/json"
```

---

## Roadmap

- [ ] WebSocket para mensagens em tempo real
- [ ] Busca de contatos
- [ ] Respostas rápidas na UI
- [ ] Notas internas por conversa
- [ ] Atribuição de guias
- [ ] Tags e filtros avançados
- [ ] Dashboard com gráficos
- [ ] Upload de imagens/vídeos
- [ ] Envio de áudio
- [ ] Citação de mensagens
- [ ] Edição de mensagens
- [ ] End-to-end encryption support
