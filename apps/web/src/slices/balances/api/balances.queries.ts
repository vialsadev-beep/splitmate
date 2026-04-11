import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import type {
  SimplifiedBalanceResponse,
  MyBalanceResponse,
  GroupBalanceResponse,
} from '@splitmate/shared'
import type { CreatePaymentInput } from '@splitmate/shared'

export const balanceKeys = {
  simplified: (groupId: string) => ['balances', groupId, 'simplified'] as const,
  my: (groupId: string) => ['balances', groupId, 'me'] as const,
  group: (groupId: string) => ['balances', groupId] as const,
}

export function useSimplifiedBalance(groupId: string) {
  return useQuery({
    queryKey: balanceKeys.simplified(groupId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: SimplifiedBalanceResponse }>(
        `/groups/${groupId}/balances/simplified`,
      )
      return res.data.data
    },
    enabled: !!groupId,
  })
}

export function useMyBalance(groupId: string) {
  return useQuery({
    queryKey: balanceKeys.my(groupId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: MyBalanceResponse }>(
        `/groups/${groupId}/balances/me`,
      )
      return res.data.data
    },
    enabled: !!groupId,
  })
}

export function useGroupBalance(groupId: string) {
  return useQuery({
    queryKey: balanceKeys.group(groupId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: GroupBalanceResponse }>(
        `/groups/${groupId}/balances`,
      )
      return res.data.data
    },
    enabled: !!groupId,
  })
}

export function useSettleDebt(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreatePaymentInput) => {
      const res = await apiClient.post(`/groups/${groupId}/payments`, data)
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balances', groupId] })
      qc.invalidateQueries({ queryKey: ['payments', groupId] })
      qc.invalidateQueries({ queryKey: ['activity', groupId] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}
