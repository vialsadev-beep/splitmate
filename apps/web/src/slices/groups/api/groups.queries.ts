import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import type { CreateGroupInput, GroupResponse, GroupSummary, JoinGroupInput } from '@splitmate/shared'

export const groupsKeys = {
  all: ['groups'] as const,
  detail: (id: string) => ['groups', id] as const,
}

export function useGroups() {
  return useQuery({
    queryKey: groupsKeys.all,
    queryFn: async () => {
      const res = await apiClient.get<{ data: GroupSummary[] }>('/groups')
      return res.data.data
    },
    staleTime: 30_000,
  })
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: groupsKeys.detail(groupId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: GroupResponse }>(`/groups/${groupId}`)
      return res.data.data
    },
    enabled: !!groupId,
    staleTime: 30_000,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateGroupInput) => {
      const res = await apiClient.post<{ data: GroupResponse }>('/groups', data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKeys.all }),
  })
}

export function useJoinGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: JoinGroupInput) => {
      const res = await apiClient.post<{ data: GroupResponse }>('/groups/join', data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKeys.all }),
  })
}

export function useRegenerateInviteCode(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: { inviteCode: string } }>(
        `/groups/${groupId}/invite/regenerate`,
      )
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKeys.detail(groupId) }),
  })
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/groups/${groupId}/members/${userId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKeys.detail(groupId) }),
  })
}

export function useUpdateGroup(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name?: string; description?: string; emoji?: string; debtLimit?: string | null }) => {
      const res = await apiClient.patch<{ data: GroupResponse }>(`/groups/${groupId}`, data)
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupsKeys.detail(groupId) })
      qc.invalidateQueries({ queryKey: groupsKeys.all })
    },
  })
}

export function useUploadGroupAvatar(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('avatar', file)
      const res = await apiClient.post<{ data: { avatarUrl: string } }>(
        `/groups/${groupId}/avatar`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupsKeys.detail(groupId) })
      qc.invalidateQueries({ queryKey: groupsKeys.all })
    },
  })
}
