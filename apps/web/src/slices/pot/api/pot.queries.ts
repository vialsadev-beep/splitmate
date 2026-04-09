import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'

export interface PotContribution {
  id: string
  userId: string
  userName: string
  userAvatarUrl: string | null
  amount: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  notes: string | null
  confirmedAt: string | null
  confirmedBy: string | null
  createdAt: string
}

export interface GroupPot {
  id: string
  paypalMe: string
  enabled: boolean
  totalConfirmed: string
  contributions: PotContribution[]
}

export const potKeys = {
  detail: (groupId: string) => ['pot', groupId] as const,
}

export function useGroupPot(groupId: string) {
  return useQuery({
    queryKey: potKeys.detail(groupId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: GroupPot | null }>(`/groups/${groupId}/pot`)
      return res.data.data
    },
    enabled: !!groupId,
  })
}

export function useConfigurePot(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { paypalMe: string; enabled?: boolean }) => {
      const res = await apiClient.put<{ data: GroupPot }>(`/groups/${groupId}/pot`, data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: potKeys.detail(groupId) }),
  })
}

export function useAddContribution(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { amount: number; notes?: string }) => {
      const res = await apiClient.post<{ data: PotContribution }>(`/groups/${groupId}/pot/contributions`, data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: potKeys.detail(groupId) }),
  })
}

export function useConfirmContribution(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contributionId: string) => {
      const res = await apiClient.patch<{ data: PotContribution }>(
        `/groups/${groupId}/pot/contributions/${contributionId}/confirm`,
      )
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: potKeys.detail(groupId) }),
  })
}

export function useCancelContribution(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contributionId: string) => {
      await apiClient.delete(`/groups/${groupId}/pot/contributions/${contributionId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: potKeys.detail(groupId) }),
  })
}
