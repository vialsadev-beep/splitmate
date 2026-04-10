import { Decimal } from '@prisma/client/runtime/library'
import { AppError } from '../../shared/errors/AppError'
import { prisma } from '../../shared/lib/prisma'
import { expensesRepository } from './expenses.repository'
import { balancesService } from '../balances/balances.service'
import { checkDebtLimitNotifications } from '../../shared/lib/notify'
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination'
import type { CreateExpenseInput, UpdateExpenseInput } from '@splitmate/shared'

// ─── Helpers de cálculo ───────────────────────────────────────

function toDecimal(value: string): Decimal {
  return new Decimal(value)
}

function roundDecimal(value: Decimal, places = 2): Decimal {
  return value.toDecimalPlaces(places)
}

/**
 * Calcula los splits para cada tipo de división.
 * Invariante: suma de splits debe ser igual al amount total.
 * El residuo de centavos se asigna al primer participante.
 */
export function calculateSplits(
  amount: Decimal,
  payerId: string,
  splitType: CreateExpenseInput['splitType'],
  input: CreateExpenseInput,
): { userId: string; amount: Decimal; isPaid: boolean }[] {
  switch (splitType) {
    case 'EQUAL': {
      const participants = input.participantIds ?? []
      if (participants.length === 0) throw AppError.badRequest('Se requieren participantes para split EQUAL')

      const each = roundDecimal(amount.dividedBy(participants.length))
      const total = each.times(participants.length)
      const residual = amount.minus(total)

      return participants.map((userId, i) => ({
        userId,
        amount: i === 0 ? each.plus(residual) : each,
        isPaid: userId === payerId,
      }))
    }

    case 'EXACT': {
      const splits = input.splits ?? []
      const sum = splits.reduce((acc, s) => acc.plus(toDecimal(s.amount)), new Decimal(0))
      if (!sum.equals(amount)) {
        throw AppError.unprocessable('SPLIT_SUM_MISMATCH', `Los splits suman ${sum.toFixed(2)} pero el gasto es ${amount.toFixed(2)}`)
      }
      return splits.map((s) => ({
        userId: s.userId,
        amount: toDecimal(s.amount),
        isPaid: s.userId === payerId,
      }))
    }

    case 'PERCENTAGE': {
      const pSplits = input.percentageSplits ?? []
      const percentageSum = pSplits.reduce((acc, s) => acc + parseFloat(s.percentage), 0)
      if (Math.abs(percentageSum - 100) > 0.01) {
        throw AppError.unprocessable('PERCENTAGE_SUM_MISMATCH', `Los porcentajes suman ${percentageSum}% en lugar de 100%`)
      }

      const calculated = pSplits.map((s) => ({
        userId: s.userId,
        amount: roundDecimal(amount.times(parseFloat(s.percentage)).dividedBy(100)),
        isPaid: s.userId === payerId,
      }))

      // Ajustar residuo
      const calcSum = calculated.reduce((acc, s) => acc.plus(s.amount), new Decimal(0))
      const residual = amount.minus(calcSum)
      if (calculated.length > 0) calculated[0].amount = calculated[0].amount.plus(residual)

      return calculated
    }

    case 'SHARES': {
      const sSplits = input.shareSplits ?? []
      const totalShares = sSplits.reduce((acc, s) => acc + s.shares, 0)
      if (totalShares === 0) throw AppError.badRequest('Las partes totales no pueden ser 0')

      const calculated = sSplits.map((s) => ({
        userId: s.userId,
        amount: roundDecimal(amount.times(s.shares).dividedBy(totalShares)),
        isPaid: s.userId === payerId,
      }))

      // Ajustar residuo
      const calcSum = calculated.reduce((acc, s) => acc.plus(s.amount), new Decimal(0))
      const residual = amount.minus(calcSum)
      if (calculated.length > 0) calculated[0].amount = calculated[0].amount.plus(residual)

      return calculated
    }

    default:
      throw AppError.badRequest('Tipo de división no válido')
  }
}

function formatExpense(
  expense: NonNullable<Awaited<ReturnType<typeof expensesRepository.findById>>>,
  requesterId?: string,
) {
  const myShare = requesterId
    ? expense.splits.find((s) => s.userId === requesterId)?.amount.toFixed(2) ?? null
    : null

  return {
    id: expense.id,
    title: expense.title,
    amount: expense.amount.toFixed(2),
    currency: expense.currency,
    splitType: expense.splitType,
    payer: expense.payer,
    category: expense.category,
    splits: expense.splits.map((s) => ({
      userId: s.userId,
      name: s.user.name,
      avatarUrl: s.user.avatarUrl,
      amount: s.amount.toFixed(2),
      isPaid: s.isPaid,
    })),
    myShare,
    notes: expense.notes,
    receiptUrl: expense.receiptUrl ?? null,
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
  }
}

// ─── Service ──────────────────────────────────────────────────

export const expensesService = {
  async getExpenses(
    groupId: string,
    requesterId: string,
    query: { page: number; limit: number; categoryId?: string; payerId?: string; from?: string; to?: string; search?: string },
  ) {
    const { skip, take, page, limit } = getPaginationParams(query)

    const { expenses, total } = await expensesRepository.findAllByGroup(groupId, {
      skip,
      take,
      categoryId: query.categoryId,
      payerId: query.payerId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      search: query.search,
    })

    const data = expenses.map((e) => formatExpense(e, requesterId))
    return buildPaginatedResponse(data, total, page, limit)
  },

  async getExpenseById(groupId: string, expenseId: string, requesterId: string) {
    const expense = await expensesRepository.findById(expenseId, groupId)
    if (!expense) throw AppError.notFound('Gasto no encontrado')
    return formatExpense(expense, requesterId)
  },

  async createExpense(groupId: string, input: CreateExpenseInput, requesterId: string) {
    const amount = toDecimal(input.amount)
    if (amount.lessThanOrEqualTo(0)) throw AppError.badRequest('El importe debe ser mayor que 0')

    // Verificar que el pagador es miembro del grupo
    const payerMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: input.payerId } },
    })
    if (!payerMembership || payerMembership.leftAt) {
      throw AppError.unprocessable('USER_NOT_IN_GROUP', 'El pagador no pertenece al grupo')
    }

    // Obtener moneda del grupo
    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw AppError.notFound('Grupo no encontrado')

    // Obtener miembros activos del grupo (necesario para EQUAL sin participantIds y para validación)
    const memberIds = await prisma.groupMember
      .findMany({ where: { groupId, leftAt: null }, select: { userId: true } })
      .then((m) => m.map((x) => x.userId))

    // Para EQUAL sin participantIds explícito, usar todos los miembros activos
    const resolvedInput: CreateExpenseInput =
      input.splitType === 'EQUAL' && (!input.participantIds || input.participantIds.length === 0)
        ? { ...input, participantIds: memberIds }
        : input

    const splits = calculateSplits(amount, input.payerId, input.splitType, resolvedInput)

    for (const split of splits) {
      if (!memberIds.includes(split.userId)) {
        throw AppError.unprocessable('USER_NOT_IN_GROUP', `El usuario ${split.userId} no pertenece al grupo`)
      }
    }

    const expense = await expensesRepository.create({
      groupId,
      payerId: input.payerId,
      title: input.title,
      amount,
      currency: group.currency,
      splitType: input.splitType,
      categoryId: input.categoryId,
      notes: input.notes,
      date: input.date ? new Date(input.date) : undefined,
      splits,
    })

    // Balances cambian → invalidar caché + comprobar límite de deuda
    await balancesService.invalidateCache(groupId)
    void checkDebtLimitNotifications(groupId)

    return formatExpense(expense, requesterId)
  },

  async exportCsv(
    groupId: string,
    _requesterId: string,
    query: { from?: string; to?: string; search?: string; categoryId?: string },
  ) {
    const { expenses } = await expensesRepository.findAllByGroup(groupId, {
      skip: 0,
      take: 10_000,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      search: query.search,
      categoryId: query.categoryId,
    })

    function esc(val: string | null | undefined): string {
      const s = val ?? ''
      // Si contiene coma, comillas o salto de línea → envolver en comillas y escapar comillas internas
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const headers = ['Fecha', 'Descripción', 'Importe', 'Moneda', 'Pagador', 'División', 'Categoría', 'Notas']
    const rows = expenses.map((e) => [
      new Date(e.date).toISOString().split('T')[0],
      esc(e.title),
      e.amount.toFixed(2),
      e.currency,
      esc(e.payer.name),
      e.splitType,
      esc(e.category?.name ?? ''),
      esc(e.notes ?? ''),
    ])

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  },

  async updateExpense(groupId: string, expenseId: string, input: UpdateExpenseInput, requesterId: string, requesterRole: string) {
    const expense = await expensesRepository.findById(expenseId, groupId)
    if (!expense) throw AppError.notFound('Gasto no encontrado')

    if (expense.payerId !== requesterId && requesterRole !== 'ADMIN') {
      throw AppError.forbidden('Solo el pagador o un administrador puede editar este gasto')
    }

    // Determinar si hay cambios estructurales que requieren recalcular splits
    const hasStructuralChange = input.amount !== undefined || input.payerId !== undefined || input.splitType !== undefined

    let splitsToUpdate: { userId: string; amount: import('@prisma/client/runtime/library').Decimal; isPaid: boolean }[] | undefined

    if (hasStructuralChange) {
      // Construir el contexto de cálculo mezclando valores actuales + nuevos
      const newAmount = input.amount ? toDecimal(input.amount) : expense.amount
      if (newAmount.lessThanOrEqualTo(0)) throw AppError.badRequest('El importe debe ser mayor que 0')

      const newPayerId = input.payerId ?? expense.payerId
      const newSplitType = (input.splitType ?? expense.splitType) as CreateExpenseInput['splitType']

      // Verificar que el nuevo pagador es miembro activo del grupo
      if (input.payerId) {
        const payerMembership = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId: input.payerId } },
        })
        if (!payerMembership || payerMembership.leftAt) {
          throw AppError.unprocessable('USER_NOT_IN_GROUP', 'El pagador no pertenece al grupo')
        }
      }

      // Construir el input para calculateSplits
      // Si no se proporcionan nuevos splits, intentar usar los participantes actuales (solo EQUAL)
      const calcInput: CreateExpenseInput = {
        title: input.title ?? expense.title,
        amount: newAmount.toFixed(2),
        payerId: newPayerId,
        splitType: newSplitType,
        participantIds: input.participantIds ?? (newSplitType === 'EQUAL' ? expense.splits.map((s) => s.userId) : undefined),
        splits: input.splits,
        percentageSplits: input.percentageSplits,
        shareSplits: input.shareSplits,
      }

      splitsToUpdate = calculateSplits(newAmount, newPayerId, newSplitType, calcInput)

      // Verificar que todos los participantes son miembros del grupo
      const memberIds = await prisma.groupMember
        .findMany({ where: { groupId, leftAt: null }, select: { userId: true } })
        .then((m) => m.map((x) => x.userId))

      for (const split of splitsToUpdate) {
        if (!memberIds.includes(split.userId)) {
          throw AppError.unprocessable('USER_NOT_IN_GROUP', `El usuario ${split.userId} no pertenece al grupo`)
        }
      }
    }

    const updated = await expensesRepository.update(expenseId, {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.date !== undefined && { date: new Date(input.date) }),
      ...(input.amount !== undefined && { amount: toDecimal(input.amount) }),
      ...(input.payerId !== undefined && { payerId: input.payerId }),
      ...(input.splitType !== undefined && { splitType: input.splitType }),
      ...(splitsToUpdate && { splits: splitsToUpdate }),
    })

    // Balances cambian → invalidar caché + comprobar límite de deuda
    await balancesService.invalidateCache(groupId)
    void checkDebtLimitNotifications(groupId)

    return formatExpense(updated, requesterId)
  },

  async deleteExpense(groupId: string, expenseId: string, requesterId: string, requesterRole: string) {
    const expense = await expensesRepository.findById(expenseId, groupId)
    if (!expense) throw AppError.notFound('Gasto no encontrado')

    if (expense.payerId !== requesterId && requesterRole !== 'ADMIN') {
      throw AppError.forbidden('Solo el pagador o un administrador puede eliminar este gasto')
    }

    await expensesRepository.softDelete(expenseId, groupId)

    // Balances cambian → invalidar caché
    await balancesService.invalidateCache(groupId)
  },
}
