import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import type { ActivityFeed } from '@splitmate/shared'

export const activityKeys = {
  feed: (groupId: string, page?: number) => ['activity', groupId, page] as const,
}

export function useActivityFeed(groupId: string, page = 1) {
  return useQuery({
    queryKey: activityKeys.feed(groupId, page),
    queryFn: async () => {
      const res = await apiClient.get<ActivityFeed>(`/groups/${groupId}/activity?limit=30&page=${page}`)
      return res.data
    },
    enabled: !!groupId,
    staleTime: 30_000,
  })
}
