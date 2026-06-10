import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Org } from '@/api/auth';

interface AuthState {
  user: User | null;
  org: Org | null;
  setAuth: (user: User, org: Org) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      org: null,
      setAuth: (user, org) => set({ user, org }),
      clearAuth: () => set({ user: null, org: null }),
    }),
    {
      name: 'career-ops-auth',
    },
  ),
);
