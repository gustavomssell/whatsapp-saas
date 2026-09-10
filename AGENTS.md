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

## Git e GitFlow

### Branching Model

```
main                  # Produção estável, sempre deployável
  └── develop         # Integração de todas as features
       ├── feature/*  # Novas funcionalidades
       ├── hotfix/*   # Correções urgentes em produção
       └── release/*  # Preparação de release
```

### Fluxo de Trabalho

| Ação | Comando | Branch Destino |
|---|---|---|
| Nova feature | `git checkout -b feature/nome-da-feature develop` | `develop` |
| Bugfix | `git checkout -b hotfix/nome-do-fix main` | `main` + `develop` |
| Release | `git checkout -b release/v1.x.x develop` | `main` |

### Regras

1. **Nunca commitar direto em `main`** — apenas via PR ou merge de release/hotfix
2. **`develop` é a branch de integração** — todas as features convergem aqui
3. **Feature branches** devem ser nomeadas: `feature/curta-descricao`
4. **Hotfix branches** devem ser nomeadas: `hotfix/curta-descricao`
5. **Squash commits** ao merge de feature em develop (manter histórico limpo)
6. **Tag em cada release** no `main`: `git tag -a v1.0.0 -m "Release 1.0.0"`

### Conventional Commits

```
<tipo>(escopo): <descrição>

Tipos:
  feat     → Nova funcionalidade
  fix      → Correção de bug
  refactor → Refatoração sem mudar comportamento
  style    → Formatação, indentation (sem mudança de código)
  test     → Adição/correção de testes
  docs     → Documentação
  chore    → Configurações, dependências, build
  perf     → Melhoria de performance
  ci       → Mudanças em CI/CD
  revert   → Reverter commit anterior

Exemplos:
  feat(inbox): adicionar busca de contatos
  fix(backend): corrigir validação de JWT no webhook
  refactor(frontend): extrair hook useConversations
  chore: atualizar dependências do frontend
```

### Commits no Projeto (Português)

Como o projeto usa português, os commits também devem ser em português:

```
feat(inbox): adicionar painel de notas internas
fix(backend): corrigir query de busca por JID
refactor(frontend): converter InboxPage para componentes menores
chore: adicionar migration para tabela de configurações
```

### Pré-commit Checklist

- [ ] Código compila sem erros (`go build ./...` / `npm run build`)
- [ ] Lint passa (`npm run lint` / `golangci-lint run`)
- [ ] Não há `fmt.Println` ou `console.log` de debug
- [ ] Não há secrets ou chaves hardcoded
- [ ] Mensagem de commit segue Conventional Commits

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
| GET | `/api/dashboard/chart` | Dados para gráficos (7/14/30 dias) |
| GET | `/api/members` | Listar membros da organização |
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
├── hooks/
│   ├── useSocket.ts               # WebSocket hook
│   ├── useQuickReplies.ts         # Respostas rápidas
│   └── useNotes.ts                # Notas internas
├── services/api.ts            # Fetch client com JWT
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

- [x] WebSocket para mensagens em tempo real
- [x] Busca de contatos
- [x] Respostas rápidas na UI
- [x] Notas internas por conversa
- [x] Atribuição de guias
- [x] Tags e filtros avançados
- [x] Dashboard com gráficos
- [x] Upload de imagens/vídeos
- [x] Envio de áudio
- [x] Citação de mensagens
- [x] Edição de mensagens
- [ ] End-to-end encryption support
