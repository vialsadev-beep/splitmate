import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import { useAuthStore } from '../store/auth.store'
import { queryClient } from '@/shared/lib/query-client'
import type { RegisterInput, LoginInput, UpdateProfileInput, ChangePasswordInput, AuthResponse, UserResponse } from '@splitmate/shared'

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterInput) => {
      const res = await apiClient.post<{ data: AuthResponse }>('/auth/register', data)
      return res.data.data
    },
    onSuccess: (data) => {
      useAuthStore.getState().setAuth(data.user, data.accessToken)
    },
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await apiClient.post<{ data: AuthResponse }>('/auth/login', data)
      return res.data.data
    },
    onSuccess: (data) => {
      useAuthStore.getState().setAuth(data.user, data.accessToken)
    },
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout')
    },
    onSuccess: () => {
      useAuthStore.getState().logout()
      queryClient.clear()
    },
  })
}

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserResponse }>('/auth/me')
      return res.data.data
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (data: UpdateProfileInput) => {
      const res = await apiClient.patch<{ data: UserResponse }>('/auth/me', data)
      return res.data.data
    },
    onSuccess: (user) => {
      const token = useAuthStore.getState().accessToken ?? ''
      useAuthStore.getState().setAuth(user, token)
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useUploadUserAvatar() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('avatar', file)
      const res = await apiClient.post<{ data: UserResponse }>('/auth/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data.data
    },
    onSuccess: (user) => {
      const token = useAuthStore.getState().accessToken ?? ''
      useAuthStore.getState().setAuth(user, token)
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordInput) => {
      await apiClient.post('/auth/me/password', data)
    },
  })
}
