import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../../shared/lib/prisma'

export interface UserNetBalance {
  userId: string
  name: string
  avatarUrl: string | null
  paypalMe: string | null
  balance: Decimal // positivo = le deben, negativo = debe
}

export const balancesRepository = {
  /**
   * Calcula el balance neto de cada miembro del grupo.
   * balance_neto = lo_que_otros_le_deben - lo_que_él_debe + pagos_recibidos - pagos_enviados
   */
  async getNetBalances(groupId: string): Promise<UserNetBalance[]> {
    const members = await prisma.groupMember.findMany({
      where: { groupId, leftAt: null },
      include: { user: { select: { id: true, name: true, avatarUrl: true, paypalMe: true } } },
    })

    // Obtener todos los splits activos del grupo
    const splits = await prisma.expenseSplit.findMany({
      where: {
        expense: { groupId, deletedAt: null },
      },
      include: {
        expense: { select: { payerId: true, amount: true } },
      },
    })

    // Obtener todos los pagos del grupo
    const payments = await prisma.payment.findMany({
      where: { groupId, deletedAt: null },
    })

    // Inicializar balances
    const balanceMap = new Map<string, Decimal>()
    for (const m of members) {
      balanceMap.set(m.userId, new Decimal(0))
    }

    // Procesar splits
    for (const split of splits) {
      const payerId = split.expense.payerId
      const userId = split.userId
      const amount = split.amount

      if (!split.isPaid) {
        // El payer tiene crédito (le deben)
        const payerBalance = balanceMap.get(payerId)
        if (payerBalance !== undefined) {
          balanceMap.set(payerId, payerBalance.plus(amount))
        }

        // El usuario del split tiene deuda
        const userBalance = balanceMap.get(userId)
        if (userBalance !== undefined) {
          balanceMap.set(userId, userBalance.minus(amount))
        }
      }
    }

    // Procesar pagos manuales
    for (const payment of payments) {
      const senderBalance = balanceMap.get(payment.senderId)
      if (senderBalance !== undefined) {
        balanceMap.set(payment.senderId, senderBalance.plus(payment.amount))
      }

      const receiverBalance = balanceMap.get(payment.receiverId)
      if (receiverBalance !== undefined) {
        balanceMap.set(payment.receiverId, receiverBalance.minus(payment.amount))
      }
    }

    return members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      paypalMe: m.user.paypalMe,
      balance: balanceMap.get(m.userId) ?? new Decimal(0),
    }))
  },

  /**
   * Computes the requesting user's net balance for each of the specified groups.
   * Uses two queries (splits + payments) instead of N per-group queries.
   */
  async getMyBalancesForGroups(groupIds: string[], userId: string): Promise<Map<string, Decimal>> {
    const result = new Map<string, Decimal>()
    for (const gId of groupIds) result.set(gId, new Decimal(0))
    if (groupIds.length === 0) return result

    const [splits, payments] = await Promise.all([
      prisma.expenseSplit.findMany({
        where: { expense: { groupId: { in: groupIds }, deletedAt: null }, isPaid: false },
        select: { userId: true, amount: true, expense: { select: { payerId: true, groupId: true } } },
      }),
      prisma.payment.findMany({
        where: {
          groupId: { in: groupIds },
          deletedAt: null,
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        select: { groupId: true, senderId: true, receiverId: true, amount: true },
      }),
    ])

    for (const split of splits) {
      const gId = split.expense.groupId
      const cur = result.get(gId) ?? new Decimal(0)
      if (split.expense.payerId === userId) result.set(gId, cur.plus(split.amount))
      if (split.userId === userId) result.set(gId, (result.get(gId) ?? cur).minus(split.amount))
    }

    for (const p of payments) {
      const cur = result.get(p.groupId) ?? new Decimal(0)
      if (p.senderId === userId) result.set(p.groupId, cur.plus(p.amount))
      else if (p.receiverId === userId) result.set(p.groupId, cur.minus(p.amount))
    }

    return result
  },

  async getTotalExpenses(groupId: string): Promise<Decimal> {
    const result = await prisma.expense.aggregate({
      where: { groupId, deletedAt: null },
      _sum: { amount: true },
    })
    return result._sum.amount ?? new Decimal(0)
  },
}
