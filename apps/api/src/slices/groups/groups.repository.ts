import { prisma } from '../../shared/lib/prisma'

export const groupsRepository = {
  async findAllByUser(userId: string) {
    return prisma.group.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId, leftAt: null } },
      },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { expenses: { where: { deletedAt: null } } } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  },

  async findById(groupId: string) {
    return prisma.group.findFirst({
      where: { id: groupId, deletedAt: null },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    })
  },

  async findByInviteCode(inviteCode: string) {
    return prisma.group.findFirst({
      where: { inviteCode, deletedAt: null },
    })
  },

  async create(data: {
    name: string
    description?: string
    emoji?: string
    currency: string
    creatorId: string
  }) {
    return prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        emoji: data.emoji,
        currency: data.currency,
        members: {
          create: { userId: data.creatorId, role: 'ADMIN' },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    })
  },

  async update(groupId: string, data: { name?: string; description?: string; emoji?: string; avatarUrl?: string | null; debtLimit?: string | null }) {
    const { debtLimit, ...rest } = data
    return prisma.group.update({
      where: { id: groupId },
      data: {
        ...rest,
        ...(debtLimit !== undefined ? { debtLimit: debtLimit ?? null } : {}),
      },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    })
  },

  async softDelete(groupId: string) {
    return prisma.group.update({
      where: { id: groupId },
      data: { deletedAt: new Date() },
    })
  },

  async addMember(groupId: string, userId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') {
    return prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: { leftAt: null, role },
      create: { groupId, userId, role },
    })
  },

  async removeMember(groupId: string, userId: string) {
    return prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { leftAt: new Date() },
    })
  },

  async updateMemberRole(groupId: string, userId: string, role: 'ADMIN' | 'MEMBER') {
    return prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role },
    })
  },

  async getMembership(groupId: string, userId: string) {
    return prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
  },

  async regenerateInviteCode(groupId: string) {
    const newCode = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    return prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: newCode },
    })
  },

  async countAdmins(groupId: string) {
    return prisma.groupMember.count({
      where: { groupId, role: 'ADMIN', leftAt: null },
    })
  },
}
