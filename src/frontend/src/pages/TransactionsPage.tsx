import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Download, ChevronDown, X, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useTransactions, useSyncTransactions, type TransactionFilters } from '../hooks/useTransactions';

const eur = (v: number | string) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Math.abs(Number(v)));

const TYPE_OPTIONS = [
  { value: '',        label: 'Tipo' },
  { value: 'expense', label: 'Despesas' },
  { value: 'income',  label: 'Receitas' },
];

export function TransactionsPage() {
  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [offset, setOffset]               = useState(0);
  const PER_PAGE = 20;

  const filters: TransactionFilters = {
    ...(search     ? { search }                              : {}),
    ...(typeFilter ? { type: typeFilter as 'income' | 'expense' } : {}),
    limit: PER_PAGE,
    offset,
  };

  const { data, isLoading, isFetching } = useTransactions(filters);
  const syncMutation = useSyncTransactions();

  const transactions = data?.data ?? [];
  const meta         = data?.meta;
  const hasMore      = meta ? (offset + PER_PAGE) < meta.total : false;
  const hasFilters   = search || typeFilter;

  const totalIncome   = transactions.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  function clearFilters() {
    setSearch('');
    setTypeFilter('');
    setOffset(0);
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink-900)]">Transações</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-300)' }}>
            {meta ? `${meta.total} transações encontradas` : '…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
            style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}
          >
            <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
            {syncMutation.isPending ? 'A sincronizar…' : 'Sincronizar'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </motion.div>

      {/* Resumo */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-xs text-green-700 font-medium mb-1">Total Receitas</p>
          <p className="text-xl font-bold text-green-700">+{eur(totalIncome)}</p>
        </div>
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-xs text-red-600 font-medium mb-1">Total Despesas</p>
          <p className="text-xl font-bold text-red-600">-{eur(totalExpenses)}</p>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-subtle)' }}>
          <Search size={15} className="text-[var(--gold)]/50 shrink-0" />
          <input
            type="text"
            placeholder="Pesquisar transações..."
            value={search}
            onChange={e => { setSearch(e.target.value); setOffset(0); }}
            className="flex-1 bg-transparent text-sm text-[var(--ink-900)] placeholder-[var(--ink-500)]/40 outline-none"
          />
          {search && (
            <button onClick={() => { setSearch(''); setOffset(0); }} className="text-[var(--ink-500)]/40 hover:text-[var(--ink-500)]">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-[var(--ink-500)]/40" />
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setOffset(0); }}
            className="text-xs px-3 py-1.5 rounded-xl border outline-none cursor-pointer font-medium"
            style={{ background: typeFilter ? 'var(--gold-subtle)' : 'rgba(0,0,0,0.03)', borderColor: typeFilter ? 'var(--gold-border)' : 'rgba(0,0,0,0.08)', color: typeFilter ? 'var(--gold)' : 'var(--ink-500)' }}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters}
              className="text-xs px-3 py-1.5 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-colors">
              Limpar filtros
            </button>
          )}
        </div>
      </motion.div>

      {/* Lista */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

        {isLoading ? (
          <div className="divide-y divide-black/[0.04]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: 'var(--border)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded w-48" style={{ background: 'var(--border)' }} />
                  <div className="h-2.5 rounded w-32" style={{ background: 'var(--border)' }} />
                </div>
                <div className="h-4 w-20 rounded" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm font-medium text-[var(--ink-900)]">Nenhuma transação encontrada</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-300)' }}>
              {hasFilters ? 'Tenta ajustar os filtros' : 'Sincroniza as tuas contas para importar transações'}
            </p>
          </div>
        ) : (
          <div className={`divide-y divide-black/[0.04] ${isFetching ? 'opacity-60' : ''} transition-opacity`}>
            <AnimatePresence>
              {transactions.map((tx, i) => {
                const isExpense = Number(tx.amount) < 0;
                return (
                  <motion.div key={tx.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-black/[0.015] transition-colors">

                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: tx.category_color ? `${tx.category_color}15` : 'var(--ink-50)' }}>
                      {tx.category_icon ?? '💳'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--ink-900)] truncate">{tx.description}</p>
                        {tx.is_recurring && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{ background: 'var(--gold-subtle)', color: 'var(--gold)' }}>
                            Recorrente
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-300)' }}>
                        {format(parseISO(tx.transaction_date), "d 'de' MMMM", { locale: pt })}
                        {tx.bank_name && <> · {tx.bank_name.split(' ')[0]}</>}
                      </p>
                    </div>

                    {tx.category_name && (
                      <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg shrink-0"
                        style={{ background: `${tx.category_color}12`, color: tx.category_color ?? 'var(--ink-300)' }}>
                        {tx.category_name}
                      </div>
                    )}

                    {tx.ml_confidence && (
                      <div className="hidden lg:block text-right shrink-0">
                        <div className="flex items-center gap-1 justify-end">
                          <div className="w-12 h-1.5 rounded-full overflow-hidden bg-black/[0.06]">
                            <div className="h-full rounded-full"
                              style={{ width: `${Number(tx.ml_confidence) * 100}%`, background: Number(tx.ml_confidence) > 0.9 ? '#22c55e' : '#f59e0b' }} />
                          </div>
                          <span className="text-[10px]" style={{ color: 'var(--ink-300)' }}>
                            {Math.round(Number(tx.ml_confidence) * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>ML</p>
                      </div>
                    )}

                    <p className={`text-base font-bold shrink-0 tabular-nums ${isExpense ? 'text-[var(--ink-900)]' : 'text-green-600'}`}>
                      {isExpense ? '-' : '+'}{eur(tx.amount)}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {hasMore && (
          <div className="p-4 border-t border-black/[0.04] text-center">
            <button onClick={() => setOffset(o => o + PER_PAGE)}
              className="flex items-center gap-2 mx-auto text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: 'var(--gold)' }}>
              <ChevronDown size={15} />
              Carregar mais ({meta!.total - offset - PER_PAGE} restantes)
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
