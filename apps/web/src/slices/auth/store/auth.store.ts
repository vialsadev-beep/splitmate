import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserResponse } from '@splitmate/shared'

interface AuthState {
  user: UserResponse | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: UserResponse, accessToken: string) => void
  setAccessToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      // Solo persistir el user, el accessToken vive en memoria
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isAuthenticated = state.user !== null
      },
    },
  ),
)
