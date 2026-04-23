import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { MOCK_TRANSACTIONS, monthIncome, monthExpenses, monthSavings } from '../data/mock';
import type { Transaction, TransactionSummary, TransactionListMeta } from '../types/transactions';

export interface TransactionFilters {
  account_id?: string;
  category_id?: string;
  type?: 'income' | 'expense';
  search?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

interface TransactionListResult {
  data: Transaction[];
  meta: TransactionListMeta;
}

function buildDemoTransactions(filters: TransactionFilters): TransactionListResult {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  let txs = MOCK_TRANSACTIONS.map(t => ({
    id: t.id,
    bank_account_id: t.accountId,
    category_id: t.categoryId,
    description: t.description,
    amount: t.isExpense ? String(-t.amount) : String(t.amount),
    currency: 'EUR',
    transaction_date: t.date,
    is_recurring: t.isRecurring,
    ml_confidence: String(t.mlConfidence),
    ml_categorized: true,
    notes: null,
    category_name: null,
    category_icon: null,
    category_color: null,
    bank_name: 'Demo',
  } as Transaction));

  if (filters.type === 'expense') txs = txs.filter(t => Number(t.amount) < 0);
  if (filters.type === 'income')  txs = txs.filter(t => Number(t.amount) > 0);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    txs = txs.filter(t => t.description.toLowerCase().includes(q));
  }

  return {
    data: txs.slice(offset, offset + limit),
    meta: { total: txs.length, limit, offset },
  };
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<TransactionListResult>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      if (useAuthStore.getState().accessToken === 'demo-token') return buildDemoTransactions(filters);
      const { data } = await transactionsApi.list(filters as Record<string, string | number>);
      return { data: data.data as Transaction[], meta: data.meta as TransactionListMeta };
    },
  });
}

export function useTransactionSummary(month?: string) {
  return useQuery<TransactionSummary>({
    queryKey: ['transactions', 'summary', month ?? 'current'],
    queryFn: async () => {
      if (useAuthStore.getState().accessToken === 'demo-token') return {
        month: new Date().toISOString().slice(0, 7),
        income: monthIncome,
        expenses: monthExpenses,
        savings: monthSavings,
        transaction_count: MOCK_TRANSACTIONS.length,
      } as TransactionSummary;
      const { data } = await transactionsApi.summary(month);
      return data.data as TransactionSummary;
    },
  });
}

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      transactionsApi.updateCategory(id, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useSyncTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      useAuthStore.getState().accessToken === 'demo-token'
        ? Promise.resolve(undefined as never)
        : transactionsApi.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
