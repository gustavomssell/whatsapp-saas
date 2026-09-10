# WhatsApp SaaS — Documento de Funcionalidades

> Referência: TrekSaas (`C:\pessoal\projetos\web\trekSaas`) como base para boas práticas.
> Status: `DONE` = implementado | `WIP` = em andamento | `TODO` = a implementar

---

## Sumário

1. [Conexão WhatsApp](#1-conexão-whatsapp)
2. [Inbox — Conversas](#2-inbox--conversas)
3. [Mensagens](#3-mensagens)
4. [Mídia](#4-mídia)
5. [Áudio](#5-áudio)
6. [Reações](#6-reações)
7. [Citação de Mensagens](#7-citação-de-mensagens)
8. [Edição de Mensagens](#8-edição-de-mensagens)
9. [Exclusão de Mensagens](#9-exclusão-de-mensagens)
10. [Notas Internas](#10-notas-internas)
11. [Respostas Rápidas](#11-respostas-rápidas)
12. [Tags e Filtros](#12-tags-e-filtros)
13. [Atribuição de Guia](#13-atribuição-de-guia)
14. [Arquivar/Desarquivar](#14-arquivardesarquivar)
15. [Fixar/Desfixar Conversa](#15-fixardesfixar-conversa)
16. [Ações em Massa](#16-ações-em-massa)
17. [Busca de Contatos](#17-busca-de-contatos)
18. [Grupos WhatsApp](#18-grupos-whatsapp)
19. [WebSocket / Tempo Real](#19-websocket--tempo-real)
20. [Dashboard e Métricas](#20-dashboard-e-métricas)
21. [Configurações](#21-configurações)
22. [Upload de Arquivos](#22-upload-de-arquivos)
23. [Autenticação e Multi-tenancy](#23-autenticação-e-multi-tenancy)
24. [End-to-End Encryption](#24-end-to-end-encryption)
25. [Feature Gating (Planos)](#25-feature-gating-planos)
26. [Offline Support](#26-offline-support)
27. [i18n](#27-i18n)
28. [Tipos de Mensagem Especiais](#28-tipos-de-mensagem-especiais)
29. [Indicadores de Status](#29-indicadores-de-status)
30. [UI/UX Detalhado](#30-uiux-detalhado)

---

## 1. Conexão WhatsApp

**Status:** `DONE`

### Funcionalidades
- Criar instância via Evolution API (`POST /instance/create`)
- Exibir QR Code para pareamento
- Solicitar pairing code (alternativa ao QR)
- Verificar status da conexão (polling)
- Desconectar instância
- Webhook para eventos em tempo real

### Endpoints
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/whatsapp/connect` | Criar instância + QR code |
| GET | `/api/whatsapp/status` | Status da conexão (open/close/error) |
| POST | `/api/whatsapp/disconnect` | Desconectar instância |
| POST | `/api/webhook/whatsapp` | Receber eventos da Evolution |

### Webhook Events
- `messages.upsert` — Nova mensagem recebida/enviada
- `message-receipt.update` — Status de entrega (sent/delivered/read)
- `connection.update` — Mudança de estado da conexão
- `groups.update` — Atualização de grupos

### Melhorias Pendentes
- [ ] Polling de status com WebSocket (evitar polling HTTP a cada 5s)
- [ ] Reconexão automática com exponential backoff
- [ ] Exibir progresso do QR code (tempo restante)
- [ ] Suportar múltiplas instâncias por organização

---

## 2. Inbox — Conversas

**Status:** `DONE`

### Funcionalidades
- Lista de conversas com paginação
- Preview da última mensagem
- Contador de não lidas
- Indicador de conversa fixada
- Tags visíveis na lista
- Busca por nome/telefone
- Filtros: tag, guia, não lidos, período
- Ordenação: fixadas primeiro, depois por data da última mensagem

### Filtros Disponíveis
| Filtro | Query Param | Exemplo |
|---|---|---|
| Tag | `tag=vendas` | `?tag=vendas` |
| Guia | `guide=joao` | `?guide=joao` |
| Não lidos | `unread=true` | `?unread=true` |
| Busca | `search=joao` | `?search=joao` |
| Período | `period=today` | `?period=today` |
| Página | `page=1` | `?page=1` |
| Itens/página | `per_page=50` | `?per_page=50` |

### Melhorias Pendentes
- [ ] Infinite scroll (em vez de paginação clássica)
- [ ] Filtro por período: hoje, esta semana, este mês, personalizado
- [ ] Filtro por status de mensagem (não entregue, não lida)
- [ ] Filtro por tipo (individual, grupo)
- [ ] Ordenação customizável
- [ ] Indicador de "digitando..." em tempo real
- [ ] Indicador de "online/online há pouco"

---

## 3. Mensagens

**Status:** `DONE`

### Funcionalidades
- Enviar mensagem de texto
- Receber mensagens via webhook
- Salvar mensagens no banco (com dedup por `remote_msg_id`)
- Histórico de mensagens (últimas 200, ordenadas cronologicamente)
- Mensagens agrupadas por data

### Melhorias Pendentes
- [ ] Carregar mais mensagens (scroll infinito para cima)
- [ ] Busca dentro da conversa
- [ ] Mensagens com formatação (bold, italic, listas)
- [ ] Suporte a mensagens de sistema (grupo criado, participante adicionado)
- [ ] Visualizar mensagem no WhatsApp (link para wa.me)
- [ ] Mensagens temporary com optimistic update + retry

---

## 4. Mídia

**Status:** `DONE`

### Funcionalidades
- Upload de imagem/vídeo/áudio/documento
- Envio de mídia com caption
- Preview de imagem antes de enviar
- Download de mídia recebida
- Tipos suportados: image/*, video/*, audio/*, .pdf, .doc, .docx

### Melhorias Pendentes
- [ ] Preview de vídeo com player embutido
- [ ] Galeria de mídias da conversa (viewer lateral)
- [ ] Compressão de imagem antes do upload
- [ ] Limites de tamanho por plano
- [ ] Suporte a stickers
- [ ] Suporte a localização
- [ ] Enviar contato vCard
- [ ] Enviar enquete (poll)
- [ ] Enviar link com preview (og:tags)

---

## 5. Áudio

**Status:** `DONE`

### Funcionalidades
- Gravação via MediaRecorder API (WebM/Opus)
- Upload automático após gravação
- Envio como áudio
- Player de áudio embutido nas mensagens

### Melhorias Pendentes
- [ ] Botão de gravação com visual de microfone (UX Evolution)
- [ ] Timer de gravação em tempo real
- [ ] Cancelar gravação
- [ ] Pausar/retomar gravação
- [ ] Waveform visual do áudio
- [ ] Transcrição automática de áudio (futuro)

---

## 6. Reações

**Status:** `DONE`

### Funcionalidades
- Picker de emojis nas mensagens
- Reagir com emoji único por mensagem
- Exibir reações abaixo da mensagem

### Melhorias Pendentes
- [ ] Permitir múltiplas reações por mensagem (diferentes usuários)
- [ ] Remover própria reação
- [ ] Contar reações
- [ ] Reações rápidas (tap-and-hold)
- [ ] Animação de reação (confetti-like)
- [ ] Reações customizadas

---

## 7. Citação de Mensagens

**Status:** `DONE`

### Funcionalidades
- Citar mensagem específica ao responder
- Preview da mensagem citada no input
- Mensagem citada renderizada na conversa (com borda lateral)
- Suporte a citação de mensagens de texto e mídia

### Melhorias Pendentes
- [ ] Scroll automático para mensagem citada ao clicar
- [ ] Citar múltiplas mensagens
- [ ] Encaminhar mensagem (forward)

---

## 8. Edição de Mensagens

**Status:** `DONE`

### Funcionalidades
- Editar mensagens enviadas por mim
- Indicador "(editada)" na mensagem editada
- Atualização em tempo real

### Melhorias Pendentes
- [ ] Histórico de edições
- [ ] Notificação ao destinatário que a mensagem foi editada
- [ ] Limite de tempo para edição (ex: 15 minutos)

---

## 9. Exclusão de Mensagens

**Status:** `TODO`

### Funcionalidades Planejadas
- Excluir mensagem enviada (para mim)
- Excluir mensagem enviada (para todos)
- Confirmação antes de excluir
- Marcar como "Mensagem excluída"

### Melhorias Pendentes
- [ ] Dialog de confirmação com opção "para mim" / "para todos"
- [ ] Soft delete no banco
- [ ] Sincronizar exclusão com Evolution API
- [ ] Placeholder "Mensagem excluída" na UI

---

## 10. Notas Internas

**Status:** `DONE`

### Funcionalidades
- Painel lateral na conversa
- Criar nota com nome do usuário
- Lista de notas cronológica
- Notas visíveis apenas para a equipe

### Melhorias Pendentes
- [ ] Editar nota
- [ ] Excluir nota
- [ ] Notas com formatação (bold, italic)
- [ ] Notas com timestamp e autor
- [ ] Buscar notas

---

## 11. Respostas Rápidas

**Status:** `DONE`

### Funcionalidades
- CRUD completo (criar, listar, deletar)
- Shortcut (atalho)
- Título e conteúdo
- Variáveis: `{nome}`, `{data}`, `{hora}`
- Lista visível no input da conversa

### Melhorias Pendentes
- [ ] Editar resposta rápida
- [ ] Variáveis dinâmicas: `{trilha}`, `{ponto}`, `{equipe}`
- [ ] Variáveis com valores do contexto da conversa
- [ ] Respostas rápidas com mídia
- [ ] Respostas rápidas por grupo/categoria
- [ ] Busca de respostas rápidas no input (digitar "/" para filtrar)
- [ ] Preview da resposta antes de enviar

---

## 12. Tags e Filtros

**Status:** `DONE`

### Funcionalidades
- Adicionar/remover tags por conversa
- Filtro por tag na lista de conversas
- Tags visíveis na lista de conversas
- Modal de gerenciamento de tags

### Melhorias Pendentes
- [ ] Tags com cores customizáveis
- [ ] Tags predefinidas (template)
- [ ] Filtro por múltiplas tags (AND/OR)
- [ ] Contagem de conversas por tag
- [ ] Tags automáticas (por keyword, horário, etc.)
- [ ] Sugestão de tags

---

## 13. Atribuição de Guia

**Status:** `DONE`

### Funcionalidades
- Modal de atribuição com lista de membros
- Atribuir/desatribuir guia
- Filtro por guia na lista de conversas
- Guia visível na lista e no header do chat

### Melhorias Pendentes
- [ ] Atribuição automática (round-robin, por disponibilidade)
- [ ] Notificação ao guia atribuído
- [ ] Métricas por guia (conversas, tempo de resposta)
- [ ] Reatribuição

---

## 14. Arquivar/Desarquivar

**Status:** `DONE`

### Funcionalidades
- Arquivar conversa (remove da lista principal)
- Desarquivar conversa
- Botão no header do chat

### Melhorias Pendentes
- [ ] Visualizar conversas arquivadas (aba separada)
- [ ] Arquivamento automático (após X dias sem atividade)
- [ ] Desarquivamento ao receber nova mensagem
- [ ] Ações em massa para arquivar/desarquivar

---

## 15. Fixar/Desfixar Conversa

**Status:** `DONE`

### Funcionalidades
- Fixar conversa no topo da lista
- Desfixar conversa
- Ícone de pin na lista de conversas

### Melhorias Pendentes
- [ ] Limite de conversas fixadas por plano
- [ ] Animação de fixar/desfixar

---

## 16. Ações em Massa

**Status:** `DONE` (backend)

### Funcionalidades
- Selecionar múltiplas conversas
- Ações: arquivar, tag, atribuir guia

### Melhorias Pendentes
- [ ] UI de seleção múltipla (checkboxes)
- [ ] Barra de ações fixa no topo quando em seleção
- [ ] Enviar mensagem em massa
- [ ] Marcar como lida em massa
- [ ] Excluir em massa
- [ ] Exportar conversas selecionadas

---

## 17. Busca de Contatos

**Status:** `DONE`

### Funcionalidades
- Busca por nome/telefone via API local (conversas existentes)
- Busca via Evolution API (contatos remotos)
- Resultados exibidos como conversas

### Melhorias Pendentes
- [ ] Página dedicada de contatos
- [ ] Lista de contatos da Evolution com detalhes
- [ ] Criar conversa a partir de contato
- [ ] Importar contatos
- [ ] Busca por empresa/cargo
- [ ] Contatos favoritos

---

## 18. Grupos WhatsApp

**Status:** `DONE` (backend + lista básica)

### Funcionalidades
- Listar grupos da instância
- Buscar grupos
- Visualizar mensagens do grupo

### Melhorias Pendentes (ref: TrekSaas GroupManager)
- [ ] **Criar grupo** com nome, descrição, participantes
- [ ] **Gerenciar participantes**: adicionar/remover
- [ ] **Promover/demover admin**
- [ ] **Enviar mídia** para grupo com caption
- [ ] **Mensagens de modelo** (pré-trilha, pós-trilha, checklist)
- [ ] **Link de convite** (copiar, compartilhar)
- [ ] **Alterar foto do grupo**
- [ ] **Renomear grupo**
- [ ] **Arquivar/deletar grupo**
- [ ] **Exportar membros** (CSV)
- [ ] **Mensagem direta** para membro do grupo
- [ ] **Detalhes do grupo**: descrição, participantes, configurações
- [ ] **Mensagens recentes** no preview
- [ ] **Contador de participantes**
- [ ] **Permissões do grupo** (quem pode editar, enviar)

---

## 19. WebSocket / Tempo Real

**Status:** `DONE` (estrutura básica)

### Eventos Implementados
| Evento | Descrição |
|---|---|
| `new_message` | Nova mensagem recebida |
| `message_sent` | Mensagem enviada com sucesso |
| `message_status` | Status de entrega atualizado |
| `connection_update` | Estado da conexão mudou |

### Melhorias Pendentes
- [ ] Evento `typing` (digitando)
- [ ] Evento `presence` (online/offline)
- [ ] Evento `message_deleted`
- [ ] Evento `message_edited`
- [ ] Evento `conversation_updated` (tags, guia, etc.)
- [ ] Evento `reaction_added` / `reaction_removed`
- [ ] Ping/pong para manter conexão
- [ ] Reconexão automática com exponential backoff
- [ ] Fila de mensagens offline
- [ ] Suporte a múltiplas abas (BroadcastChannel)

---

## 20. Dashboard e Métricas

**Status:** `DONE` (básico)

### Métricas Implementadas
- Total de conversas
- Conversas não lidas
- Mensagens enviadas hoje
- Mensagens recebidas hoje
- Grupos ativos
- Gráfico de barras (7 dias: enviadas vs recebidas)

### Melhorias Pendentes
- [ ] Gráfico de pizza (mensagens por tipo)
- [ ] Gráfico de linha (tendência ao longo do tempo)
- [ ] Filtro de período no gráfico (7/14/30/90 dias)
- [ ] Top contatos (mais mensagens)
- [ ] Tempo médio de resposta
- [ ] Taxa de leitura
- [ ] Horário de pico
- [ ] Exportar relatório (CSV/PDF)
- [ ] Comparativo entre períodos

---

## 21. Configurações

**Status:** `DONE` (básico)

### Funcionalidades
- Perfil do usuário (nome, email)
- Conexão WhatsApp (instância, QR code, status)
- Lista de membros da organização

### Melhorias Pendentes
- [ ] Editar perfil (nome, avatar, telefone)
- [ ] Alterar senha
- [ ] Gerenciar membros (convidar, remover, mudar role)
- [ ] Configurações da organização (nome, logo, slug)
- [ ] Webhook customizado
- [ ] Configurações de notificação
- [ ] Brading/white-label (cores, logo)
- [ ] Configurações de auto-resposta
- [ ] Horário de funcionamento (auto-resposta fora do horário)
- [ ] Mensagem de boas-vindas automática

---

## 22. Upload de Arquivos

**Status:** `DONE`

### Funcionalidades
- Upload multipart/form-data
- Validação de tamanho (32MB)
- UUID no nome do arquivo
- Servir via `/uploads/`
- Detecção de MIME type

### Melhorias Pendentes
- [ ] Thumbnails automáticos
- [ ] Delete de arquivos não utilizados
- [ ] CDN para produção
- [ ] Limites de tamanho por tipo
- [ ] Compressão automática de imagens
- [ ] Suporte a múltiplos arquivos

---

## 23. Autenticação e Multi-tenancy

**Status:** `DONE`

### Funcionalidades
- JWT com 24h expiry
- Claims: `user_id`, `org_id`, `role`
- Registro cria user + org + owner
- Login com bcrypt
- Refresh token
- Middleware de autenticação
- Multi-tenancy por `org_id` em todas as tabelas

### Melhorias Pendentes
- [ ] Refresh token com expiry separado (7d)
- [ ] Invalidação de token no logout
- [ ] Rate limiting por IP
- [ ] brute-force protection
- [ ] 2FA (futuro)
- [ ] SSO (futuro)
- [ ] Login social (Google, GitHub)

---

## 24. End-to-End Encryption

**Status:** `TODO`

### Funcionalidades Planejadas
- Gerenciamento de chaves por conversa
- Rotação de chaves
- Encriptação de mensagens no client
- Decriptação no client

### Melhorias Pendentes
- [ ] Gerar par de chaves (RSA/ECC) por conversa
- [ ] Armazenar chave pública no servidor
- [ ] Chave privada nunca sai do client
- [ ] Rotacionar chaves periodicamente
- [ ] UI de verificação de segurança
- [ ] Badge de "mensagens encriptadas"

---

## 25. Feature Gating (Planos)

**Status:** `TODO`

### Planos Planejados (ref: TrekSaas)
| Plano | Preço | WhatsApp Features |
|---|---|---|
| Starter | R$98/mês | Sem inbox |
| Pro | R$180/mês | Inbox completo |
| Enterprise | R$499/mês | Inbox + Grupos + API |

### Limites por Plano
| Feature | Starter | Pro | Enterprise |
|---|---|---|---|
| WhatsApp Inbox | ❌ | ✅ | ✅ |
| Grupos | ❌ | ❌ | ✅ |
| Respostas rápidas | ❌ | ✅ (10) | ✅ (ilimitado) |
| Notas internas | ❌ | ✅ | ✅ |
| Tags | ❌ | ✅ | ✅ |
| Atribuição de guia | ❌ | ✅ | ✅ |
| Ações em massa | ❌ | ❌ | ✅ |
| API webhooks | ❌ | ❌ | ✅ |
| Membros | 1 | 10 | ilimitado |

### Melhorias Pendentes
- [ ] Verificação de plano no frontend (rotas protegidas)
- [ ] Verificação de plano no backend (middleware)
- [ ] Upgrade/downgrade de plano
- [ ] Webhook de pagamento (Asaas)
- [ ] Billing portal
- [ ] Trial de 14 dias

---

## 26. Offline Support

**Status:** `TODO`

### Funcionalidades Planejadas (ref: TrekSaas)
- Service Worker com app shell
- Cache de APIs públicas
- Fila de mutações offline (localStorage)
- Retry automático ao reconectar
- Indicador de conectividade
- Buffer de GPS offline

### Melhorias Pendentes
- [ ] Service Worker registration
- [ ] Cache strategy (network-first para inbox, cache-first para assets)
- [ ] Fila de envio offline
- [ ] Sync automático
- [ ] Indicador visual de offline
- [ ] Mensagens pendentes de envio (badge)

---

## 27. i18n

**Status:** `TODO`

### Idiomas Planejados
- pt-BR (padrão)
- en (inglês)

### Melhorias Pendentes
- [ ] i18next setup
- [ ] Detector de idioma (localStorage + navigator)
- [ ] Componente de switch de idioma
- [ ] Traduzir todas as strings da UI
- [ ] Formatação de datas/números por locale
- [ ] RTL support (futuro)

---

## 28. Tipos de Mensagem Especiais

**Status:** `TODO`

### Tipos Planejados
| Tipo | Descrição | Status |
|---|---|---|
| Texto | Mensagem simples | ✅ |
| Imagem | Foto com caption | ✅ |
| Vídeo | Vídeo com caption | ✅ |
| Áudio | Mensagem de voz | ✅ |
| Documento | PDF, DOC, etc | ✅ |
| Localização | Envio de ubicación | TODO |
| Contato | vCard | TODO |
| Enquete | Poll com opções | TODO |
| Sticker | Figurinha | TODO |
| Reação | Emoji sobre mensagem | ✅ |
| Sistema | Evento de grupo | TODO |
| Fixada | Mensagem fixada no grupo | TODO |

---

## 29. Indicadores de Status

**Status:** `DONE` (básico)

### Status de Mensagem
| Ícone | Status | Descrição |
|---|---|---|
| ✓ | sent | Enviada com sucesso |
| ✓✓ | delivered | Entregue ao destinatário |
| ✓✓ (azul) | read | Lida pelo destinatário |
| ⏳ | pending | Enviando... |
| ❌ | error | Erro no envio |

### Melhorias Pendentes
- [ ] Indicador de "digitando..." em tempo real
- [ ] Indicador de "online" do contato
- [ ] Indicador de "gravando áudio"
- [ ] Indicador de "mensagem processando"

---

## 30. UI/UX Detalhado

### Layout do Inbox
```
┌─────────────────────────────────────────────────────────┐
│ Sidebar │ Lista de Conversas │ Chat Area                │
│         │                    │                          │
│ [Logo]  │ [Busca]           │ [Header: nome, status]   │
│         │                    │                          │
│ Inicio  │ [Conversa 1] ✓✓   │ [Mensagens]              │
│ Inbox   │ [Conversa 2] 3    │                          │
│ Grupos  │ [Conversa 3] 🔒   │ [Input: msg, áudio, env] │
│ Config  │                    │                          │
│         │                    │ [Notas] (toggle)         │
│ [Tema]  │                    │                          │
│ [User]  │                    │                          │
└─────────────────────────────────────────────────────────┘
```

### Responsividade
- Desktop: sidebar + lista + chat (3 colunas)
- Tablet: lista + chat (2 colunas, sidebar collapsável)
- Mobile: lista OU chat (1 coluna, toggle)

### Atalhos de Teclado
| Tecla | Ação |
|---|---|
| Enter | Enviar mensagem |
| Shift+Enter | Nova linha |
| Escape | Fechar modais |
| ArrowUp | Editar última mensagem |
| / | Focar busca |

### Melhorias Pendentes
- [ ] Skeleton loading nas conversas
- [ ] Skeleton loading nas mensagens
- [ ] Empty states ilustrados
- [ ] Animações de transição
- [ ] Toast notifications
- [ ] Drag and drop para upload
- [ ] Copy/paste de imagens
- [ ] Lazy loading de imagens
- [ ] Virtual scrolling para listas grandes
- [ ] Comand palette (Cmd+K)

---

## Prioridades de Implementação

### Fase 1 — Core (Já implementado)
- [x] Conexão WhatsApp
- [x] Inbox com conversas
- [x] Envio/recebimento de mensagens
- [x] Mídia (upload + envio)
- [x] Áudio (gravação + envio)
- [x] Reações
- [x] Citação
- [x] Edição
- [x] Notas internas
- [x] Respostas rápidas
- [x] Tags
- [x] Atribuição de guia
- [x] Arquivar/fixar
- [x] Busca de contatos
- [x] WebSocket básico
- [x] Dashboard com métricas

### Fase 2 — Melhorias (Próximo passo)
- [ ] Exclusão de mensagens
- [ ] Infinite scroll no chat
- [ ] Typing indicator
- [ ] Tags com cores
- [ ] Respostas rápidas com mídia
- [ ] UI de ações em massa
- [ ] Grupos: criar, gerenciar participantes
- [ ] Mensagens de modelo para grupos
- [ ] Notificação ao guia atribuído
- [ ] Arquivamento automático

### Fase 3 — Avançado
- [ ] Feature gating por plano
- [ ] Assinatura/billing
- [ ] Offline support
- [ ] i18n
- [ ] E2E encryption
- [ ] Tipos especiais (localização, contato, enquete)
- [ ] Histórico de edições
- [ ] Forward de mensagens
- [ ] Busca dentro da conversa

### Fase 4 — Enterprise
- [ ] API webhooks customizados
- [ ] Multi-instância
- [ ] White-label
- [ ] Relatórios exportáveis
- [ ] Integrações (CRM, ERP)
- [ ] Automações (auto-resposta, chatbot)
- [ ] SLA de resposta
- [ ] Auditoria de ações
