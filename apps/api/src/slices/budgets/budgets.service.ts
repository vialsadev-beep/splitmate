import { Decimal } from '@prisma/client/runtime/library'
import { AppError } from '../../shared/errors/AppError'
import { budgetsRepository } from './budgets.repository'
import type { CreateBudgetInput, BudgetResponse } from '@splitmate/shared'

/** Calcula el rango de fechas del período actual para un presupuesto */
function getCurrentPeriodRange(period: string, startDate: Date, endDate: Date | null): { from: Date; to: Date } {
  const now = new Date()

  if (period === 'CUSTOM') {
    return { from: startDate, to: endDate ?? now }
  }

  if (period === 'MONTHLY') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return { from, to }
  }

  if (period === 'WEEKLY') {
    const day = now.getDay() // 0=domingo
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // lunes
    const from = new Date(now.setDate(diff))
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(from.getDate() + 6)
    to.setHours(23, 59, 59)
    return { from, to }
  }

  if (period === 'YEARLY') {
    const from = new Date(now.getFullYear(), 0, 1)
    const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    return { from, to }
  }

  return { from: startDate, to: now }
}

function getStatus(percentage: number): BudgetResponse['status'] {
  if (percentage >= 100) return 'exceeded'
  if (percentage >= 80) return 'warning'
  return 'ok'
}

export const budgetsService = {
  async getBudgets(groupId: string): Promise<BudgetResponse[]> {
    const budgets = await budgetsRepository.findAllByGroup(groupId)

    return Promise.all(
      budgets.map(async (b) => {
        const { from, to } = getCurrentPeriodRange(b.period, b.startDate, b.endDate)
        const spent = await budgetsRepository.getSpentInPeriod(groupId, b.categoryId, from, to)
        const limit = new Decimal(b.amount)
        const percentage = limit.isZero() ? 0 : spent.dividedBy(limit).times(100).toDecimalPlaces(1).toNumber()

        return {
          id: b.id,
          name: b.name,
          amount: limit.toFixed(2),
          period: b.period,
          categoryId: b.categoryId,
          categoryName: b.category?.name ?? null,
          categoryEmoji: b.category?.emoji ?? null,
          startDate: b.startDate.toISOString(),
          endDate: b.endDate?.toISOString() ?? null,
          spent: spent.toFixed(2),
          remaining: Decimal.max(limit.minus(spent), 0).toFixed(2),
          percentage,
          status: getStatus(percentage),
        }
      }),
    )
  },

  async createBudget(groupId: string, input: CreateBudgetInput): Promise<BudgetResponse> {
    const budget = await budgetsRepository.create({
      groupId,
      name: input.name,
      amount: new Decimal(input.amount),
      period: input.period,
      categoryId: input.categoryId,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    })

    const { from, to } = getCurrentPeriodRange(budget.period, budget.startDate, budget.endDate)
    const spent = await budgetsRepository.getSpentInPeriod(groupId, budget.categoryId, from, to)
    const limit = new Decimal(budget.amount)
    const percentage = limit.isZero() ? 0 : spent.dividedBy(limit).times(100).toDecimalPlaces(1).toNumber()

    return {
      id: budget.id,
      name: budget.name,
      amount: limit.toFixed(2),
      period: budget.period,
      categoryId: budget.categoryId,
      categoryName: budget.category?.name ?? null,
      categoryEmoji: budget.category?.emoji ?? null,
      startDate: budget.startDate.toISOString(),
      endDate: budget.endDate?.toISOString() ?? null,
      spent: spent.toFixed(2),
      remaining: Decimal.max(limit.minus(spent), 0).toFixed(2),
      percentage,
      status: getStatus(percentage),
    }
  },

  async deleteBudget(groupId: string, budgetId: string): Promise<void> {
    const budget = await budgetsRepository.findById(budgetId, groupId)
    if (!budget) throw AppError.notFound('Presupuesto no encontrado')
    await budgetsRepository.delete(budgetId, groupId)
  },
}
