import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import type { GroupStats } from '@splitmate/shared'

export const statsKeys = {
  group: (groupId: string) => ['stats', groupId] as const,
}

export function useGroupStats(groupId: string) {
  return useQuery({
    queryKey: statsKeys.group(groupId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: GroupStats }>(`/groups/${groupId}/stats`)
      return res.data.data
    },
    enabled: !!groupId,
    staleTime: 30_000, // 30s — los stats no cambian tan frecuentemente
  })
}
