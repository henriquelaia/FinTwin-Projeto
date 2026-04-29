import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { MOCK_INVESTMENTS } from '../data/mock';

export function useInvestments() {
  return useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      if (useAuthStore.getState().accessToken === 'demo-token') {
        return MOCK_INVESTMENTS.map(inv => ({
          id: inv.id,
          name: inv.name,
          ticker: inv.ticker,
          type: inv.type,
          quantity: inv.quantity,
          purchase_price: inv.purchasePrice,
          current_price: inv.currentPrice,
          currency: inv.currency,
          risk_level: inv.riskLevel,
          annual_rate: inv.annualRate,
          institution: inv.institution,
        }));
      }
      return investmentsApi.list().then(r => r.data.data);
    },
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
