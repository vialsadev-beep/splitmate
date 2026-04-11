import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseResponse, ReceiptItem } from '@splitmate/shared'

interface PaginatedExpenses {
  data: ExpenseResponse[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const expenseKeys = {
  list: (groupId: string, params?: Record<string, string>) => ['expenses', groupId, params] as const,
  detail: (groupId: string, expenseId: string) => ['expenses', groupId, expenseId] as const,
}

export function useExpenses(groupId: string, params?: { search?: string; categoryId?: string; payerId?: string }) {
  return useQuery({
    queryKey: expenseKeys.list(groupId, params as Record<string, string>),
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '50' })
      if (params?.search) qs.set('search', params.search)
      if (params?.categoryId) qs.set('categoryId', params.categoryId)
      if (params?.payerId) qs.set('payerId', params.payerId)
      const res = await apiClient.get<PaginatedExpenses>(`/groups/${groupId}/expenses?${qs}`)
      return res.data
    },
    enabled: !!groupId,
  })
}

export function useExpense(groupId: string, expenseId: string) {
  return useQuery({
    queryKey: expenseKeys.detail(groupId, expenseId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: ExpenseResponse }>(`/groups/${groupId}/expenses/${expenseId}`)
      return res.data.data
    },
    enabled: !!groupId && !!expenseId,
  })
}

export function useCreateExpense(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateExpenseInput) => {
      const res = await apiClient.post<{ data: ExpenseResponse }>(
        `/groups/${groupId}/expenses`,
        data,
      )
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      qc.invalidateQueries({ queryKey: ['balances', groupId] })
      qc.invalidateQueries({ queryKey: ['activity', groupId] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useUpdateExpense(groupId: string, expenseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateExpenseInput) => {
      const res = await apiClient.patch<{ data: ExpenseResponse }>(
        `/groups/${groupId}/expenses/${expenseId}`,
        data,
      )
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      qc.invalidateQueries({ queryKey: ['balances', groupId] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useDeleteExpense(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (expenseId: string) => {
      await apiClient.delete(`/groups/${groupId}/expenses/${expenseId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      qc.invalidateQueries({ queryKey: ['balances', groupId] })
      qc.invalidateQueries({ queryKey: ['activity', groupId] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useUpdateReceiptItems(groupId: string, expenseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: ReceiptItem[]) => {
      const res = await apiClient.patch<{ data: ExpenseResponse }>(
        `/groups/${groupId}/expenses/${expenseId}/receipt-items`,
        { items },
      )
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      qc.invalidateQueries({ queryKey: ['balances', groupId] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useUploadReceipt(groupId: string, expenseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('receipt', file)
      const res = await apiClient.post<{ data: { receiptUrl: string } }>(
        `/groups/${groupId}/expenses/${expenseId}/receipt`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] })
    },
  })
}
