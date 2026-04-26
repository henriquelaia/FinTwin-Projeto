import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsApi } from '../services/api';

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: investmentsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
}
