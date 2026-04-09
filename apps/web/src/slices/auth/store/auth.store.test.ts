import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'

const mockUser = {
  id: 'user-1',
  name: 'Ana García',
  email: 'ana@example.com',
  avatarUrl: null,
  locale: 'es',
  theme: 'light' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false })
  })

  it('estado inicial: no autenticado', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('setAuth: guarda usuario y token, marca autenticado', () => {
    useAuthStore.getState().setAuth(mockUser, 'token-abc')
    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.accessToken).toBe('token-abc')
    expect(state.isAuthenticated).toBe(true)
  })

  it('setAccessToken: actualiza solo el token', () => {
    useAuthStore.getState().setAuth(mockUser, 'token-old')
    useAuthStore.getState().setAccessToken('token-new')
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('token-new')
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
  })

  it('logout: limpia todo el estado', () => {
    useAuthStore.getState().setAuth(mockUser, 'token-abc')
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('logout desde estado inicial no lanza error', () => {
    expect(() => useAuthStore.getState().logout()).not.toThrow()
  })

  it('múltiples setAuth sobrescriben el estado anterior', () => {
    const user2 = { ...mockUser, id: 'user-2', email: 'bob@example.com' }
    useAuthStore.getState().setAuth(mockUser, 'token-1')
    useAuthStore.getState().setAuth(user2, 'token-2')
    const state = useAuthStore.getState()
    expect(state.user?.id).toBe('user-2')
    expect(state.accessToken).toBe('token-2')
  })
})
