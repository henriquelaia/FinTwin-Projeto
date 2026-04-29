import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../services/api';
import { toast } from '../store/toastStore';

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta criada');
    },
    onError: () => toast.error('Erro ao criar meta'),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      goalsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta atualizada');
    },
    onError: () => toast.error('Erro ao atualizar meta'),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta apagada');
    },
    onError: () => toast.error('Erro ao apagar meta'),
  });
}

export function useDepositGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      goalsApi.deposit(id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Depósito registado');
    },
    onError: () => toast.error('Erro ao registar depósito'),
  });
}
