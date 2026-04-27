import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '../services/api';
import { toast } from '../store/toastStore';

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento criado');
    },
    onError: () => toast.error('Erro ao criar orçamento'),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      budgetsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento atualizado');
    },
    onError: () => toast.error('Erro ao atualizar orçamento'),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento apagado');
    },
    onError: () => toast.error('Erro ao apagar orçamento'),
  });
}
