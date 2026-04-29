import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../services/api';
import type { BankAccount } from '../types/accounts';
import { toast } from '../store/toastStore';

export function useAccounts() {
  return useQuery<BankAccount[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data } = await accountsApi.list();
      return data.data as BankAccount[];
    },
  });
}

export function useConnectBank() {
  return useMutation({
    mutationFn: async (returnTo?: string) => {
      const { data } = await accountsApi.connect(returnTo);
      return data.data as { connect_url: string };
    },
    onSuccess: ({ connect_url }) => {
      window.open(connect_url, '_blank', 'noopener,noreferrer');
    },
  });
}

export function useDisconnectBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta desligada');
    },
    onError: () => toast.error('Erro ao desligar conta'),
  });
}

export function useSyncAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.balance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta sincronizada');
    },
    onError: () => toast.error('Erro na sincronização'),
  });
}

export function useSyncAllAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => accountsApi.syncAll(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      const synced = (res.data as { data?: { synced?: number } })?.data?.synced ?? 0;
      toast.success(synced > 0 ? `${synced} conta(s) sincronizadas` : 'Já tudo atualizado');
    },
    onError: () => toast.error('Erro na sincronização'),
  });
}
