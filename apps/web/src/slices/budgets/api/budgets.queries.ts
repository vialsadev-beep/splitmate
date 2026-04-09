import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import type { BudgetResponse, CreateBudgetInput } from '@splitmate/shared'

export const budgetKeys = {
  group: (groupId: string) => ['budgets', groupId] as const,
}

export function useGroupBudgets(groupId: string) {
  return useQuery({
    queryKey: budgetKeys.group(groupId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: BudgetResponse[] }>(`/groups/${groupId}/budgets`)
      return res.data.data
    },
    enabled: !!groupId,
    staleTime: 30_000,
  })
}

export function useCreateBudget(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const res = await apiClient.post<{ data: BudgetResponse }>(`/groups/${groupId}/budgets`, input)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.group(groupId) })
    },
  })
}

export function useDeleteBudget(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (budgetId: string) => {
      await apiClient.delete(`/groups/${groupId}/budgets/${budgetId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.group(groupId) })
    },
  })
}
