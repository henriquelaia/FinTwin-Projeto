/**
 * authStore — Gold Lock
 * =====================
 * Estado global de autenticação via Zustand com persistência em localStorage.
 * Fonte de verdade para user + tokens em toda a aplicação.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  totp_enabled: boolean;
  created_at: string;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  setUser: (user: User | null) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setUser: (user) => set({ user }),

      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'goldlock-auth', // chave no localStorage
      // Persistir user e accessToken — refreshToken NÃO é persistido (risco XSS)
      // O refresh token é mantido apenas em memória; perde-se ao fechar o tab
      partialize: (state) => ({
        user:        state.user,
        accessToken: state.accessToken,
      }),
    }
  )
);
