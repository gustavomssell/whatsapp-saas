# Changelog

 Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

 O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
 e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-09-12

### Adicionado

#### Core
- Autenticação JWT (registro, login, refresh token, perfil)
- Multi-tenant com isolamento por `org_id`
- WhatsApp Inbox com conversas em tempo real (WebSocket)
- Envio de mensagens de texto e mídia (imagem, vídeo, áudio, documento)
- Formatação de mensagens estilo WhatsApp (bold, italic, strikethrough, code)
- Citação de mensagens com navegação automática
- Edição e exclusão de mensagens

#### Gestão
- Gestão completa de contatos (CRUD, busca, paginação)
- Sincronização de contatos com Evolution API
- Importação e exportação de contatos (CSV)
- Grupos WhatsApp (listagem, edição, exclusão, links de convite)
- Respostas rápidas com variáveis
- Notas internas por conversa
- Tags com cores para categorização
- Atribuição de guias a conversas
- Ações em massa (arquivar, fixar, atribuir, tags)

#### Automação
- Mensagem de boas-vindas automática
- Regras de auto-resposta por palavra-chave
- Arquivamento automático de conversas inativas

#### Dashboard & Relatórios
- Métricas em tempo real (conversas, mensagens, grupos)
- Gráficos de evolução (7, 14, 30 dias)
- Tempo médio de resposta
- Top contatos mais engajados
- Performance por guia
- Exportação de relatórios

#### Enterprise
- Sistema de planos (Free, Starter, Professional, Enterprise)
- Feature gating por plano
- Rate limiting por tier
- API keys para acesso externo
- Tracking de uso (feature_usage)
- Logs de auditoria

#### UX
- Tema dark/light com detecção de sistema
- Internacionalização (PT-BR, EN, ES)
- Notificações do navegador
- Sidebar colapsável
- Gravação de áudio com timer, pausa e cancelamento
- Upload de imagens com preview
- Scroll automático para mensagem citada

#### Infraestrutura
- Docker Compose (PostgreSQL + Go + Nginx)
- Migrations SQL versionadas (001-005)
- CI/CD com GitHub Actions
- ESLint + Prettier (frontend)
- golangci-lint (backend)
- .env.example para configuração
- README completo com documentação

### Changed

- Migrado de fetch para axios no frontend
- Migrado para react-query para server state
- Migrado para react-hook-form + zod para forms
- Sidebar colapsável com estado salvo
- Popover de idiomas abre para cima quando necessário

### Fixed

- TypeScript errors no GroupsPage e SettingsPage
- Avatar component importing wrong
- Scroll no InboxPage
- ThemeSwitch i18n
- Sidebar overflow no footer
