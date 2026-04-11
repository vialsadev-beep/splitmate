import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from './prisma'
import { balancesRepository } from '../../slices/balances/balances.repository'

/**
 * Notifica a los miembros afectados por un nuevo gasto
 * (todos los splits excepto el pagador).
 */
export async function notifyExpenseAdded(
  groupId: string,
  expenseId: string,
  payerName: string,
  expenseTitle: string,
  amount: string,
  currency: string,
  participantIds: string[],
  payerId: string,
) {
  const recipientIds = participantIds.filter((id) => id !== payerId)
  if (recipientIds.length === 0) return

  await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      type: 'EXPENSE_ADDED' as const,
      title: `${payerName} añadió «${expenseTitle}»`,
      body: `${amount} ${currency} dividido entre ${participantIds.length} persona${participantIds.length === 1 ? '' : 's'}`,
      data: { groupId, expenseId },
    })),
    skipDuplicates: true,
  })
}

/**
 * Comprueba si algún presupuesto del grupo ha superado el 80% o 100%
 * y notifica a los admins del grupo.
 */
export async function checkBudgetAlerts(groupId: string) {
  const budgets = await prisma.budget.findMany({
    where: { groupId },
    include: { category: { select: { name: true, emoji: true } } },
  })
  if (budgets.length === 0) return

  const admins = await prisma.groupMember.findMany({
    where: { groupId, role: 'ADMIN', leftAt: null },
    select: { userId: true },
  })
  if (admins.length === 0) return

  const now = new Date()

  for (const budget of budgets) {
    const period = budget.period as string
    let from: Date
    let to: Date

    if (period === 'MONTHLY') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (period === 'WEEKLY') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      from = new Date(new Date().setDate(diff))
      from.setHours(0, 0, 0, 0)
      to = new Date(from)
      to.setDate(from.getDate() + 6)
      to.setHours(23, 59, 59)
    } else if (period === 'YEARLY') {
      from = new Date(now.getFullYear(), 0, 1)
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    } else {
      from = budget.startDate
      to = budget.endDate ?? now
    }

    const result = await prisma.expense.aggregate({
      where: {
        groupId,
        deletedAt: null,
        date: { gte: from, lte: to },
        ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
      },
      _sum: { amount: true },
    })

    const { Decimal } = await import('@prisma/client/runtime/library')
    const spent = result._sum.amount ?? new Decimal(0)
    const limit = new Decimal(budget.amount)
    if (limit.isZero()) continue

    const pct = spent.dividedBy(limit).times(100).toNumber()

    let alertType: string | null = null
    let title: string | null = null
    let body: string | null = null

    if (pct >= 100) {
      alertType = 'exceeded'
      const catLabel = budget.category ? `${budget.category.emoji ?? ''} ${budget.category.name}`.trim() : budget.name
      title = `Presupuesto superado: ${catLabel}`
      body = `Has gastado ${spent.toFixed(2)} de ${limit.toFixed(2)} (${Math.round(pct)}%)`
    } else if (pct >= 80) {
      alertType = 'warning'
      const catLabel = budget.category ? `${budget.category.emoji ?? ''} ${budget.category.name}`.trim() : budget.name
      title = `Advertencia de presupuesto: ${catLabel}`
      body = `Has gastado el ${Math.round(pct)}% de ${limit.toFixed(2)}`
    }

    if (!alertType || !title || !body) continue

    // Anti-spam: solo si no hay alerta del mismo tipo en las últimas 24h para este budget
    const antiSpamKey = alertType === 'exceeded' ? `budget_exceeded_${budget.id}` : `budget_warning_${budget.id}`
    for (const admin of admins) {
      const recent = await prisma.notification.findFirst({
        where: {
          userId: admin.userId,
          type: 'BUDGET_ALERT',
          readAt: null,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          data: { path: ['budgetId'], equals: budget.id },
        },
      })
      if (recent) continue

      await prisma.notification.create({
        data: {
          userId: admin.userId,
          type: 'BUDGET_ALERT',
          title,
          body,
          data: { groupId, budgetId: budget.id, alertType },
        },
      })
    }
  }
}

/**
 * Comprueba si algún miembro supera el límite de deuda del grupo
 * y crea notificaciones DEBT_LIMIT para los afectados.
 * Se llama después de crear/actualizar gastos o registrar pagos.
 */
export async function checkDebtLimitNotifications(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { debtLimit: true, name: true },
  })

  if (!group?.debtLimit) return // sin límite configurado

  const limit = new Decimal(group.debtLimit)
  const netBalances = await balancesRepository.getNetBalances(groupId)

  for (const b of netBalances) {
    // balance negativo = deudor; convertimos a positivo para comparar
    const debt = b.balance.abs()
    if (b.balance.lessThan(0) && debt.greaterThan(limit)) {
      // Evitar spam: solo crear si no hay una DEBT_LIMIT no leída en las últimas 24h
      const recent = await prisma.notification.findFirst({
        where: {
          userId: b.userId,
          type: 'DEBT_LIMIT',
          readAt: null,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          data: { path: ['groupId'], equals: groupId },
        },
      })
      if (recent) continue

      await prisma.notification.create({
        data: {
          userId: b.userId,
          type: 'DEBT_LIMIT',
          title: `Límite de deuda superado en ${group.name}`,
          body: `Tu deuda es ${debt.toFixed(2)} — supera el límite de ${limit.toFixed(2)} configurado en el grupo.`,
          data: { groupId },
        },
      })
    }
  }
}
