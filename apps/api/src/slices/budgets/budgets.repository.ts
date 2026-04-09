import { Prisma } from '@prisma/client'
import { prisma } from '../../shared/lib/prisma'

export const budgetsRepository = {
  async findAllByGroup(groupId: string) {
    return prisma.budget.findMany({
      where: { groupId },
      include: { category: { select: { id: true, name: true, emoji: true } } },
      orderBy: { createdAt: 'asc' },
    })
  },

  async findById(budgetId: string, groupId: string) {
    return prisma.budget.findFirst({
      where: { id: budgetId, groupId },
      include: { category: { select: { id: true, name: true, emoji: true } } },
    })
  },

  async create(data: {
    groupId: string
    name: string
    amount: Prisma.Decimal | string
    period: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM'
    categoryId?: string
    startDate: Date
    endDate?: Date
  }) {
    return prisma.budget.create({
      data,
      include: { category: { select: { id: true, name: true, emoji: true } } },
    })
  },

  async delete(budgetId: string, groupId: string) {
    return prisma.budget.deleteMany({ where: { id: budgetId, groupId } })
  },

  // Suma gastos del período actual para un presupuesto concreto.
  // Si categoryId es null → suma todos los gastos del período (presupuesto global).
  // Si categoryId está definido → filtra por esa categoría.
  async getSpentInPeriod(groupId: string, categoryId: string | null, from: Date, to: Date) {
    const where: Prisma.ExpenseWhereInput = {
      groupId,
      deletedAt: null,
      date: { gte: from, lte: to },
      ...(categoryId ? { categoryId } : {}),
    }
    const result = await prisma.expense.aggregate({ where, _sum: { amount: true } })
    return result._sum.amount ?? new (await import('@prisma/client/runtime/library')).Decimal(0)
  },
}
