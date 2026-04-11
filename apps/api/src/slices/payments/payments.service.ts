import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../../shared/lib/prisma'
import { AppError } from '../../shared/errors/AppError'
import { balancesService } from '../balances/balances.service'
import { checkDebtLimitNotifications } from '../../shared/lib/notify'
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination'
import type { CreatePaymentInput } from '@splitmate/shared'

function formatPayment(p: {
  id: string
  amount: Decimal
  currency: string
  notes: string | null
  date: Date
  createdAt: Date
  sender: { id: string; name: string; avatarUrl: string | null }
  receiver: { id: string; name: string; avatarUrl: string | null }
}) {
  return {
    id: p.id,
    sender: p.sender,
    receiver: p.receiver,
    amount: p.amount.toFixed(2),
    currency: p.currency,
    notes: p.notes,
    date: p.date.toISOString(),
    createdAt: p.createdAt.toISOString(),
  }
}

export const paymentsService = {
  async getPayments(groupId: string, query: { page: number; limit: number }) {
    const { skip, take, page, limit } = getPaginationParams(query)

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { groupId, deletedAt: null },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          receiver: { select: { id: true, name: true, avatarUrl: true } },
        },
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      prisma.payment.count({ where: { groupId, deletedAt: null } }),
    ])

    return buildPaginatedResponse(payments.map(formatPayment), total, page, limit)
  },

  async createPayment(groupId: string, input: CreatePaymentInput, requesterId: string) {
    if (input.senderId === input.receiverId) {
      throw AppError.unprocessable('SELF_PAYMENT', 'No puedes registrar un pago a ti mismo')
    }

    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { currency: true } })
    if (!group) throw AppError.notFound('Grupo no encontrado')

    // Verificar que ambos son miembros del grupo
    const [senderMembership, receiverMembership] = await Promise.all([
      prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: input.senderId } } }),
      prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: input.receiverId } } }),
    ])

    if (!senderMembership || senderMembership.leftAt) {
      throw AppError.unprocessable('USER_NOT_IN_GROUP', 'El pagador no pertenece al grupo')
    }
    if (!receiverMembership || receiverMembership.leftAt) {
      throw AppError.unprocessable('USER_NOT_IN_GROUP', 'El receptor no pertenece al grupo')
    }

    const payment = await prisma.payment.create({
      data: {
        groupId,
        senderId: input.senderId,
        receiverId: input.receiverId,
        amount: new Decimal(input.amount),
        currency: group.currency,
        notes: input.notes,
        date: input.date ? new Date(input.date) : new Date(),
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    // Balances cambian → invalidar caché + comprobar límite de deuda + notificar
    await balancesService.invalidateCache(groupId)
    void checkDebtLimitNotifications(groupId)

    // Notificar al receptor del pago
    void prisma.notification.create({
      data: {
        userId: input.receiverId,
        type: 'PAYMENT_RECEIVED',
        title: `${payment.sender.name} te ha pagado`,
        body: `${new Decimal(input.amount).toFixed(2)} ${group.currency}${input.notes ? ` — ${input.notes}` : ''}`,
        data: { groupId },
      },
    })

    return formatPayment(payment)
  },

  async deletePayment(groupId: string, paymentId: string, requesterId: string, requesterRole: string) {
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, groupId, deletedAt: null } })
    if (!payment) throw AppError.notFound('Pago no encontrado')

    if (payment.senderId !== requesterId && requesterRole !== 'ADMIN') {
      throw AppError.forbidden('Solo quien registró el pago o un administrador puede eliminarlo')
    }

    await prisma.payment.update({ where: { id: paymentId }, data: { deletedAt: new Date() } })

    // Balances cambian → invalidar caché
    await balancesService.invalidateCache(groupId)
  },
}
