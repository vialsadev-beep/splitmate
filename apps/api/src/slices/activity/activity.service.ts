import { prisma } from '../../shared/lib/prisma'
import type { ActivityItem } from '@splitmate/shared'

export const activityService = {
  async getFeed(groupId: string, page: number, limit: number) {
    const skip = (page - 1) * limit

    // Gastos creados (no borrados)
    const [expenses, expensesTotal] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId, deletedAt: null },
        include: { payer: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.expense.count({ where: { groupId, deletedAt: null } }),
    ])

    // Gastos borrados (para mostrar "X eliminó el gasto Y")
    const deletedExpenses = await prisma.expense.findMany({
      where: { groupId, deletedAt: { not: null } },
      include: { payer: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { deletedAt: 'desc' },
    })

    // Pagos
    const [payments, paymentsTotal] = await Promise.all([
      prisma.payment.findMany({
        where: { groupId, deletedAt: null },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          receiver: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where: { groupId, deletedAt: null } }),
    ])

    // Combinar y normalizar en ActivityItem[]
    const items: (ActivityItem & { sortDate: Date })[] = [
      ...expenses.map((e) => ({
        id: `expense-${e.id}`,
        type: 'EXPENSE_CREATED' as const,
        actorId: e.payer.id,
        actorName: e.payer.name,
        actorAvatarUrl: e.payer.avatarUrl,
        title: e.title,
        amount: e.amount.toFixed(2),
        currency: e.currency,
        createdAt: e.createdAt.toISOString(),
        sortDate: e.createdAt,
      })),
      ...deletedExpenses.map((e) => ({
        id: `expense-deleted-${e.id}`,
        type: 'EXPENSE_DELETED' as const,
        actorId: e.payer.id,
        actorName: e.payer.name,
        actorAvatarUrl: e.payer.avatarUrl,
        title: e.title,
        amount: e.amount.toFixed(2),
        currency: e.currency,
        createdAt: e.deletedAt!.toISOString(),
        sortDate: e.deletedAt!,
      })),
      ...payments.map((p) => ({
        id: `payment-${p.id}`,
        type: 'PAYMENT_CREATED' as const,
        actorId: p.sender.id,
        actorName: p.sender.name,
        actorAvatarUrl: p.sender.avatarUrl,
        title: p.receiver.name, // "pagó a <receiver>"
        amount: p.amount.toFixed(2),
        currency: p.currency,
        createdAt: p.createdAt.toISOString(),
        sortDate: p.createdAt,
      })),
    ]

    // Ordenar por fecha desc
    items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())

    const total = expensesTotal + deletedExpenses.length + paymentsTotal
    const paginated = items.slice(skip, skip + limit)
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return {
      data: paginated.map(({ sortDate: _sd, ...item }) => item),
      meta: { total, page, limit, totalPages },
    }
  },
}
