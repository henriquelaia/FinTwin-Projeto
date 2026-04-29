# Gold Lock — Roadmap de Sprints

Projeto académico UBI 2025/2026 — Henrique Miguel Silva Laia (Nº 51667)

---

## Sprints Concluídos

### Sprint 1 — Infraestrutura ✅
- Docker Compose com 5 serviços (postgres, redis, backend, frontend, ml-service)
- Schema PostgreSQL inicial (8 tabelas)
- ML Service: Flask + TF-IDF + Random Forest para categorização

### Sprint 2 — Autenticação ✅
- Registo + login com bcrypt (cost factor 12)
- JWT HS256 (15 min access token) + refresh tokens em Redis (7 dias)
- Rate limiting: 100 req/15 min global, 10 req/15 min em endpoints auth
- Middleware `authenticate` + `errorHandler` + `AppError`

### Sprint 3 — UI de Autenticação ✅
- VerifyEmail, ForgotPassword, ResetPassword
- 2FA TOTP (Google Authenticator compatível) — setup + enable + disable
- Settings: alterar password, avatar, nome
- 13 páginas de frontend com design system Ink + Gold
- Componentes UI reutilizáveis: GlassCard, GlassButton, LoadingSpinner, EmptyState

### Sprint 4 — Open Banking ✅
- Salt Edge API v6: criação de customer, connect URL, sincronização de contas e transações
- `POST /api/accounts/sync` e `POST /api/transactions/sync`
- Webhook handler para eventos Salt Edge (account_created, transaction_created, etc.)
- UNIQUE constraints para evitar duplicados no sync
- Tabela `investments` com router CRUD completo

### Sprint 4b — Qualidade ✅
- GitHub Actions CI: typecheck + lint + build em cada push para `main` e `feat/**`
- ESLint 9 (flat config) em frontend e backend
- Email migrado de nodemailer para **Resend SDK**
- Demo mode removido completamente (demo-token, dev verify endpoint, mock fallbacks)
- Correção de bugs: webhook bank_name/account_name, PUT investments incompleto
- Índices de performance adicionados: `idx_categories_parent`, `idx_transactions_user_date`

---

## Sprints Planeados

### Sprint 5 — Dashboard com Dados Reais 🔜 **(Próximo)**
**Objetivo:** Substituir todos os dados mock do Dashboard e página de Transações por dados reais do backend.

**Tarefas:**
- [ ] `DashboardPage.tsx` — ligar a `useTransactionSummary` e `useAccounts` (dados reais)
- [ ] `TransactionsPage.tsx` — paginação real, filtros funcionais (conta, categoria, tipo, período)
- [ ] Gráfico de receitas/despesas com `Recharts` + dados do endpoint `/transactions/summary`
- [ ] Estado de "sem contas ligadas" → CTA para ligar conta Salt Edge
- [ ] Loading skeletons em todos os cards do dashboard
- [ ] `AccountsPage.tsx` — já funcional, rever fluxo de connect/disconnect

**Critérios de aceitação:**
- Dashboard mostra dados reais de um utilizador com conta Salt Edge ligada
- Transações paginadas com filtro por mês funcional
- Sem referências a `mock.ts` em código de produção

---

### Sprint 6 — Budgets, Goals e Categories
**Objetivo:** Módulos de orçamentos e metas totalmente funcionais com backend.

**Tarefas:**
- [ ] `BudgetsPage.tsx` — criar/editar/apagar orçamentos, progresso real por categoria
- [ ] `GoalsPage.tsx` — criar meta, registar depósito, progresso visual
- [ ] `CategoriesPage.tsx` — listar categorias, criar subcategoria
- [ ] Endpoint `GET /api/budgets/:id/progress` — calcular consumo real das transações
- [ ] Notificação quando orçamento ultrapassa 80% / 100%

---

### Sprint 7 — IRS Simulator Persistente
**Objetivo:** Guardar simulações IRS no backend, histórico de simulações por utilizador.

**Tarefas:**
- [ ] `POST /api/irs/simulate` — guardar resultado em `irs_simulations`
- [ ] `GET /api/irs/simulations` — histórico de simulações do utilizador
- [ ] `IRSSimulatorPage.tsx` — ligar ao backend, mostrar histórico
- [ ] Pré-preencher dados do perfil fiscal (`fiscal_profile`) na simulação
- [ ] Deduction alerts: ligar alertas automáticos às transações reais

---

### Sprint 8 — Investimentos: Portfólio Manual + Cotações Reais
**Objetivo:** Módulo completo de investimentos com P&L real e cotações de mercado.

**Novos endpoints:**
- `GET /api/market/quote/:ticker` — cotação atual (Polygon.io / CoinGecko)
- `GET /api/market/search?q=` — pesquisa de tickers
- `GET /api/market/history/:ticker?period=30d|1y` — histórico de preços

**Novo serviço:** `src/backend/src/services/marketDataService.ts`
- Polygon.io para ações/ETFs (plano free, 15 min delay)
- CoinGecko para crypto (free, sem API key)
- Cache Redis com TTL 15 min para evitar rate limiting

**Tabela nova:** `investment_prices(ticker, price, currency, source, fetched_at)`

**Frontend:**
- `InvestmentsPage.tsx` — P&L real, cotações ao vivo, gráfico histórico
- `useMarketData.ts` — React Query com staleTime 15 min

Ver design spec completo em `docs/specs/2026-04-29-investments-module-design.md`.

---

### Sprint 9 — PDF Import de Corretoras
**Objetivo:** Importar extratos PDF de Degiro, XTB e Trade Republic automaticamente.

**Tarefas:**
- [ ] `POST /api/investments/import-pdf` — multer + pdfjs-dist
- [ ] Parsers por corretora: regexes para extrair transações de cada formato
- [ ] Frontend: drag-and-drop de PDF, preview dos dados extraídos antes de confirmar
- [ ] Validação: verificar duplicados por ISIN + data antes de inserir

---

### Sprint 10 — Assistente Fiscal IA
**Objetivo:** Chatbot fiscal que responde a perguntas sobre IRS, deduções e otimização fiscal.

**Tarefas:**
- [ ] `POST /api/ai/fiscal-chat` — OpenAI GPT-4 com contexto do perfil fiscal do utilizador
- [ ] Contexto: perfil fiscal, simulações anteriores, deduction alerts pendentes
- [ ] `AIAssistantPage.tsx` — interface de chat com histórico
- [ ] Rate limiting específico para chamadas AI (custo por token)

---

### Sprint 11 — Testes
**Objetivo:** ≥70% de cobertura de código com testes unitários e E2E.

**Tarefas:**
- [ ] Backend: Jest + Supertest para todos os endpoints (happy path + erros)
- [ ] Frontend: Vitest + React Testing Library para hooks e componentes críticos
- [ ] E2E: Playwright — fluxo de registo → login → dashboard → transações
- [ ] CI: adicionar step de testes ao GitHub Actions

---

### Sprint 12 — Deploy + Relatório Final
**Objetivo:** Plataforma acessível publicamente, documentação académica completa.

**Tarefas:**
- [ ] Backend: deploy para **Railway** (auto-deploy em push para `main`)
- [ ] Frontend: deploy para **Vercel**
- [ ] PostgreSQL: Railway managed DB ou Supabase
- [ ] Domínio personalizado (opcional)
- [ ] Relatório LaTeX (template UBI): ~40 páginas
- [ ] Poster A0 para apresentação
- [ ] Apresentação final (PowerPoint/Keynote)

---

## Notas de Arquitetura

- **Sem backwards-compat hacks**: código legado de demo mode foi removido limpo (Sprint 4b)
- **Email**: Resend SDK (transaccional) — template HTML em `emailService.ts`
- **Open Banking**: Salt Edge v6 — apenas leitura de contas (PSD2 AIS)
- **Segurança**: OWASP Top 10 verificado, JWT + Redis sessions, bcrypt cost 12, rate limiting
- **TypeScript strict**: `noImplicitAny`, `strictNullChecks` ativos em frontend e backend
