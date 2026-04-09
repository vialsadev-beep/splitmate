import { AppError } from '../../shared/errors/AppError'
import { groupsRepository } from './groups.repository'
import type { CreateGroupInput, UpdateGroupInput } from '@splitmate/shared'

function formatMember(m: {
  userId: string
  role: string
  joinedAt: Date
  user: { id: string; name: string; email: string; avatarUrl: string | null }
}) {
  return {
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
    role: m.role as 'ADMIN' | 'MEMBER',
    joinedAt: m.joinedAt.toISOString(),
  }
}

function formatGroup(group: Awaited<ReturnType<typeof groupsRepository.findById>>) {
  if (!group) return null
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    emoji: group.emoji,
    avatarUrl: group.avatarUrl,
    currency: group.currency,
    inviteCode: group.inviteCode,
    debtLimit: group.debtLimit?.toFixed(2) ?? null,
    members: group.members.map(formatMember),
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  }
}

export const groupsService = {
  async getMyGroups(userId: string) {
    const groups = await groupsRepository.findAllByUser(userId)
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      currency: g.currency,
      memberCount: g.members.length,
      myBalance: '0.00', // Se calcula en el slice de balances
      updatedAt: g.updatedAt.toISOString(),
    }))
  },

  async getGroupById(groupId: string, requesterId: string) {
    const group = await groupsRepository.findById(groupId)
    if (!group) throw AppError.notFound('Grupo no encontrado')

    const isMember = group.members.some((m) => m.userId === requesterId)
    if (!isMember) throw AppError.forbidden('No perteneces a este grupo')

    const expenseCount = (group as unknown as { _count?: { expenses?: number } })._count?.expenses ?? 0

    return {
      ...formatGroup(group)!,
      expenseCount,
    }
  },

  async createGroup(input: CreateGroupInput, creatorId: string) {
    const group = await groupsRepository.create({
      name: input.name,
      description: input.description,
      emoji: input.emoji,
      currency: input.currency,
      creatorId,
    })
    return formatGroup(group)
  },

  async updateGroup(groupId: string, input: UpdateGroupInput) {
    const group = await groupsRepository.update(groupId, input)
    return formatGroup(group)
  },

  async deleteGroup(groupId: string) {
    await groupsRepository.softDelete(groupId)
  },

  async joinGroup(inviteCode: string, userId: string) {
    const group = await groupsRepository.findByInviteCode(inviteCode)
    if (!group) throw AppError.notFound('Código de invitación inválido')

    const existing = await groupsRepository.getMembership(group.id, userId)
    if (existing && !existing.leftAt) {
      throw AppError.conflict('Ya eres miembro de este grupo')
    }

    await groupsRepository.addMember(group.id, userId)
    return groupsRepository.findById(group.id).then(formatGroup)
  },

  async removeMember(groupId: string, targetUserId: string, requesterId: string) {
    if (targetUserId === requesterId) {
      // Un usuario no puede expulsarse a sí mismo si es el único admin
      const adminCount = await groupsRepository.countAdmins(groupId)
      const membership = await groupsRepository.getMembership(groupId, requesterId)
      if (membership?.role === 'ADMIN' && adminCount === 1) {
        throw AppError.unprocessable('LAST_ADMIN', 'No puedes salir del grupo siendo el único administrador')
      }
    }

    await groupsRepository.removeMember(groupId, targetUserId)
  },

  async updateMemberRole(groupId: string, targetUserId: string, role: 'ADMIN' | 'MEMBER') {
    // No dejar al grupo sin admins
    if (role === 'MEMBER') {
      const adminCount = await groupsRepository.countAdmins(groupId)
      const membership = await groupsRepository.getMembership(groupId, targetUserId)
      if (membership?.role === 'ADMIN' && adminCount === 1) {
        throw AppError.unprocessable('LAST_ADMIN', 'El grupo debe tener al menos un administrador')
      }
    }

    return groupsRepository.updateMemberRole(groupId, targetUserId, role)
  },

  async regenerateInviteCode(groupId: string) {
    const group = await groupsRepository.regenerateInviteCode(groupId)
    return { inviteCode: group.inviteCode }
  },
}
