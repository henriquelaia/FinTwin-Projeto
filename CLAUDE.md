# GoldLock — Contexto para Assistentes IA

Projeto académico de engenharia informática (UBI 2025/2026).  
Aluno: Henrique Miguel Silva Laia (Nº 51667)

## O que é o GoldLock

Plataforma fintech full-stack para gestão de finanças pessoais orientada ao mercado **português**.  
Funcionalidades: Open Banking (Salt Edge/PSD2), categorização ML de transações, simulador IRS 2024, cotações reais de bolsa/crypto (Massive + CoinGecko), importação de corretoras (Sprint 9) e assistente fiscal IA (Sprint 10).

---

## Stack

| Camada | Tecnologia | Porta |
|--------|-----------|-------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + Framer Motion + Zustand + React Query + Recharts | 3000 |
| Backend | Node.js 20 + Express 4 + TypeScript | 4000 |
| ML Service | Python 3.12 + Flask + scikit-learn | 5000 |
| Base de Dados | PostgreSQL 16 | 5432 |
| Cache | Redis 7 | 6379 |
| Infra | Docker Compose (5 containers) | - |

---

## Estrutura de Ficheiros Críticos

```
src/
├── frontend/src/
│   ├── App.tsx                          # Routing (React Router v6)
│   ├── components/
│   │   ├── auth/PrivateRoute.tsx        # Protecção de rotas (demo-token REMOVIDO)
│   │   ├── layout/Sidebar.tsx           # Nav sidebar
│   │   └── ui/                          # GlassCard, GlassButton, EmptyState, etc.
│   ├── pages/                           # 13 páginas
│   ├── services/api.ts                  # Axios + interceptors + TODOS os apiClients
│   ├── store/authStore.ts               # Zustand (JWT em localStorage)
│   ├── hooks/
│   │   ├── useMarketData.ts             # useMarketQuote, useMarketHistory, useMarketSearch
│   │   ├── useInvestments.ts            # CRUD investimentos
│   │   ├── useTransactions.ts           # Transações + summary + categorias
│   │   ├── useBudgets.ts / useGoals.ts  # Orçamentos e metas
│   │   └── useAccounts.ts               # Contas Salt Edge
│   ├── data/mock.ts                     # Dados mock — NÃO usar em código novo
│   └── styles/globals.css               # Design system (paleta Ink + Gold)
├── backend/src/
│   ├── server.ts                        # Express app + mount de TODAS as rotas
│   ├── routes/
│   │   ├── auth.ts          ✅          # Registo, login, 2FA, reset, profile
│   │   ├── accounts.ts      ✅          # Salt Edge connect/sync/webhook
│   │   ├── transactions.ts  ✅          # Listar, filtrar, categorizar, sync
│   │   ├── budgets.ts       ✅          # CRUD + progresso
│   │   ├── goals.ts         ✅          # CRUD + depósito
│   │   ├── investments.ts   ✅          # CRUD completo (todos os 12 campos no PUT)
│   │   ├── market.ts        ✅          # /quote/:ticker, /search, /history/:ticker
│   │   ├── irs.ts           ✅          # Simulate, brackets, deductions, alerts
│   │   ├── categories.ts    ✅          # Listar + criar
│   │   └── fiscalProfile.ts ✅          # Get + upsert
│   ├── middleware/
│   │   ├── authenticate.ts              # JWT verify + Redis session check
│   │   ├── errorHandler.ts              # AppError class + global handler
│   │   └── rateLimiter.ts               # 100 req/15min global, 10 auth
│   ├── services/
│   │   ├── authService.ts               # Toda a lógica de auth
│   │   ├── emailService.ts              # Resend SDK (NÃO nodemailer)
│   │   └── marketDataService.ts         # Massive (ações/ETFs) + CoinGecko (crypto)
│   └── config/
│       ├── database.ts                  # pg Pool (max 20 conns)
│       └── redis.ts                     # Redis client (obrigatório — fail-fast)
├── backend/database/
│   ├── init.sql                         # Schema PostgreSQL completo (10 tabelas)
│   └── migrations/                      # Ficheiros de migração incremental
└── ml-service/app/
    ├── main.py                          # Flask: /categorize, /retrain
    └── categorizer.py                   # TF-IDF + Random Forest
```

---

## Padrões de Código

### Backend — Como adicionar um endpoint
```typescript
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../middleware/errorHandler.js';
import { pool } from '../config/database.js';
import { z } from 'zod';

router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      'SELECT * FROM tabela WHERE user_id = $1',
      [userId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err); // SEMPRE usar next(err) — nunca .status(500).json() directo
  }
});
```

### Frontend — Como adicionar chamada API com React Query
```typescript
// Os API clients já existem em services/api.ts — NÃO criar duplicados
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '../services/api';

const { data, isLoading } = useQuery({
  queryKey: ['budgets'],
  queryFn: () => budgetsApi.list().then(r => r.data.data),
});

const qc = useQueryClient();
const { mutate } = useMutation({
  mutationFn: budgetsApi.create,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
});
```

### Market Data — Como usar cotações
```typescript
import { useMarketQuote, useMarketHistory } from '../hooks/useMarketData';

// Cotação atual (Massive para ações/ETFs, CoinGecko para crypto)
const { data: quote } = useMarketQuote(ticker, assetType); // staleTime: 15 min
// quote.price, quote.change24h, quote.source

// Histórico de preços
const { data } = useMarketHistory(ticker, assetType, '30d'); // ou '1y'
// data.points: [{ date, close }]
```

### API Clients disponíveis em `services/api.ts`
```typescript
authApi, accountsApi, transactionsApi, budgetsApi, goalsApi,
categoriesApi, irsApi, fiscalProfileApi, investmentsApi, marketApi
```

---

## Design System

- **Cores**: `var(--gold)` = #C9A227, `var(--ink-900)` = #111110
- **Background**: `bg-[#F4F4F2]` (páginas), `bg-white` (cards)
- **Cards**: `rounded-2xl`, `shadow: 0 1px 3px rgba(0,0,0,0.04)`
- **Botão primário**: GlassButton variant="primary" (gold background)
- **Animações**: Framer Motion com `initial={{ opacity:0, y:8 }}` + stagger delays
- **Componentes UI**: GlassCard, GlassButton, LoadingSpinner, EmptyState, PageHeader, ConfirmDialog

---

## Autenticação

- JWT HS256, 15 min TTL (access token)
- Refresh token UUID em Redis, 7 dias TTL
- `req.user = { id: string, email: string }` após `authenticate` middleware
- **Demo-token completamente removido** — não existe mais nenhum bypass
- Tokens em localStorage (aceitável para demo académico)
- Email de verificação enviado via **Resend SDK** (não nodemailer)

---

## Base de Dados (PostgreSQL)

Tabelas: `users`, `bank_accounts`, `categories`, `transactions`, `budgets`, `savings_goals`, `irs_simulations`, `fiscal_profile`, `deduction_alerts`, `investments`

Índices de performance relevantes:
```sql
idx_transactions_user_date ON transactions(user_id, transaction_date DESC)
idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL
```

Padrão de queries:
```sql
-- SEMPRE filtrar por user_id para isolamento de dados
SELECT * FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC;
```

---

## Estado do Projecto (Abril 2026 — Sprint 4b + Sprint 8 concluídos)

### ✅ Completo
- Auth completa: registo, login, 2FA TOTP, reset password, email verification (Resend)
- Demo mode completamente removido (demo-token, dev verify endpoint, mock fallbacks)
- ESLint 9 flat config em frontend e backend
- CI: typecheck + lint + build em cada push (`.github/workflows/ci.yml`)
- Salt Edge API v6: connect, sync contas e transações, webhooks
- Todos os routers montados (0 endpoints a retornar 501)
- InvestmentsPage com cotações reais e P&L ao vivo + gráfico histórico
- Market data: `GET /api/market/quote/:ticker`, `/search`, `/history/:ticker`
- Massive API (ações/ETFs) + CoinGecko (crypto) com cache Redis 15 min
- PUT `/api/investments/:id` actualiza todos os 12 campos
- Bug webhook Salt Edge corrigido (bank_name ≠ account_name)

### ⏳ Por implementar (por ordem de prioridade)
- **Sprint 5** 🔜: Dashboard + TransactionsPage com dados reais (substituir mocks)
- **Sprint 6**: BudgetsPage + GoalsPage totalmente funcionais com backend
- **Sprint 7**: IRS Simulator persistente (guardar simulações no backend)
- **Sprint 9**: PDF import de corretoras (Degiro, XTB, Trade Republic)
- **Sprint 10**: Assistente Fiscal IA (OpenAI)
- **Sprint 11**: Testes (Vitest + Jest, ≥70% cobertura)
- **Sprint 12**: Deploy + Relatório LaTeX final

---

## Variáveis de Ambiente Necessárias

O ficheiro `.env` deve estar na **raiz do repositório** (ao lado de `docker-compose.yml`).

```env
JWT_SECRET=<64 chars random>
DATABASE_URL=postgresql://goldlock:goldlock_dev@postgres:5432/goldlock_db
REDIS_URL=redis://redis:6379
VITE_API_URL=http://localhost:4000/api

# Email — Resend (https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=GoldLock <noreply@seudominio.com>

# Open Banking
SALT_EDGE_APP_ID=
SALT_EDGE_SECRET=
SALT_EDGE_WEBHOOK_SECRET=

# Market Data — Massive (https://massive.com) — ações/ETFs
# CoinGecko (crypto) não precisa de key
MASSIVE_API_KEY=

# IA (Sprint 10 — opcional)
OPENAI_API_KEY=
```

---

## Notas Importantes para IA

1. **Não usar mock.ts em código novo** — usar chamadas reais à API
2. **Não criar demo-token logic** — foi removido; não reintroduzir
3. **Sempre usar `authenticate` middleware** em endpoints protegidos
4. **Sempre usar `next(err)` para erros** — nunca `.status(500).json()` directo
5. **Filtrar sempre por `user_id`** — isolamento de dados por utilizador
6. **Validar inputs com Zod** antes de queries SQL
7. **Os apiClients já existem** em `services/api.ts` — não criar duplicados
8. **Padrão de resposta**: `{ status: 'success', data: ... }` ou `{ status: 'error', message: ... }`
9. **Email é Resend SDK** — não nodemailer; `emailService.ts` já está completo
10. **Market data**: usar `marketDataService.ts` e os hooks `useMarketData.ts` — não chamar Massive/CoinGecko directamente do frontend
