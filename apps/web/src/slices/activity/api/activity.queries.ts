import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import type { ActivityFeed } from '@splitmate/shared'

export const activityKeys = {
  feed: (groupId: string) => ['activity', groupId] as const,
}

export function useActivityFeed(groupId: string) {
  return useQuery({
    queryKey: activityKeys.feed(groupId),
    queryFn: async () => {
      const res = await apiClient.get<ActivityFeed>(`/groups/${groupId}/activity?limit=30`)
      return res.data
    },
    enabled: !!groupId,
    staleTime: 30_000,
  })
}
