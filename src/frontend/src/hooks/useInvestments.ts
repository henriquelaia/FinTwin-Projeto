import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsApi } from '../services/api';
import { toast } from '../store/toastStore';

export function useInvestments() {
  return useQuery({
    queryKey: ['investments'],
    queryFn: () => investmentsApi.list().then(r => r.data.data),
  });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: investmentsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investimento adicionado');
    },
    onError: () => toast.error('Erro ao adicionar investimento'),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: investmentsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investimento removido');
    },
    onError: () => toast.error('Erro ao remover investimento'),
  });
}
