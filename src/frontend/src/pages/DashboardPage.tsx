import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Label,
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank,
  ArrowUpRight, ArrowDownRight, Zap,
  BarChart2, ChevronRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  MONTHLY_TREND, SPENDING_BY_CATEGORY,
  totalPortfolioValue, totalPortfolioReturn,
  MOCK_BUDGETS, MOCK_GOALS,
} from '../data/mock';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions, useTransactionSummary } from '../hooks/useTransactions';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] },
});

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
} as const;

const eur = (v: number | string) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Math.abs(Number(v)));

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
      <p className="font-semibold mb-1.5" style={{ color: 'var(--ink-900)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'var(--ink-500)' }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--ink-900)' }}>{eur(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

const BANK_COLORS: Record<string, string> = {
  'Caixa Geral de Depósitos': '#003B71',
  'Millennium BCP': '#E31837',
  'BPI': '#004C97',
  'Santander': '#EC0000',
  'NovoBanco': '#FF6B00',
  'Montepio': '#006838',
};

function getBankColor(name: string): string {
  for (const [key, color] of Object.entries(BANK_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#6B7280';
}

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: accounts = [] }    = useAccounts();
  const { data: summary }          = useTransactionSummary();
  const { data: recentTxsData }    = useTransactions({ limit: 5 });

  const recentTxs    = recentTxsData?.data ?? [];
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const monthIncome  = summary?.income   ?? 0;
  const monthExpenses = summary?.expenses ?? 0;
  const monthSavings = summary?.savings  ?? 0;

  const savingsRate = monthIncome > 0
    ? ((monthSavings / monthIncome) * 100).toFixed(0)
    : '0';

  const totalSpendingThisMonth = SPENDING_BY_CATEGORY.reduce((s, c) => s + c.value, 0);

  const insights: { icon: string; text: string; color: string; route: string }[] = [];

  const overBudget = MOCK_BUDGETS.filter((b: { spent: number; limit: number; name: string }) => (b.spent / b.limit) > 0.8);
  if (overBudget.length > 0) {
    insights.push({
      icon: '⚠️',
      text: `${overBudget[0].name}: ${Math.round((overBudget[0].spent / overBudget[0].limit) * 100)}% do orçamento`,
      color: '#F59E0B',
      route: '/budgets',
    });
  }

  const nearGoal = MOCK_GOALS.find((g: { currentAmount: number; targetAmount: number; name: string }) =>
    (g.currentAmount / g.targetAmount) >= 0.85 && g.currentAmount < g.targetAmount);
  if (nearGoal) {
    insights.push({
      icon: '🎯',
      text: `${nearGoal.name}: ${Math.round((nearGoal.currentAmount / nearGoal.targetAmount) * 100)}% concluído`,
      color: '#22C55E',
      route: '/goals',
    });
  }

  insights.push({
    icon: '💡',
    text: `Taxa de poupança este mês: ${savingsRate}%`,
    color: 'var(--gold)',
    route: '/transactions',
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>Dashboard</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-400)' }}>
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: pt })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
          <Zap size={11} />
          Dados atualizados
        </div>
      </motion.div>

      {/* Insights */}
      <motion.div {...fadeUp(0.04)} className="flex gap-2 flex-wrap">
        {insights.map((ins, i) => (
          <button key={i} onClick={() => navigate(ins.route)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-700)' }}>
            <span>{ins.icon}</span>
            <span>{ins.text}</span>
            <ChevronRight size={11} style={{ color: 'var(--ink-300)' }} />
          </button>
        ))}
      </motion.div>

      {/* Hero + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

        <motion.div {...fadeUp(0.08)} className="lg:col-span-1 rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: 'var(--ink-900)', minHeight: 140 }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Saldo Total
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Wallet size={13} style={{ color: 'var(--gold)' }} />
            </div>
          </div>
          <div>
            <p className="text-[26px] font-black leading-none text-white tabular-nums">{eur(totalBalance)}</p>
            <p className="text-xs mt-2 flex items-center gap-1 font-medium" style={{ color: 'rgba(255,255,255,0.40)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              {accounts.length} {accounts.length === 1 ? 'conta ligada' : 'contas ligadas'}
            </p>
          </div>
        </motion.div>

        {[
          {
            label: 'Receitas', value: eur(monthIncome), sub: 'este mês',
            positive: true, icon: <TrendingUp size={14} />, delay: 0.12,
          },
          {
            label: 'Despesas', value: eur(monthExpenses), sub: 'este mês',
            positive: false, icon: <TrendingDown size={14} />, delay: 0.16,
          },
          {
            label: 'Taxa Poupança', value: `${savingsRate}%`, sub: `${eur(monthSavings)} guardados`,
            positive: monthSavings >= 0, icon: <PiggyBank size={14} />, delay: 0.20,
          },
        ].map(s => (
          <motion.div key={s.label} {...fadeUp(s.delay)} className="rounded-2xl p-5 flex flex-col gap-4" style={card}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-300)' }}>
                {s.label}
              </span>
              <span style={{ color: 'var(--ink-300)' }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-[20px] font-bold leading-none tabular-nums" style={{ color: 'var(--ink-900)' }}>
                {s.value}
              </p>
              <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${s.positive ? 'text-green-600' : 'text-red-500'}`}>
                {s.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {s.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        <motion.div {...fadeUp(0.24)} className="lg:col-span-2 rounded-2xl p-5" style={card}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-300)' }}>
                Últimos 6 meses
              </p>
              <h2 className="text-sm font-bold mt-0.5" style={{ color: 'var(--ink-900)' }}>Receitas vs Despesas</h2>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--ink-400)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--gold)' }} />
                Receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                Despesas
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_TREND} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A227" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-300)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-300)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="income" name="Receitas" stroke="#C9A227" strokeWidth={2} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4, fill: '#C9A227' }} />
              <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#f87171" strokeWidth={2} fill="url(#expGrad)" dot={false} activeDot={{ r: 4, fill: '#f87171' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div {...fadeUp(0.28)} className="rounded-2xl p-5" style={card}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--ink-300)' }}>
            Este mês
          </p>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ink-900)' }}>Por Categoria</h2>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={SPENDING_BY_CATEGORY} cx="50%" cy="50%"
                innerRadius={38} outerRadius={56} paddingAngle={2} dataKey="value" strokeWidth={0}>
                {SPENDING_BY_CATEGORY.map((entry: { color: string }, i: number) => <Cell key={i} fill={entry.color} />)}
                <Label value={eur(totalSpendingThisMonth)} position="center"
                  style={{ fontSize: 11, fontWeight: 700, fill: 'var(--ink-900)' }} />
              </Pie>
              <Tooltip formatter={(v: number) => eur(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {SPENDING_BY_CATEGORY.slice(0, 5).map((cat: { name: string; color: string; value: number }) => (
              <div key={cat.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-500)' }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} />
                  {cat.name}
                </span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-900)' }}>{eur(cat.value)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Transações + Contas + Investimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Transações recentes — dados reais */}
        <motion.div {...fadeUp(0.32)} className="lg:col-span-2 rounded-2xl overflow-hidden" style={card}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>Transações Recentes</h2>
            <button onClick={() => navigate('/transactions')} className="text-xs font-medium hover:underline"
              style={{ color: 'var(--gold)' }}>
              Ver todas
            </button>
          </div>
          <div>
            {recentTxs.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm" style={{ color: 'var(--ink-300)' }}>Sem transações recentes</p>
                <button onClick={() => navigate('/transactions')} className="text-xs mt-2 underline" style={{ color: 'var(--gold)' }}>
                  Sincronizar agora
                </button>
              </div>
            ) : recentTxs.map((tx, i) => {
              const isExpense = Number(tx.amount) < 0;
              return (
                <motion.div key={tx.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.36 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 px-5 py-3 transition-colors cursor-default"
                  style={{ borderBottom: i < recentTxs.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--ink-50)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: tx.category_color ? `${tx.category_color}18` : 'var(--ink-50)' }}>
                    {tx.category_icon ?? '💳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink-900)' }}>
                      {tx.description}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
                      {format(parseISO(tx.transaction_date), "d MMM", { locale: pt })}
                      {tx.is_recurring && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
                          Recorrente
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm font-bold shrink-0 tabular-nums"
                    style={{ color: isExpense ? 'var(--ink-900)' : '#16a34a' }}>
                    {isExpense ? '−' : '+'}{eur(tx.amount)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Coluna direita */}
        <div className="flex flex-col gap-3">

          {/* Contas — dados reais */}
          <motion.div {...fadeUp(0.36)} className="rounded-2xl overflow-hidden" style={card}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>Contas</h2>
              <button onClick={() => navigate('/accounts')} className="text-xs font-medium hover:underline"
                style={{ color: 'var(--gold)' }}>
                Gerir
              </button>
            </div>
            {accounts.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs" style={{ color: 'var(--ink-300)' }}>Nenhuma conta ligada</p>
                <button onClick={() => navigate('/accounts')} className="text-xs mt-1 underline" style={{ color: 'var(--gold)' }}>
                  Ligar banco
                </button>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 space-y-2.5">
                  {accounts.map((acc, i) => {
                    const color = getBankColor(acc.bank_name);
                    const logo = acc.bank_name.split(' ').map((w: string) => w[0]).slice(0, 3).join('').toUpperCase();
                    return (
                      <motion.div key={acc.id}
                        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.40 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0"
                          style={{ background: color }}>
                          {logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--ink-900)' }}>
                            {acc.account_name ?? acc.bank_name}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>{acc.bank_name.split(' ')[0]}</p>
                        </div>
                        <p className="text-xs font-bold shrink-0 tabular-nums" style={{ color: 'var(--ink-900)' }}>
                          {eur(acc.balance)}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
                {totalBalance > 0 && (
                  <div className="px-4 pb-3">
                    <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                      {accounts.map(acc => (
                        <div key={acc.id}
                          style={{ width: `${(Number(acc.balance) / totalBalance) * 100}%`, background: getBankColor(acc.bank_name) }}
                          className="rounded-full" />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Investimentos */}
          <motion.div {...fadeUp(0.44)} className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
            style={card}
            onClick={() => navigate('/investments')}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--ink-50)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface)')}
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gold-subtle)' }}>
                  <BarChart2 size={14} style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--ink-900)' }}>Investimentos</p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>Carteira total</p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--ink-300)' }} />
            </div>
            <div className="px-4 pb-3">
              <p className="text-[18px] font-black tabular-nums" style={{ color: 'var(--ink-900)' }}>
                {eur(totalPortfolioValue)}
              </p>
              <p className={`text-xs mt-0.5 flex items-center gap-1 font-semibold ${totalPortfolioReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {totalPortfolioReturn >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {totalPortfolioReturn >= 0 ? '+' : ''}{eur(totalPortfolioReturn)} total
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
