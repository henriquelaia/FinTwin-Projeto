# GoldLock — Plano de Implementação Completo

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar o GoldLock transformando-o de um protótipo com mock data numa aplicação fintech funcional com dados reais, Open Banking, cotações de mercado, importação de corretoras e assistente fiscal IA.

**Architecture:** Backend Express REST API com PostgreSQL + Redis. Frontend React com React Query substituindo todos os mocks. Serviços externos: Salt Edge (Open Banking), Yahoo Finance + CoinGecko (preços), OpenAI (IA fiscal).

**Tech Stack:** React 18 · TypeScript · Vite · TailwindCSS · Framer Motion · Zustand · React Query · Recharts | Node.js · Express · PostgreSQL · Redis · Zod · JWT | Python · Flask · scikit-learn | Salt Edge API · yahoo-finance2 · CoinGecko API · OpenAI API

---

## Módulos de Implementação

| Módulo | Nome | Pré-requisitos |
|--------|------|---------------|
| **A** | Core Backend + Frontend Integration | Nenhum |
| **B** | Salt Edge Open Banking | A |
| **C** | Preços Reais (Bolsa + Crypto) | A |
| **D** | Importação de Corretoras (CSV) | C |
| **E** | Assistente Fiscal IA | A + B + C |

---

## Chunk 1: Módulo A — Core Backend + Frontend Integration

**Objetivo:** Implementar os 18 endpoints stub, criar routers em falta (goals, fiscal-profile), e substituir todos os mocks do frontend por chamadas reais à API.

### Task A0: Corrigir documentação e configuração

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Corrigir README.md** — Alterar "Supabase Auth" para "Custom JWT + Redis". Actualizar stack table, estrutura de ficheiros, e descrição correcta.

- [ ] **Corrigir .env.example** — Substituir referências a "FinTwin/fintwin" por "GoldLock/goldlock". Adicionar variáveis em falta:

```env
# ── Segurança ──
JWT_SECRET=muda_isto_para_uma_string_aleatoria_longa_64chars

# ── Base de Dados ──
DATABASE_URL=postgresql://goldlock:goldlock_dev@postgres:5432/goldlock_db
POSTGRES_DB=goldlock_db
POSTGRES_USER=goldlock
POSTGRES_PASSWORD=goldlock_dev

# ── Redis ──
REDIS_URL=redis://redis:6379

# ── Frontend ──
VITE_API_URL=http://localhost:4000/api
FRONTEND_URL=http://localhost:3000

# ── Salt Edge (Open Banking) — https://www.saltedge.com ──
SALT_EDGE_APP_ID=
SALT_EDGE_SECRET=
SALT_EDGE_BASE_URL=https://www.saltedge.com/api/v5

# ── SMTP (Nodemailer) ──
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@goldlock.app

# ── Market Data ──
# Yahoo Finance não precisa de chave. CoinGecko free tier também não.
# Alpha Vantage (opcional, backup): https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_KEY=

# ── IA Fiscal ──
# OpenAI API: https://platform.openai.com/api-keys
OPENAI_API_KEY=
```

- [ ] **Commit:** `docs: fix README auth description and env.example credentials`

---

### Task A1: Schema DB — Adicionar tabela investments

**Files:**
- Modify: `src/backend/database/init.sql`

- [ ] **Adicionar tabela `investments`** após a tabela `savings_goals`:

```sql
-- ══════════════════════════════════════════
-- Tabela: investments
-- Portfólio de investimentos do utilizador
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ticker VARCHAR(20),
    type VARCHAR(20) NOT NULL CHECK (type IN ('stock', 'etf', 'bond', 'crypto', 'certificado', 'deposito')),
    quantity DECIMAL(18, 8) NOT NULL,
    purchase_price DECIMAL(15, 4) NOT NULL,
    purchase_date DATE,
    currency VARCHAR(3) DEFAULT 'EUR',
    risk_level VARCHAR(20) DEFAULT 'moderate' CHECK (risk_level IN ('guaranteed', 'moderate', 'high')),
    institution VARCHAR(255),
    maturity_date DATE,
    annual_rate DECIMAL(6, 4),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_investments_user ON investments(user_id);
CREATE INDEX idx_investments_ticker ON investments(ticker) WHERE ticker IS NOT NULL;

CREATE TRIGGER trg_investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Commit:** `feat(db): add investments table`

---

### Task A2: Categories endpoint

**Files:**
- Modify: `src/backend/src/routes/categories.ts`

- [ ] **Implementar GET /categories:**

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', authenticate, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, name_pt, icon, color, is_expense, irs_deduction_category
       FROM categories ORDER BY name_pt`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

categoriesRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, namePt, icon, color, isExpense = true } = req.body;
    if (!name || !namePt) {
      res.status(400).json({ status: 'error', message: 'name e namePt são obrigatórios' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO categories (name, name_pt, icon, color, is_expense)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, namePt, icon || 'circle-dot', color || '#9E9E9E', isExpense]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Testar:** `curl -H "Authorization: Bearer <token>" http://localhost:4000/api/categories`
- [ ] **Commit:** `feat(api): implement categories endpoints`

---

### Task A3: Transactions backend

**Files:**
- Modify: `src/backend/src/routes/transactions.ts`

- [ ] **Implementar GET /transactions com paginação e filtros:**

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { z } from 'zod';

export const transactionsRouter = Router();

transactionsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, type } = req.query;
    const userId = req.user!.id;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = ['t.user_id = $1'];
    const params: unknown[] = [userId];
    let i = 2;

    if (category) { conditions.push(`c.name = $${i++}`); params.push(category); }
    if (startDate) { conditions.push(`t.transaction_date >= $${i++}`); params.push(startDate); }
    if (endDate) { conditions.push(`t.transaction_date <= $${i++}`); params.push(endDate); }
    if (type === 'expense') { conditions.push('t.amount < 0'); }
    if (type === 'income') { conditions.push('t.amount > 0'); }

    const where = conditions.join(' AND ');

    const [rows, countRow] = await Promise.all([
      pool.query(
        `SELECT t.*, c.name_pt as category_name, c.icon as category_icon, c.color as category_color,
                b.bank_name, b.account_name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN bank_accounts b ON t.bank_account_id = b.id
         WHERE ${where}
         ORDER BY t.transaction_date DESC, t.created_at DESC
         LIMIT $${i++} OFFSET $${i++}`,
        [...params, Number(limit), offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE ${where}`,
        params
      ),
    ]);

    const total = parseInt(countRow.rows[0].count, 10);
    res.json({
      status: 'success',
      data: rows.rows,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.get('/summary', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split('-');

    const result = await pool.query(
      `SELECT
         SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
         SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
         c.name_pt as category, c.color,
         SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as category_total
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
         AND EXTRACT(YEAR FROM t.transaction_date) = $2
         AND EXTRACT(MONTH FROM t.transaction_date) = $3
       GROUP BY c.name_pt, c.color`,
      [userId, year, mon]
    );

    const income = result.rows.reduce((s, r) => s + Number(r.income || 0), 0);
    const expenses = result.rows.reduce((s, r) => s + Number(r.expenses || 0), 0);
    const byCategory = result.rows
      .filter(r => r.category)
      .map(r => ({ category: r.category, color: r.color, total: Number(r.category_total) }))
      .sort((a, b) => b.total - a.total);

    res.json({ status: 'success', data: { income, expenses, savings: income - expenses, byCategory } });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.put('/:id/category', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;
    const userId = req.user!.id;

    if (!categoryId) {
      res.status(400).json({ status: 'error', message: 'categoryId é obrigatório' });
      return;
    }

    const result = await pool.query(
      `UPDATE transactions SET category_id = $1, ml_categorized = false, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [categoryId, id, userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Transação não encontrada' });
      return;
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.post('/sync', authenticate, async (_req, res) => {
  // Salt Edge sync — implementado no Módulo B
  res.json({ status: 'success', message: 'Sync agendado. Implementar Salt Edge no Módulo B.' });
});
```

- [ ] **Commit:** `feat(api): implement transactions endpoints with pagination and filters`

---

### Task A4: Budgets backend

**Files:**
- Modify: `src/backend/src/routes/budgets.ts`

- [ ] **Implementar CRUD completo de orçamentos:**

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

export const budgetsRouter = Router();

const BudgetSchema = z.object({
  name: z.string().min(1).max(255),
  categoryId: z.string().uuid().optional(),
  amountLimit: z.number().positive(),
  period: z.enum(['monthly', 'weekly', 'yearly']).default('monthly'),
  alertThreshold: z.number().min(1).max(100).default(80),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

budgetsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      `SELECT b.*, c.name_pt as category_name, c.icon as category_icon, c.color as category_color,
              COALESCE(
                (SELECT SUM(ABS(amount)) FROM transactions t
                 WHERE t.category_id = b.category_id AND t.user_id = b.user_id
                   AND t.amount < 0
                   AND t.transaction_date >= date_trunc('month', CURRENT_DATE)),
                0
              ) as spent
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

budgetsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const body = BudgetSchema.parse(req.body);
    const userId = req.user!.id;
    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, name, amount_limit, period, alert_threshold, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, body.categoryId || null, body.name, body.amountLimit, body.period, body.alertThreshold, body.startDate, body.endDate || null]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

budgetsRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const body = BudgetSchema.partial().parse(req.body);

    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (body.name !== undefined) { sets.push(`name = $${i++}`); params.push(body.name); }
    if (body.amountLimit !== undefined) { sets.push(`amount_limit = $${i++}`); params.push(body.amountLimit); }
    if (body.alertThreshold !== undefined) { sets.push(`alert_threshold = $${i++}`); params.push(body.alertThreshold); }
    if (body.categoryId !== undefined) { sets.push(`category_id = $${i++}`); params.push(body.categoryId); }

    if (sets.length === 0) { res.status(400).json({ status: 'error', message: 'Nenhum campo para actualizar' }); return; }
    sets.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE budgets SET ${sets.join(', ')} WHERE id = $${i++} AND user_id = $${i++} RETURNING *`,
      [...params, id, userId]
    );
    if (result.rowCount === 0) { res.status(404).json({ status: 'error', message: 'Orçamento não encontrado' }); return; }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

budgetsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) { res.status(404).json({ status: 'error', message: 'Orçamento não encontrado' }); return; }
    res.json({ status: 'success', message: 'Orçamento eliminado' });
  } catch (err) {
    next(err);
  }
});

budgetsRouter.get('/:id/progress', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const budget = await pool.query('SELECT * FROM budgets WHERE id = $1 AND user_id = $2', [id, userId]);
    if (budget.rowCount === 0) { res.status(404).json({ status: 'error', message: 'Orçamento não encontrado' }); return; }
    const b = budget.rows[0];

    const spent = await pool.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as spent FROM transactions
       WHERE category_id = $1 AND user_id = $2 AND amount < 0
         AND transaction_date >= date_trunc('month', CURRENT_DATE)`,
      [b.category_id, userId]
    );
    const spentAmount = Number(spent.rows[0].spent);
    const percentage = Math.round((spentAmount / Number(b.amount_limit)) * 100);

    res.json({ status: 'success', data: { ...b, spent: spentAmount, percentage, isOverBudget: percentage > 100 } });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Commit:** `feat(api): implement budgets CRUD with progress tracking`

---

### Task A5: Goals backend (router em falta!)

**Files:**
- Create: `src/backend/src/routes/goals.ts`
- Modify: `src/backend/src/server.ts`

- [ ] **Criar `src/backend/src/routes/goals.ts`:**

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

export const goalsRouter = Router();

const GoalSchema = z.object({
  name: z.string().min(1).max(255),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

goalsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) { next(err); }
});

goalsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const body = GoalSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, deadline, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user!.id, body.name, body.targetAmount, body.currentAmount, body.deadline || null, body.icon || '🎯', body.color || 'var(--gold)']
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

goalsRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const body = GoalSchema.partial().parse(req.body);
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (body.name !== undefined) { sets.push(`name = $${i++}`); params.push(body.name); }
    if (body.targetAmount !== undefined) { sets.push(`target_amount = $${i++}`); params.push(body.targetAmount); }
    if (body.deadline !== undefined) { sets.push(`deadline = $${i++}`); params.push(body.deadline); }
    sets.push(`updated_at = NOW()`);
    const result = await pool.query(
      `UPDATE savings_goals SET ${sets.join(', ')} WHERE id = $${i++} AND user_id = $${i++} RETURNING *`,
      [...params, req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) { res.status(404).json({ status: 'error', message: 'Meta não encontrada' }); return; }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) { next(err); }
});

goalsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM savings_goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) { res.status(404).json({ status: 'error', message: 'Meta não encontrada' }); return; }
    res.json({ status: 'success', message: 'Meta eliminada' });
  } catch (err) { next(err); }
});

goalsRouter.put('/:id/deposit', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ status: 'error', message: 'amount deve ser positivo' }); return; }
    const result = await pool.query(
      `UPDATE savings_goals SET current_amount = LEAST(current_amount + $1, target_amount), updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [amount, req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) { res.status(404).json({ status: 'error', message: 'Meta não encontrada' }); return; }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) { next(err); }
});
```

- [ ] **Montar no server.ts** — adicionar após `import { categoriesRouter }`:

```typescript
import { goalsRouter } from './routes/goals.js';
// ...
app.use('/api/goals', goalsRouter);
```

- [ ] **Commit:** `feat(api): implement goals CRUD and deposit endpoint`

---

### Task A6: IRS backend + Fiscal Profile

**Files:**
- Modify: `src/backend/src/routes/irs.ts`
- Create: `src/backend/src/routes/fiscalProfile.ts`
- Modify: `src/backend/src/server.ts`

- [ ] **Implementar `src/backend/src/routes/irs.ts`** com motor de regras IRS 2024:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

export const irsRouter = Router();

// Escalões IRS 2024 (Portugal)
const IRS_BRACKETS_2024 = [
  { min: 0, max: 7703, rate: 0.1325, parcel: 0 },
  { min: 7703, max: 11623, rate: 0.18, parcel: 411.91 },
  { min: 11623, max: 16472, rate: 0.23, parcel: 992.97 },
  { min: 16472, max: 21321, rate: 0.26, parcel: 1486.92 },
  { min: 21321, max: 27146, rate: 0.3275, parcel: 2149.32 },
  { min: 27146, max: 39791, rate: 0.37, parcel: 3395.42 },
  { min: 39791, max: 51997, rate: 0.435, parcel: 5982.08 },
  { min: 51997, max: 81199, rate: 0.45, parcel: 6760.06 },
  { min: 81199, max: Infinity, rate: 0.48, parcel: 9196.07 },
];

// Limites de deduções à coleta 2024
const DEDUCTION_LIMITS_2024 = {
  saude: { rate: 0.15, limit: 1000, name: 'Saúde' },
  educacao: { rate: 0.30, limit: 800, name: 'Educação' },
  habitacao: { rate: 0.15, limit: 296, name: 'Habitação' },
  restauracao: { rate: 0.15, limit: 250, name: 'Restauração (encargos gerais)' },
  ppr: { rate: 0.20, limit_under35: 400, limit_35_50: 350, limit_over50: 300, name: 'PPR' },
};

function calculateIRS(grossIncome: number, maritalStatus: string, dependents: number,
                       socialSecurity: number, withholding: number, deductions: Record<string, number>) {
  // Rendimento colectável
  const specificDeduction = Math.max(socialSecurity, 4104); // Dedução específica Cat.A: SS ou min €4.104
  const collectableIncome = Math.max(grossIncome - specificDeduction, 0);

  // Encontrar escalão marginal
  const bracket = IRS_BRACKETS_2024.find(b => collectableIncome <= b.max) || IRS_BRACKETS_2024[IRS_BRACKETS_2024.length - 1];
  const grossTax = collectableIncome * bracket.rate - bracket.parcel;

  // Deduções pessoais (dependentes)
  const dependentsDeduction = dependents * 600 + (dependents > 3 ? (dependents - 3) * 126 : 0);

  // Deduções à coleta
  const healthDeduction = Math.min((deductions.saude || 0) * 0.15, 1000);
  const educationDeduction = Math.min((deductions.educacao || 0) * 0.30, 800);
  const housingDeduction = Math.min((deductions.habitacao || 0) * 0.15, 296);
  const restauracaoDeduction = Math.min((deductions.restauracao || 0) * 0.15, 250);
  const pprDeduction = Math.min((deductions.ppr || 0) * 0.20, 400);

  const totalDeductions = dependentsDeduction + healthDeduction + educationDeduction +
                          housingDeduction + restauracaoDeduction + pprDeduction;

  const netTax = Math.max(grossTax - totalDeductions, 0);
  const result = netTax - withholding;
  const effectiveRate = grossIncome > 0 ? (netTax / grossIncome) * 100 : 0;
  const marginalRate = bracket.rate * 100;

  return {
    grossIncome, collectableIncome, specificDeduction,
    grossTax: Math.max(grossTax, 0),
    deductions: { dependents: dependentsDeduction, health: healthDeduction, education: educationDeduction,
                  housing: housingDeduction, restauracao: restauracaoDeduction, ppr: pprDeduction, total: totalDeductions },
    netTax, withholding, result, effectiveRate, marginalRate,
    bracket: { rate: marginalRate, min: bracket.min, max: bracket.max },
    status: result > 0 ? 'to_pay' : 'refund',
  };
}

const SimulateSchema = z.object({
  grossIncome: z.number().positive(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).default('single'),
  dependents: z.number().int().min(0).default(0),
  socialSecurityContributions: z.number().min(0).default(0),
  withholdingTax: z.number().min(0).default(0),
  deductions: z.object({
    saude: z.number().min(0).default(0),
    educacao: z.number().min(0).default(0),
    habitacao: z.number().min(0).default(0),
    restauracao: z.number().min(0).default(0),
    ppr: z.number().min(0).default(0),
  }).default({}),
  saveSimulation: z.boolean().default(false),
});

irsRouter.post('/simulate', authenticate, async (req, res, next) => {
  try {
    const body = SimulateSchema.parse(req.body);
    const result = calculateIRS(
      body.grossIncome, body.maritalStatus, body.dependents,
      body.socialSecurityContributions, body.withholdingTax, body.deductions
    );

    if (body.saveSimulation) {
      await pool.query(
        `INSERT INTO irs_simulations (user_id, tax_year, income_category, gross_income, marital_status, dependents, deductions, result)
         VALUES ($1, $2, 'A', $3, $4, $5, $6, $7)`,
        [req.user!.id, new Date().getFullYear(), body.grossIncome, body.maritalStatus, body.dependents,
         JSON.stringify(body.deductions), JSON.stringify(result)]
      );
    }

    res.json({ status: 'success', data: result });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

irsRouter.get('/brackets', authenticate, (_req, res) => {
  res.json({ status: 'success', data: { year: 2024, brackets: IRS_BRACKETS_2024 } });
});

irsRouter.get('/deductions', authenticate, (_req, res) => {
  res.json({ status: 'success', data: DEDUCTION_LIMITS_2024 });
});

irsRouter.get('/deduction-alerts', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT da.*, t.description, t.transaction_date
       FROM deduction_alerts da
       LEFT JOIN transactions t ON da.transaction_id = t.id
       WHERE da.user_id = $1 AND da.status = 'pending'
       ORDER BY da.ml_confidence DESC`,
      [req.user!.id]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) { next(err); }
});

irsRouter.put('/deduction-alerts/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const { confirmedType } = req.body;
    const result = await pool.query(
      `UPDATE deduction_alerts SET status = 'confirmed', user_confirmed_type = $1
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [confirmedType, req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) { res.status(404).json({ status: 'error', message: 'Alerta não encontrado' }); return; }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) { next(err); }
});
```

- [ ] **Criar `src/backend/src/routes/fiscalProfile.ts`:**

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

export const fiscalProfileRouter = Router();

const FiscalProfileSchema = z.object({
  grossIncomeAnnual: z.number().positive().optional(),
  socialSecurityContributions: z.number().min(0).optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  dependents: z.number().int().min(0).optional(),
  disabilityPercentage: z.number().min(0).max(100).optional(),
  withholdingTax: z.number().min(0).optional(),
  pprContributions: z.number().min(0).optional(),
  fiscalYear: z.number().int().min(2020).optional(),
});

fiscalProfileRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM fiscal_profile WHERE user_id = $1', [req.user!.id]);
    res.json({ status: 'success', data: result.rows[0] || null });
  } catch (err) { next(err); }
});

fiscalProfileRouter.put('/', authenticate, async (req, res, next) => {
  try {
    const body = FiscalProfileSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO fiscal_profile (user_id, gross_income_annual, social_security_contributions, marital_status,
         dependents, disability_percentage, withholding_tax, ppr_contributions, fiscal_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         gross_income_annual = COALESCE($2, fiscal_profile.gross_income_annual),
         social_security_contributions = COALESCE($3, fiscal_profile.social_security_contributions),
         marital_status = COALESCE($4, fiscal_profile.marital_status),
         dependents = COALESCE($5, fiscal_profile.dependents),
         disability_percentage = COALESCE($6, fiscal_profile.disability_percentage),
         withholding_tax = COALESCE($7, fiscal_profile.withholding_tax),
         ppr_contributions = COALESCE($8, fiscal_profile.ppr_contributions),
         fiscal_year = COALESCE($9, fiscal_profile.fiscal_year),
         updated_at = NOW()
       RETURNING *`,
      [req.user!.id, body.grossIncomeAnnual, body.socialSecurityContributions, body.maritalStatus,
       body.dependents, body.disabilityPercentage, body.withholdingTax, body.pprContributions,
       body.fiscalYear || new Date().getFullYear()]
    );
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});
```

- [ ] **Montar em server.ts** — adicionar imports e rotas:

```typescript
import { goalsRouter } from './routes/goals.js';
import { fiscalProfileRouter } from './routes/fiscalProfile.js';
// ...
app.use('/api/goals', goalsRouter);
app.use('/api/fiscal-profile', fiscalProfileRouter);
```

- [ ] **Commit:** `feat(api): implement IRS engine 2024, fiscal profile, and deduction alerts`

---

### Task A7: Investments backend

**Files:**
- Create: `src/backend/src/routes/investments.ts`
- Modify: `src/backend/src/server.ts`

- [ ] **Criar `src/backend/src/routes/investments.ts`:**

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

export const investmentsRouter = Router();

const InvestmentSchema = z.object({
  name: z.string().min(1).max(255),
  ticker: z.string().max(20).optional(),
  type: z.enum(['stock', 'etf', 'bond', 'crypto', 'certificado', 'deposito']),
  quantity: z.number().positive(),
  purchasePrice: z.number().positive(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency: z.string().length(3).default('EUR'),
  riskLevel: z.enum(['guaranteed', 'moderate', 'high']).default('moderate'),
  institution: z.string().optional(),
  maturityDate: z.string().optional(),
  annualRate: z.number().optional(),
  notes: z.string().optional(),
});

investmentsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    // Preços actuais serão injectados pelo serviço de market data (Módulo C)
    res.json({ status: 'success', data: result.rows });
  } catch (err) { next(err); }
});

investmentsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const body = InvestmentSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO investments (user_id, name, ticker, type, quantity, purchase_price, purchase_date,
         currency, risk_level, institution, maturity_date, annual_rate, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user!.id, body.name, body.ticker, body.type, body.quantity, body.purchasePrice,
       body.purchaseDate, body.currency, body.riskLevel, body.institution,
       body.maturityDate, body.annualRate, body.notes]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

investmentsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM investments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) { res.status(404).json({ status: 'error', message: 'Investimento não encontrado' }); return; }
    res.json({ status: 'success', message: 'Investimento eliminado' });
  } catch (err) { next(err); }
});
```

- [ ] **Montar em server.ts:**
```typescript
import { investmentsRouter } from './routes/investments.js';
app.use('/api/investments', investmentsRouter);
```

- [ ] **Commit:** `feat(api): implement investments CRUD`

---

### Task A8: Frontend — Substituir mocks por API calls

**Files:**
- Create: `src/frontend/src/hooks/useTransactions.ts`
- Create: `src/frontend/src/hooks/useBudgets.ts`
- Create: `src/frontend/src/hooks/useGoals.ts`
- Create: `src/frontend/src/hooks/useInvestments.ts`
- Create: `src/frontend/src/hooks/useDashboard.ts`
- Modify: `src/frontend/src/pages/TransactionsPage.tsx`
- Modify: `src/frontend/src/pages/BudgetsPage.tsx`
- Modify: `src/frontend/src/pages/GoalsPage.tsx`
- Modify: `src/frontend/src/pages/DashboardPage.tsx`

- [ ] **Criar `src/frontend/src/hooks/useTransactions.ts`:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, categoriesApi } from '../services/api';

export function useTransactions(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => transactionsApi.list(params).then(r => r.data),
  });
}

export function useTransactionSummary(month?: string) {
  return useQuery({
    queryKey: ['transactions-summary', month],
    queryFn: () => transactionsApi.summary(month).then(r => r.data.data),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      transactionsApi.updateCategory(id, categoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then(r => r.data.data),
    staleTime: 5 * 60 * 1000, // categorias mudam raramente
  });
}
```

- [ ] **Criar `src/frontend/src/hooks/useBudgets.ts`:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '../services/api';

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsApi.list().then(r => r.data.data),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      budgetsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
```

- [ ] **Criar `src/frontend/src/hooks/useGoals.ts`:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../services/api';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.list().then(r => r.data.data),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDepositGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      goalsApi.deposit(id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}
```

- [ ] **Actualizar `BudgetsPage.tsx`** — substituir `MOCK_BUDGETS` por `useBudgets()`, adicionar modal de criação:
  - Remover import de `MOCK_BUDGETS` de `data/mock.ts`
  - Usar `useBudgets()` para listagem
  - Adicionar estado `showCreateModal` + formulário inline ou modal
  - Campos: nome, categoria (select de `useCategories()`), limite, threshold

- [ ] **Actualizar `GoalsPage.tsx`** — substituir `MOCK_GOALS` por `useGoals()`, adicionar modal:
  - Remover import de `MOCK_GOALS`
  - Usar `useGoals()` para listagem
  - Adicionar modal de criação com campos: nome, target, prazo, ícone

- [ ] **Actualizar `TransactionsPage.tsx`** — substituir `MOCK_TRANSACTIONS` por `useTransactions()`:
  - Remover imports de mock data
  - Usar `useTransactions({ page, category, startDate, endDate })` 
  - Usar `useTransactionSummary()` para cards de resumo
  - Manter filtros UI existentes, ligar ao state params

- [ ] **Actualizar `DashboardPage.tsx`** — substituir mocks por chamadas reais:
  - `useTransactionSummary()` para income/expenses/savings
  - `useTransactions({ limit: 5 })` para lista recente
  - `useQuery accounts` para saldo total

- [ ] **Commit:** `feat(frontend): replace all mock data with real API calls`

---

### Task A9: UI features em falta

**Files:**
- Modify: `src/frontend/src/components/layout/Sidebar.tsx`
- Modify: `src/frontend/src/pages/SettingsPage.tsx`
- Modify: `src/frontend/src/pages/BudgetsPage.tsx` (create modal)
- Modify: `src/frontend/src/pages/GoalsPage.tsx` (create modal)

- [ ] **Sidebar mobile toggle** — adicionar estado `isOpen` + botão hamburger:
  - Adicionar `useState(false)` para `isOpen`
  - Em desktop (lg+): sidebar sempre visível
  - Em mobile: sidebar como drawer com overlay ao clicar fora
  - Botão hamburger no topo da página principal (MainLayout)

- [ ] **Change password em Settings** — nova tab ou secção na tab Security:
  - Form: password actual + nova password + confirmar
  - Chamar `PUT /api/auth/profile` ou novo endpoint `POST /api/auth/change-password`

- [ ] **EmptyState nas listagens** — integrar em cada página:
  ```typescript
  if (!isLoading && data?.length === 0) {
    return <EmptyState icon={IconComponent} title="Sem dados" description="..." 
                       action={{ label: "Criar", onClick: () => setShowModal(true) }} />;
  }
  ```

- [ ] **Commit:** `feat(frontend): add mobile sidebar, change password, and empty states`

---

## Chunk 2: Módulo B — Salt Edge Open Banking

**Objetivo:** Integrar Salt Edge API para ligar contas bancárias portuguesas reais e sincronizar transações automaticamente.

### Task B1: Instalar dependência Salt Edge

**Files:**
- Modify: `src/backend/package.json`

- [ ] **Instalar axios para chamadas Salt Edge:**
  ```bash
  cd src/backend && npm install axios
  ```
  (axios já está no frontend; o backend usa pg/redis directamente)

- [ ] **Commit:** `chore(backend): add axios for Salt Edge API calls`

---

### Task B2: Salt Edge Service

**Files:**
- Create: `src/backend/src/services/saltEdgeService.ts`

- [ ] **Criar serviço Salt Edge** com as operações core:

```typescript
import axios from 'axios';

const BASE = process.env.SALT_EDGE_BASE_URL || 'https://www.saltedge.com/api/v5';
const APP_ID = process.env.SALT_EDGE_APP_ID!;
const SECRET = process.env.SALT_EDGE_SECRET!;

const saltEdge = axios.create({
  baseURL: BASE,
  headers: { 'App-id': APP_ID, 'Secret': SECRET, 'Content-Type': 'application/json' },
});

export interface SaltEdgeCustomer { id: string; identifier: string; }
export interface SaltEdgeConnection { id: string; provider_name: string; status: string; }
export interface SaltEdgeAccount { id: string; name: string; nature: string; balance: number; currency_code: string; }
export interface SaltEdgeTransaction { id: string; description: string; amount: number; made_on: string; currency_code: string; account_id: string; }

export const saltEdgeService = {
  async createCustomer(identifier: string): Promise<SaltEdgeCustomer> {
    const { data } = await saltEdge.post('/customers', { data: { identifier } });
    return data.data;
  },

  async getConnectUrl(customerId: string, returnTo: string): Promise<string> {
    const { data } = await saltEdge.post('/connect_sessions/create', {
      data: {
        customer_id: customerId,
        consent: { scopes: ['account_details', 'transactions_details'], from_date: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0] },
        attempt: { return_to: returnTo, fetch_scopes: ['accounts', 'transactions'] },
        allowed_countries: ['PT'],
      },
    });
    return data.data.connect_url;
  },

  async getConnections(customerId: string): Promise<SaltEdgeConnection[]> {
    const { data } = await saltEdge.get(`/connections?customer_id=${customerId}`);
    return data.data;
  },

  async getAccounts(connectionId: string): Promise<SaltEdgeAccount[]> {
    const { data } = await saltEdge.get(`/accounts?connection_id=${connectionId}`);
    return data.data;
  },

  async getTransactions(connectionId: string, accountId: string, fromDate?: string): Promise<SaltEdgeTransaction[]> {
    const params: Record<string, string> = { connection_id: connectionId, account_id: accountId };
    if (fromDate) params.from_date = fromDate;
    const { data } = await saltEdge.get('/transactions', { params });
    return data.data;
  },

  async deleteConnection(connectionId: string): Promise<void> {
    await saltEdge.delete(`/connections/${connectionId}`);
  },
};
```

---

### Task B3: Accounts endpoints com Salt Edge

**Files:**
- Modify: `src/backend/src/routes/accounts.ts`

- [ ] **Implementar todos os endpoints de contas com Salt Edge:**

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { saltEdgeService } from '../services/saltEdgeService.js';
import { AppError } from '../middleware/errorHandler.js';

export const accountsRouter = Router();

// Obter ou criar customer Salt Edge para este utilizador
async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const result = await pool.query('SELECT preferences FROM users WHERE id = $1', [userId]);
  const prefs = result.rows[0]?.preferences || {};
  
  if (prefs.saltEdgeCustomerId) return prefs.saltEdgeCustomerId;
  
  const customer = await saltEdgeService.createCustomer(`goldlock_${userId}`);
  await pool.query(
    `UPDATE users SET preferences = preferences || $1 WHERE id = $2`,
    [JSON.stringify({ saltEdgeCustomerId: customer.id }), userId]
  );
  return customer.id;
}

accountsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) { next(err); }
});

accountsRouter.post('/connect', authenticate, async (req, res, next) => {
  try {
    const customerId = await getOrCreateCustomer(req.user!.id, req.user!.email);
    const returnTo = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accounts?connected=true`;
    const connectUrl = await saltEdgeService.getConnectUrl(customerId, returnTo);
    res.json({ status: 'success', data: { connectUrl } });
  } catch (err) { next(err); }
});

accountsRouter.post('/sync', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const userResult = await pool.query('SELECT preferences FROM users WHERE id = $1', [userId]);
    const customerId = userResult.rows[0]?.preferences?.saltEdgeCustomerId;
    
    if (!customerId) {
      res.json({ status: 'success', message: 'Nenhuma conta ligada. Use /connect primeiro.' });
      return;
    }

    const connections = await saltEdgeService.getConnections(customerId);
    let syncedAccounts = 0;
    let syncedTransactions = 0;

    for (const conn of connections.filter(c => c.status === 'active')) {
      const seAccounts = await saltEdgeService.getAccounts(conn.id);
      
      for (const acc of seAccounts) {
        // Upsert conta
        const accResult = await pool.query(
          `INSERT INTO bank_accounts (user_id, bank_name, account_name, salt_edge_connection_id, salt_edge_account_id, balance, currency, last_synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (salt_edge_account_id) DO UPDATE SET
             balance = $6, last_synced_at = NOW()
           RETURNING id`,
          [userId, conn.provider_name, acc.name, conn.id, acc.id, acc.balance, acc.currency_code]
        );
        syncedAccounts++;

        // Buscar última transação sincronizada
        const lastSync = await pool.query(
          'SELECT MAX(transaction_date) as last FROM transactions WHERE bank_account_id = $1',
          [accResult.rows[0].id]
        );
        const fromDate = lastSync.rows[0].last || '2024-01-01';

        // Sincronizar transações
        const txs = await saltEdgeService.getTransactions(conn.id, acc.id, fromDate);
        for (const tx of txs) {
          await pool.query(
            `INSERT INTO transactions (user_id, bank_account_id, description, amount, currency, transaction_date, salt_edge_transaction_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (salt_edge_transaction_id) DO NOTHING`,
            [userId, accResult.rows[0].id, tx.description, tx.amount, tx.currency_code, tx.made_on, tx.id]
          );
          syncedTransactions++;
        }
      }
    }

    res.json({ status: 'success', data: { syncedAccounts, syncedTransactions } });
  } catch (err) { next(err); }
});

accountsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const account = await pool.query(
      'SELECT salt_edge_connection_id FROM bank_accounts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (account.rowCount === 0) { res.status(404).json({ status: 'error', message: 'Conta não encontrada' }); return; }

    if (account.rows[0].salt_edge_connection_id) {
      await saltEdgeService.deleteConnection(account.rows[0].salt_edge_connection_id).catch(() => {});
    }

    await pool.query('DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ status: 'success', message: 'Conta desligada' });
  } catch (err) { next(err); }
});
```

- [ ] **Adicionar constraint unique em transactions.salt_edge_transaction_id** no init.sql:
  ```sql
  ALTER TABLE transactions ADD CONSTRAINT uq_transactions_salt_edge UNIQUE (salt_edge_transaction_id);
  ```
  E adicionar constraint similar em bank_accounts:
  ```sql
  ALTER TABLE bank_accounts ADD CONSTRAINT uq_bank_accounts_salt_edge UNIQUE (salt_edge_account_id);
  ```

- [ ] **Actualizar AccountsPage.tsx** — substituir mock por API real + botão sync

- [ ] **Commit:** `feat(api): implement Salt Edge Open Banking integration`

---

## Chunk 3: Módulo C — Preços Reais de Mercado

**Objetivo:** Cotações em tempo real de ações (PSI, NYSE, NASDAQ) e crypto (BTC, ETH, etc.) com caching Redis e histórico para gráficos.

### Task C1: Instalar dependências de market data

- [ ] **Instalar no backend:**
  ```bash
  cd src/backend && npm install yahoo-finance2
  ```
  `yahoo-finance2` — wrapper Node.js para Yahoo Finance API (ações, ETFs, PSI).
  Para crypto usaremos a API pública do CoinGecko (sem SDK, fetch directo).

- [ ] **Commit:** `chore(backend): add yahoo-finance2 for market data`

---

### Task C2: Market Data Service

**Files:**
- Create: `src/backend/src/services/marketDataService.ts`

- [ ] **Criar serviço com cache Redis:**

```typescript
import yahooFinance from 'yahoo-finance2';
import { redisClient } from '../config/redis.js';

const STOCK_CACHE_TTL = 60;   // 60 segundos para acções
const CRYPTO_CACHE_TTL = 30;  // 30 segundos para crypto

export interface PriceResult {
  ticker: string;
  price: number;
  currency: string;
  change: number;       // variação absoluta
  changePercent: number; // variação em %
  high52: number;
  low52: number;
  name: string;
}

export interface HistoricalPoint { date: string; close: number; }

// Mapa de tickers crypto CoinGecko (ticker → coingecko id)
const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano',
  DOT: 'polkadot', MATIC: 'matic-network', LINK: 'chainlink',
  XRP: 'ripple', DOGE: 'dogecoin', AVAX: 'avalanche-2',
};

export const marketDataService = {
  async getStockPrice(ticker: string): Promise<PriceResult | null> {
    const cacheKey = `price:stock:${ticker}`;
    const cached = await redisClient.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

    try {
      const quote = await yahooFinance.quote(ticker);
      const result: PriceResult = {
        ticker,
        price: quote.regularMarketPrice || 0,
        currency: quote.currency || 'EUR',
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        high52: quote.fiftyTwoWeekHigh || 0,
        low52: quote.fiftyTwoWeekLow || 0,
        name: quote.longName || quote.shortName || ticker,
      };
      await redisClient.setEx(cacheKey, STOCK_CACHE_TTL, JSON.stringify(result)).catch(() => {});
      return result;
    } catch {
      return null;
    }
  },

  async getCryptoPrice(ticker: string): Promise<PriceResult | null> {
    const coinId = CRYPTO_IDS[ticker.toUpperCase()];
    if (!coinId) return null;

    const cacheKey = `price:crypto:${ticker}`;
    const cached = await redisClient.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur&include_24hr_change=true&include_24hr_vol=true`
      );
      const data = await response.json() as Record<string, Record<string, number>>;
      const coin = data[coinId];
      if (!coin) return null;

      const result: PriceResult = {
        ticker,
        price: coin.eur || 0,
        currency: 'EUR',
        change: 0,
        changePercent: coin.eur_24h_change || 0,
        high52: 0, low52: 0,
        name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
      };
      await redisClient.setEx(cacheKey, CRYPTO_CACHE_TTL, JSON.stringify(result)).catch(() => {});
      return result;
    } catch {
      return null;
    }
  },

  async getHistoricalPrices(ticker: string, period: '7d' | '1m' | '3m' | '1y'): Promise<HistoricalPoint[]> {
    const cacheKey = `history:${ticker}:${period}`;
    const cacheTTL = period === '7d' ? 300 : 3600; // 5min para 7d, 1h para períodos maiores
    const cached = await redisClient.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

    try {
      const periodMap = { '7d': '7d', '1m': '1mo', '3m': '3mo', '1y': '1y' };
      const result = await yahooFinance.historical(ticker, { period1: periodMap[period] as '7d', interval: '1d' });
      const points: HistoricalPoint[] = result.map(r => ({
        date: r.date.toISOString().split('T')[0],
        close: r.close || 0,
      }));
      await redisClient.setEx(cacheKey, cacheTTL, JSON.stringify(points)).catch(() => {});
      return points;
    } catch {
      return [];
    }
  },

  async batchPrices(tickers: Array<{ ticker: string; type: string }>): Promise<Record<string, PriceResult | null>> {
    const results: Record<string, PriceResult | null> = {};
    await Promise.allSettled(
      tickers.map(async ({ ticker, type }) => {
        results[ticker] = type === 'crypto'
          ? await this.getCryptoPrice(ticker)
          : await this.getStockPrice(ticker);
      })
    );
    return results;
  },
};
```

---

### Task C3: Investments endpoints com preços reais

**Files:**
- Modify: `src/backend/src/routes/investments.ts`
- Create: `src/backend/src/routes/marketData.ts`
- Modify: `src/backend/src/server.ts`

- [ ] **Adicionar endpoint de preços ao investmentsRouter:**

```typescript
// Em investments.ts — adicionar após o DELETE
investmentsRouter.get('/prices', authenticate, async (req, res, next) => {
  try {
    const userInvestments = await pool.query(
      'SELECT DISTINCT ticker, type FROM investments WHERE user_id = $1 AND ticker IS NOT NULL',
      [req.user!.id]
    );
    const prices = await marketDataService.batchPrices(userInvestments.rows);
    res.json({ status: 'success', data: prices });
  } catch (err) { next(err); }
});
```

- [ ] **Criar `src/backend/src/routes/marketData.ts`** para rotas públicas de cotações:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { marketDataService } from '../services/marketDataService.js';

export const marketDataRouter = Router();

marketDataRouter.get('/quote/:ticker', authenticate, async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { type = 'stock' } = req.query;
    const price = type === 'crypto'
      ? await marketDataService.getCryptoPrice(ticker)
      : await marketDataService.getStockPrice(ticker);
    if (!price) { res.status(404).json({ status: 'error', message: `Cotação não encontrada para ${ticker}` }); return; }
    res.json({ status: 'success', data: price });
  } catch (err) { next(err); }
});

marketDataRouter.get('/history/:ticker', authenticate, async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = (req.query.period as '7d' | '1m' | '3m' | '1y') || '1m';
    const history = await marketDataService.getHistoricalPrices(ticker, period);
    res.json({ status: 'success', data: history });
  } catch (err) { next(err); }
});
```

- [ ] **Montar em server.ts:**
```typescript
import { marketDataRouter } from './routes/marketData.js';
app.use('/api/market', marketDataRouter);
```

---

### Task C4: Frontend Investments com preços reais e gráficos

**Files:**
- Create: `src/frontend/src/hooks/useInvestments.ts`
- Modify: `src/frontend/src/pages/InvestmentsPage.tsx`
- Modify: `src/frontend/src/services/api.ts` (já tem investmentsApi e marketApi)

- [ ] **Adicionar ao `api.ts`** (se não existirem):

```typescript
export const investmentsApi = {
  list:    () => api.get('/investments'),
  create:  (data: Record<string, unknown>) => api.post('/investments', data),
  remove:  (id: string) => api.delete(`/investments/${id}`),
  prices:  () => api.get('/investments/prices'),
};

export const marketApi = {
  quote:   (ticker: string, type = 'stock') => api.get(`/market/quote/${ticker}`, { params: { type } }),
  history: (ticker: string, period = '1m') => api.get(`/market/history/${ticker}`, { params: { period } }),
};
```

- [ ] **Criar `src/frontend/src/hooks/useInvestments.ts`:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsApi, marketApi } from '../services/api';

export function useInvestments() {
  return useQuery({
    queryKey: ['investments'],
    queryFn: () => investmentsApi.list().then(r => r.data.data),
  });
}

export function useInvestmentPrices() {
  return useQuery({
    queryKey: ['investment-prices'],
    queryFn: () => investmentsApi.prices().then(r => r.data.data),
    refetchInterval: 60 * 1000, // actualizar a cada 60s
  });
}

export function useStockHistory(ticker: string, period: string) {
  return useQuery({
    queryKey: ['stock-history', ticker, period],
    queryFn: () => marketApi.history(ticker, period).then(r => r.data.data),
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Actualizar `InvestmentsPage.tsx`:**
  - Substituir `MOCK_INVESTMENTS` por `useInvestments()` + `useInvestmentPrices()`
  - Para cada investimento com ticker: mostrar preço real + variação de hoje
  - Adicionar gráfico histórico (LineChart Recharts) ao clicar num investimento
  - Adicionar botão "+ Adicionar Investimento" com modal de criação
  - Auto-refresh de preços a cada 60s (já no hook)

- [ ] **Commit:** `feat: add real-time market prices for stocks and crypto with historical charts`

---

## Chunk 4: Módulo D — Importação de Corretoras (CSV)

**Objetivo:** Permitir importar portfólio de DEGIRO, Trading212 e Interactive Brokers via CSV upload.

### Task D1: Backend CSV import service

**Files:**
- Create: `src/backend/src/services/brokerImportService.ts`
- Modify: `src/backend/package.json`

- [ ] **Instalar dependências:**
  ```bash
  cd src/backend && npm install multer csv-parse @types/multer
  ```

- [ ] **Criar `brokerImportService.ts`** com parsers para os formatos mais comuns em Portugal:

```typescript
import { parse } from 'csv-parse/sync';

export type BrokerFormat = 'degiro' | 'trading212' | 'ibkr' | 'generic';

export interface ImportedInvestment {
  name: string;
  ticker?: string;
  type: 'stock' | 'etf' | 'bond' | 'crypto' | 'certificado' | 'deposito';
  quantity: number;
  purchasePrice: number;
  purchaseDate?: string;
  currency: string;
}

function detectFormat(headers: string[]): BrokerFormat {
  const h = headers.map(s => s.toLowerCase());
  if (h.includes('product') && h.includes('isin') && h.includes('quantity')) return 'degiro';
  if (h.includes('ticker') && h.includes('average price') && h.includes('no. shares')) return 'trading212';
  if (h.includes('symbol') && h.includes('quantity') && h.includes('cost price')) return 'ibkr';
  return 'generic';
}

function parseDegiro(rows: Record<string, string>[]): ImportedInvestment[] {
  return rows.map(r => ({
    name: r['Product'] || r['Produto'] || '',
    ticker: r['Symbol'] || r['Símbolo'],
    type: 'stock' as const,
    quantity: parseFloat(r['Quantity'] || r['Quantidade'] || '0'),
    purchasePrice: parseFloat((r['Average Cost'] || r['Custo Médio'] || '0').replace(',', '.')),
    currency: r['Currency'] || r['Moeda'] || 'EUR',
  })).filter(inv => inv.quantity > 0);
}

function parseTrading212(rows: Record<string, string>[]): ImportedInvestment[] {
  return rows.map(r => ({
    name: r['Name'] || r['Instrument'] || '',
    ticker: r['Ticker'],
    type: 'stock' as const,
    quantity: parseFloat(r['No. Shares'] || '0'),
    purchasePrice: parseFloat((r['Average Price'] || '0').replace(',', '.')),
    currency: r['Currency'] || 'EUR',
  })).filter(inv => inv.quantity > 0);
}

function parseGeneric(rows: Record<string, string>[]): ImportedInvestment[] {
  return rows.map(r => ({
    name: r['name'] || r['Name'] || r['nome'] || '',
    ticker: r['ticker'] || r['Ticker'] || r['symbol'] || r['Symbol'],
    type: 'stock' as const,
    quantity: parseFloat(r['quantity'] || r['Quantity'] || r['quantidade'] || '0'),
    purchasePrice: parseFloat((r['price'] || r['Price'] || r['preco'] || '0').replace(',', '.')),
    currency: r['currency'] || r['Currency'] || 'EUR',
  })).filter(inv => inv.quantity > 0);
}

export function parseBrokerCSV(csvContent: string): ImportedInvestment[] {
  const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  if (rows.length === 0) return [];

  const format = detectFormat(Object.keys(rows[0]));
  switch (format) {
    case 'degiro': return parseDegiro(rows);
    case 'trading212': return parseTrading212(rows);
    default: return parseGeneric(rows);
  }
}
```

---

### Task D2: Import endpoint

**Files:**
- Modify: `src/backend/src/routes/investments.ts`

- [ ] **Adicionar POST /investments/import ao investmentsRouter:**

```typescript
import multer from 'multer';
import { parseBrokerCSV } from '../services/brokerImportService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

investmentsRouter.post('/import', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) { res.status(400).json({ status: 'error', message: 'Ficheiro CSV em falta' }); return; }

    const csvContent = req.file.buffer.toString('utf-8');
    const investments = parseBrokerCSV(csvContent);

    if (investments.length === 0) {
      res.status(400).json({ status: 'error', message: 'Nenhum investimento encontrado no CSV. Verifica o formato.' });
      return;
    }

    const userId = req.user!.id;
    let imported = 0;

    for (const inv of investments) {
      if (!inv.name || inv.quantity <= 0) continue;
      await pool.query(
        `INSERT INTO investments (user_id, name, ticker, type, quantity, purchase_price, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [userId, inv.name, inv.ticker || null, inv.type, inv.quantity, inv.purchasePrice, inv.currency]
      );
      imported++;
    }

    res.json({ status: 'success', data: { imported, total: investments.length } });
  } catch (err) { next(err); }
});
```

- [ ] **Frontend:** Adicionar botão "Importar CSV" na InvestmentsPage com `<input type="file" accept=".csv">` e chamada a `investmentsApi.import(formData)`

- [ ] **Commit:** `feat: add broker CSV import for DEGIRO, Trading212 and generic format`

---

## Chunk 5: Módulo E — Assistente Fiscal IA

**Objetivo:** Analisar automaticamente transações e investimentos do utilizador para identificar deduções IRS, sugerir optimizações fiscais e pré-preencher o simulador com dados reais.

### Task E1: Melhorar ML para detecção de deduções

**Files:**
- Modify: `src/ml-service/app/categorizer.py`
- Modify: `src/ml-service/app/main.py`

- [ ] **Adicionar detecção de dedutibilidade fiscal ao categorizador:**

```python
# Em categorizer.py — adicionar mapa de categorias dedutíveis
IRS_DEDUCTIBLE_MAP = {
    'saude': ('saude_dedutivel', 0.15, 1000),
    'health': ('saude_dedutivel', 0.15, 1000),
    'educacao': ('educacao_dedutivel', 0.30, 800),
    'education': ('educacao_dedutivel', 0.30, 800),
    'habitacao': ('habitacao_dedutivel', 0.15, 296),
    'housing': ('habitacao_dedutivel', 0.15, 296),
    'restauracao': ('encargos_gerais_dedutivel', 0.15, 250),
    'restaurants': ('encargos_gerais_dedutivel', 0.15, 250),
}

def categorize_with_deduction(description: str, amount: float, category: str):
    """Retorna categoria + info de dedutibilidade IRS."""
    deduction_info = IRS_DEDUCTIBLE_MAP.get(category)
    if deduction_info and amount > 0:
        deduction_type, rate, limit = deduction_info
        return {
            'category': category,
            'deduction_type': deduction_type,
            'estimated_deduction': min(abs(amount) * rate, limit),
            'rate': rate,
            'legal_limit': limit,
        }
    return {'category': category, 'deduction_type': 'nao_dedutivel', 'estimated_deduction': 0}
```

- [ ] **Actualizar `/categorize` em `main.py`** para retornar info de deduções e criar alerts no backend via callback

- [ ] **Commit:** `feat(ml): add IRS deduction detection to transaction categorizer`

---

### Task E2: IRS Optimizer Service (IA)

**Files:**
- Create: `src/backend/src/services/irsOptimizerService.ts`

- [ ] **Criar serviço de optimização fiscal com IA:**

```typescript
import OpenAI from 'openai';
import { pool } from '../config/database.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface OptimizationResult {
  summary: string;
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    estimatedSaving: number;
    priority: 'high' | 'medium' | 'low';
    actionable: string;
  }>;
  prefillData: {
    saude: number;
    educacao: number;
    habitacao: number;
    restauracao: number;
    ppr: number;
  };
  estimatedRefund: number;
}

export async function optimizeIRS(userId: string): Promise<OptimizationResult> {
  // 1. Recolher dados do utilizador
  const [fiscalProfile, deductionAlerts, transactionSummary] = await Promise.all([
    pool.query('SELECT * FROM fiscal_profile WHERE user_id = $1', [userId]),
    pool.query(
      `SELECT deduction_type, SUM(amount) as total, SUM(estimated_deduction) as estimated
       FROM deduction_alerts WHERE user_id = $1 AND fiscal_year = $2
       GROUP BY deduction_type`,
      [userId, new Date().getFullYear()]
    ),
    pool.query(
      `SELECT c.irs_deduction_category, SUM(ABS(t.amount)) as total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 AND c.irs_deduction_category IS NOT NULL
         AND EXTRACT(YEAR FROM t.transaction_date) = $2
       GROUP BY c.irs_deduction_category`,
      [userId, new Date().getFullYear()]
    ),
  ]);

  const profile = fiscalProfile.rows[0];
  const alerts = deductionAlerts.rows;
  const txSummary = transactionSummary.rows;

  // 2. Construir contexto para o modelo
  const contextForAI = {
    grossIncome: profile?.gross_income_annual || 0,
    maritalStatus: profile?.marital_status || 'single',
    dependents: profile?.dependents || 0,
    withholdingTax: profile?.withholding_tax || 0,
    pprContributions: profile?.ppr_contributions || 0,
    detectedDeductions: alerts.reduce((acc, a) => ({ ...acc, [a.deduction_type]: Number(a.total) }), {}),
    transactionsByCategory: txSummary.reduce((acc, r) => ({ ...acc, [r.irs_deduction_category]: Number(r.total) }), {}),
  };

  // 3. Calcular pré-preenchimento (sem IA)
  const prefillData = {
    saude: Number(txSummary.find(r => r.irs_deduction_category === 'saude')?.total || 0),
    educacao: Number(txSummary.find(r => r.irs_deduction_category === 'educacao')?.total || 0),
    habitacao: Number(txSummary.find(r => r.irs_deduction_category === 'habitacao')?.total || 0),
    restauracao: Number(txSummary.find(r => r.irs_deduction_category === 'restauracao')?.total || 0),
    ppr: profile?.ppr_contributions || 0,
  };

  // 4. Se não há OpenAI key, retornar recomendações baseadas em regras
  if (!process.env.OPENAI_API_KEY) {
    return buildRuleBasedRecommendations(contextForAI, prefillData);
  }

  // 5. Chamar OpenAI para recomendações personalizadas
  const prompt = `És um especialista em fiscalidade portuguesa. Com base nos dados financeiros do utilizador, gera recomendações de optimização fiscal para o IRS ${new Date().getFullYear()}.

Dados do utilizador:
${JSON.stringify(contextForAI, null, 2)}

Limites legais IRS 2024:
- Saúde: 15% das despesas, máx. €1.000
- Educação: 30% das despesas, máx. €800  
- Habitação: 15% das rendas, máx. €296
- Restauração: 15% das despesas, máx. €250
- PPR: 20% das entregas, máx. €400

Responde APENAS com JSON válido no formato:
{
  "summary": "resumo em 2 frases",
  "recommendations": [{"type":"string","title":"string","description":"string","estimatedSaving":number,"priority":"high|medium|low","actionable":"string"}],
  "estimatedRefund": number
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const aiResult = JSON.parse(completion.choices[0].message.content || '{}');
  return { ...aiResult, prefillData };
}

function buildRuleBasedRecommendations(context: Record<string, unknown>, prefillData: Record<string, number>): OptimizationResult {
  const recommendations = [];
  
  const saude = prefillData.saude as number;
  if (saude > 0 && saude < 6667) {
    recommendations.push({
      type: 'saude', title: 'Maximizar deduções de saúde',
      description: `Tens €${saude.toFixed(2)} em despesas de saúde. Para atingir o limite de €1.000 de dedução precisas de €${(6667 - saude).toFixed(2)} mais em despesas.`,
      estimatedSaving: Math.min(saude * 0.15, 1000),
      priority: 'high' as const,
      actionable: 'Guarda todos os recibos de saúde e consultas.',
    });
  }

  return {
    summary: 'Análise baseada nas tuas transações do ano fiscal.',
    recommendations,
    prefillData,
    estimatedRefund: 0,
  };
}
```

- [ ] **Instalar OpenAI no backend:**
  ```bash
  cd src/backend && npm install openai
  ```

---

### Task E3: IRS Optimizer endpoint + Frontend panel

**Files:**
- Modify: `src/backend/src/routes/irs.ts`
- Modify: `src/frontend/src/pages/IRSSimulatorPage.tsx`

- [ ] **Adicionar endpoint POST /irs/optimize ao irsRouter:**

```typescript
irsRouter.post('/optimize', authenticate, async (req, res, next) => {
  try {
    const result = await optimizeIRS(req.user!.id);
    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
});
```

- [ ] **Actualizar `IRSSimulatorPage.tsx`:**
  - Adicionar painel lateral "Assistente Fiscal IA"
  - Botão "Analisar as minhas finanças" → chama `irsApi.optimize()`
  - Mostrar recomendações com badges de prioridade (high=vermelho, medium=amarelo, low=verde)
  - Botão "Pré-preencher formulário" → preenche os campos de deduções com `prefillData`
  - Loading state durante análise IA

- [ ] **Commit:** `feat: add AI-powered IRS optimizer with pre-fill from transaction data`

---

## Resumo de Ficheiros por Módulo

| Módulo | Ficheiros Novos | Ficheiros Modificados |
|--------|----------------|----------------------|
| A | `routes/goals.ts`, `routes/fiscalProfile.ts`, `hooks/use*.ts` (6x) | `routes/transactions.ts`, `routes/budgets.ts`, `routes/categories.ts`, `routes/irs.ts`, `server.ts`, `database/init.sql`, `pages/*.tsx` (5x), `README.md`, `.env.example` |
| B | `services/saltEdgeService.ts` | `routes/accounts.ts` |
| C | `services/marketDataService.ts`, `routes/marketData.ts` | `routes/investments.ts`, `services/api.ts`, `pages/InvestmentsPage.tsx` |
| D | `services/brokerImportService.ts` | `routes/investments.ts` |
| E | `services/irsOptimizerService.ts` | `routes/irs.ts`, `ml-service/app/categorizer.py`, `pages/IRSSimulatorPage.tsx` |

---

## Verificação End-to-End

```bash
# 1. Arrancar todos os serviços
docker compose up --build

# 2. Verificar backend health
curl http://localhost:4000/api/health

# 3. Registar utilizador de teste
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Password123!"}'

# 4. Login e obter token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Password123!"}' | jq -r '.data.accessToken')

# 5. Testar endpoints (Módulo A)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/categories
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/transactions
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/budgets
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/goals
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/investments
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/irs/brackets

# 6. Testar preços reais (Módulo C — requer backend running)
curl -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/market/quote/GALP.LS"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/market/quote/BTC?type=crypto"

# 7. Testar simulação IRS
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  http://localhost:4000/api/irs/simulate \
  -d '{"grossIncome":28000,"maritalStatus":"single","dependents":0,"socialSecurityContributions":3080,"withholdingTax":4200,"deductions":{"saude":500,"educacao":1200}}'

# 8. Frontend — abrir http://localhost:3000 e verificar:
# - Login funcional
# - Dashboard com dados reais
# - Transações carregam da API
# - Orçamentos CRUD completo
# - Metas CRUD completo
# - Investimentos com preços actualizados
# - Simulador IRS com análise IA
```

---

## Notas de Implementação

1. **Ordem obrigatória**: Seguir A → B → C → D → E. Os módulos posteriores dependem dos anteriores.
2. **Salt Edge**: Necessita de conta gratuita em https://www.saltedge.com (Partner Portal). Registo académico disponível.
3. **Yahoo Finance**: Não requer API key. `yahoo-finance2` usa scraping oficial. Pode ter rate limits temporários.
4. **CoinGecko**: API pública gratuita, limite de 10-30 req/min no free tier. Suficiente com cache Redis.
5. **OpenAI**: Módulo E funciona sem OpenAI (modo regras). Com `OPENAI_API_KEY` activa recomendações IA. Custo estimado: < €1/mês com gpt-4o-mini.
6. **Demo mode**: Remover bypass `'demo-token'` em `PrivateRoute.tsx` antes de deployment em produção.
7. **Banco Portuguese específicos para teste Salt Edge**: CGD, Millennium BCP, Santander PT, BPI, Novobanco — todos disponíveis via Salt Edge PSD2.
