import { Prisma } from '@prisma/client'
import { prisma } from '../../shared/lib/prisma'

const expenseInclude = {
  payer: { select: { id: true, name: true, avatarUrl: true } },
  splits: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
  category: { select: { id: true, name: true, emoji: true, color: true } },
} satisfies Prisma.ExpenseInclude

export const expensesRepository = {
  async findAllByGroup(
    groupId: string,
    params: { skip: number; take: number; categoryId?: string; payerId?: string; from?: Date; to?: Date; search?: string },
  ) {
    const where: Prisma.ExpenseWhereInput = {
      groupId,
      deletedAt: null,
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.payerId && { payerId: params.payerId }),
      ...(params.from || params.to
        ? { date: { ...(params.from && { gte: params.from }), ...(params.to && { lte: params.to }) } }
        : {}),
      ...(params.search && { title: { contains: params.search, mode: 'insensitive' } }),
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({ where, include: expenseInclude, skip: params.skip, take: params.take, orderBy: { date: 'desc' } }),
      prisma.expense.count({ where }),
    ])

    return { expenses, total }
  },

  async findById(expenseId: string, groupId?: string) {
    return prisma.expense.findFirst({
      where: { id: expenseId, deletedAt: null, ...(groupId ? { groupId } : {}) },
      include: expenseInclude,
    })
  },

  async create(data: {
    groupId: string
    payerId: string
    title: string
    amount: Prisma.Decimal | string
    currency: string
    splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'
    categoryId?: string
    notes?: string
    date?: Date
    splits: { userId: string; amount: Prisma.Decimal | string; isPaid: boolean }[]
    receiptItems?: unknown
    isPrivate?: boolean
  }) {
    return prisma.expense.create({
      data: {
        groupId: data.groupId,
        payerId: data.payerId,
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        splitType: data.splitType,
        categoryId: data.categoryId,
        notes: data.notes,
        date: data.date ?? new Date(),
        splits: { create: data.splits },
        ...(data.receiptItems !== undefined && data.receiptItems !== null ? { receiptItems: data.receiptItems as Prisma.InputJsonValue } : {}),
        ...(data.isPrivate !== undefined ? { isPrivate: data.isPrivate } : {}),
      },
      include: expenseInclude,
    })
  },

  async update(expenseId: string, data: {
    title?: string
    notes?: string | null
    categoryId?: string | null
    date?: Date
    amount?: Prisma.Decimal | string
    payerId?: string
    splitType?: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'
    splits?: { userId: string; amount: Prisma.Decimal | string; isPaid: boolean }[]
    receiptItems?: unknown
    isPrivate?: boolean
  }) {
    const { splits, receiptItems, ...expenseData } = data

    return prisma.$transaction(async (tx) => {
      // Si se actualizan los splits, reemplazar todos (delete + create)
      if (splits) {
        await tx.expenseSplit.deleteMany({ where: { expenseId } })
        await tx.expenseSplit.createMany({
          data: splits.map((s) => ({ expenseId, ...s })),
        })
      }

      return tx.expense.update({
        where: { id: expenseId },
        data: {
          ...expenseData,
          ...(receiptItems !== undefined ? { receiptItems: receiptItems as Prisma.InputJsonValue } : {}),
        },
        include: expenseInclude,
      })
    })
  },

  async softDelete(expenseId: string, groupId?: string) {
    return prisma.expense.updateMany({
      where: { id: expenseId, deletedAt: null, ...(groupId ? { groupId } : {}) },
      data: { deletedAt: new Date() },
    })
  },
}
