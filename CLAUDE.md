# GoldLock — Contexto para Assistentes IA

Projeto académico de engenharia informática (UBI 2025/2026).  
Aluno: Henrique Miguel Silva Laia (Nº 51667)

## O que é o GoldLock

Plataforma fintech full-stack para gestão de finanças pessoais orientada ao mercado **português**.  
Funcionalidades: Open Banking (Salt Edge/PSD2), categorização ML de transações, simulador IRS 2024, cotações reais de bolsa/crypto, importação de corretoras, e assistente fiscal IA.

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
│   ├── App.tsx                      # Routing (React Router v6)
│   ├── components/
│   │   ├── auth/PrivateRoute.tsx    # Protecção de rotas (demo-token bypass!)
│   │   ├── layout/Sidebar.tsx       # Nav sidebar (sem mobile toggle!)
│   │   └── ui/                      # GlassCard, GlassButton, EmptyState, etc.
│   ├── pages/                       # 13 páginas (todas com mock data)
│   ├── services/api.ts              # Axios + interceptors + todos os apiClients
│   ├── store/authStore.ts           # Zustand (JWT em localStorage)
│   ├── data/mock.ts                 # TODOS os dados mock — substituir progressivamente
│   └── styles/globals.css           # Design system (paleta Ink + Gold)
├── backend/src/
│   ├── server.ts                    # Express app + mount de rotas
│   ├── routes/                      # auth.ts ✅ | accounts/transactions/budgets/categories/irs.ts ❌ (501)
│   ├── middleware/
│   │   ├── authenticate.ts          # JWT verify + Redis session check
│   │   ├── errorHandler.ts          # AppError class + global handler
│   │   └── rateLimiter.ts           # 100 req/15min global, 10 auth
│   ├── services/
│   │   ├── authService.ts           # Toda a lógica de auth
│   │   └── emailService.ts          # Nodemailer SMTP
│   └── config/
│       ├── database.ts              # pg Pool (max 20 conns)
│       └── redis.ts                 # Redis client
├── backend/database/init.sql        # Schema PostgreSQL (8 tabelas)
└── ml-service/app/
    ├── main.py                      # Flask: /categorize, /retrain
    └── categorizer.py               # TF-IDF + Random Forest
```

---

## Padrões de Código

### Backend — Como adicionar um endpoint
```typescript
// 1. Importar authenticate middleware em rotas protegidas
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
    next(err); // sempre usar next(err) para erros
  }
});
```

### Frontend — Como adicionar chamada API com React Query
```typescript
// Em services/api.ts já existem os API clients. Usar assim:
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '../services/api';

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['budgets'],
  queryFn: () => budgetsApi.list().then(r => r.data.data),
});

// Mutation
const qc = useQueryClient();
const { mutate } = useMutation({
  mutationFn: budgetsApi.create,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
});
```

### Frontend — Componentes UI disponíveis
```typescript
// Todos em src/frontend/src/components/ui/
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
```

---

## Design System

- **Cores principais**: `var(--gold)` = #C9A227, `var(--ink-900)` = #111110
- **Background**: `bg-[#F4F4F2]` (páginas), `bg-white` (cards)
- **Cards**: `rounded-2xl`, `shadow: 0 1px 3px rgba(0,0,0,0.04)`
- **Botão primário**: GlassButton variant="primary" (gold background)
- **Animações**: Framer Motion com `initial={{ opacity:0, y:8 }}` + stagger delays

---

## Autenticação

- JWT HS256, 15 min TTL (access token)
- Refresh token UUID em Redis, 7 dias TTL
- `req.user = { id: string, email: string }` após `authenticate` middleware
- **ATENÇÃO**: `PrivateRoute.tsx` tem bypass para `'demo-token'` — desativar em produção
- Tokens em localStorage (aceitável para demo académico, não produção)

---

## Base de Dados (PostgreSQL)

Tabelas existentes: `users`, `bank_accounts`, `categories`, `transactions`, `budgets`, `savings_goals`, `irs_simulations`, `fiscal_profile`, `deduction_alerts`

Tabelas em falta (a criar): `investments` (portfólio do utilizador), `investment_prices` (histórico de cotações)

Padrão de queries:
```sql
-- Sempre filtrar por user_id para isolamento de dados
SELECT * FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC;
```

---

## Estado Actual do Projecto (Abril 2026)

### ✅ Completo
- Autenticação completa (registo, login, 2FA TOTP, reset password, email verification)
- 13 páginas de frontend (UI completa, com mock data)
- Design system Ink + Gold coeso
- Docker Compose com 5 serviços
- Schema PostgreSQL com 8+ tabelas

### ❌ Por implementar (ver roadmap em docs/superpowers/plans/)
- 18 endpoints backend retornam 501 (Sprints 4-7)
- Frontend usa 100% dados mock (src/frontend/src/data/mock.ts)
- Goals router não existe no backend
- Fiscal profile router não existe no backend
- Tabela `investments` não existe
- Sem testes (0% cobertura)
- Salt Edge não integrado
- Preços de mercado não integrados
- Importação de corretoras não implementada
- Assistente fiscal IA não implementado

---

## Variáveis de Ambiente Necessárias

```env
JWT_SECRET=<64 chars random>
DATABASE_URL=postgresql://goldlock:goldlock_dev@postgres:5432/goldlock_db
REDIS_URL=redis://redis:6379
VITE_API_URL=http://localhost:4000/api
SALT_EDGE_APP_ID=        # Salt Edge dashboard
SALT_EDGE_SECRET=        # Salt Edge dashboard
SMTP_HOST=               # SMTP para emails
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
OPENAI_API_KEY=          # Para assistente fiscal IA (opcional)
```

---

## Notas Importantes para IA

1. **Não usar mock.ts em código novo** — substituir por chamadas reais à API
2. **Sempre usar `authenticate` middleware** em endpoints protegidos
3. **Sempre usar `next(err)` para erros** — não `.status(500).json(...)` directo
4. **Filtrar sempre por `user_id`** — isolamento de dados por utilizador
5. **Validar inputs com Zod** antes de queries SQL
6. **O frontend já tem todos os apiClients** em `services/api.ts` — não criar duplicados
7. **Seguir padrão de resposta**: `{ status: 'success', data: ... }` ou `{ status: 'error', message: ... }`
8. **Demo mode**: `LoginPage.tsx:16-27` e `PrivateRoute.tsx:38` têm hardcoded demo bypass
