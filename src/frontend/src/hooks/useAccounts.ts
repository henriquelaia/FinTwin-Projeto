import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '../services/api';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then(r => r.data.data ?? []),
    retry: false,
  });
}
