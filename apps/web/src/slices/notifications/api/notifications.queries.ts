import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'

export interface Notification {
  id: string
  type: 'EXPENSE_ADDED' | 'PAYMENT_RECEIVED' | 'DEBT_LIMIT' | 'GROUP_INVITE' | 'BUDGET_ALERT'
  title: string
  body: string
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

interface NotificationsResponse {
  data: Notification[]
  meta: { total: number; page: number; limit: number; unreadCount: number }
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: Record<string, string>) => ['notifications', 'list', params] as const,
  unread: () => ['notifications', 'unread'] as const,
}

export function useNotifications(params?: { read?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list(params as Record<string, string>),
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '50' })
      if (params?.read !== undefined) qs.set('read', String(params.read))
      const res = await apiClient.get<NotificationsResponse>(`/notifications?${qs}`)
      return res.data
    },
    staleTime: 15_000,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: async () => {
      const res = await apiClient.get<NotificationsResponse>('/notifications?read=false&limit=1')
      return res.data.meta.unreadCount
    },
    staleTime: 30_000,
    refetchInterval: 60_000, // poll cada minuto
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (notificationIds: string[] | 'all') => {
      await apiClient.post('/notifications/read', { notificationIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
