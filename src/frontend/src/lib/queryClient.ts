/**
 * queryClient — Gold Lock
 * =======================
 * Configuração global do React Query.
 * staleTime: 30s — evita refetch desnecessário entre navegações
 * retry: 1 — não repetir infinitamente em caso de 401/404
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,   // 30 segundos
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
