import { prisma } from '../../shared/lib/prisma'

export const statsRepository = {
  async getGroupStats(groupId: string, months = 6) {
    const since = new Date()
    since.setMonth(since.getMonth() - months)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const [expenses, members] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId, deletedAt: null },
        include: {
          category: { select: { id: true, name: true, emoji: true, color: true } },
          splits: { select: { userId: true, amount: true } },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.groupMember.findMany({
        where: { groupId, leftAt: null },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
    ])

    return { expenses, members }
  },
}
