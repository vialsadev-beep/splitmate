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
