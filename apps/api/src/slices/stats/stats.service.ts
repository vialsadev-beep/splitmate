import { Decimal } from '@prisma/client/runtime/library'
import { statsRepository } from './stats.repository'
import type { GroupStats, CategoryStat, MonthlyStat, MemberStat } from '@splitmate/shared'

export const statsService = {
  async getGroupStats(groupId: string): Promise<GroupStats & { currency: string }> {
    const { expenses, members } = await statsRepository.getGroupStats(groupId)

    const currency = expenses[0]?.currency ?? 'EUR'
    const total = expenses.reduce((acc, e) => acc.plus(e.amount), new Decimal(0))
    const count = expenses.length
    const avg = count > 0 ? total.dividedBy(count) : new Decimal(0)

    // ── Por categoría ──────────────────────────────────────────
    const catMap = new Map<string, {
      categoryId: string | null
      categoryName: string
      categoryEmoji: string | null
      categoryColor: string | null
      total: Decimal
      count: number
    }>()

    for (const e of expenses) {
      const key = e.categoryId ?? '__none__'
      const existing = catMap.get(key)
      if (existing) {
        existing.total = existing.total.plus(e.amount)
        existing.count++
      } else {
        catMap.set(key, {
          categoryId: e.categoryId ?? null,
          categoryName: e.category?.name ?? 'Sin categoría',
          categoryEmoji: e.category?.emoji ?? null,
          categoryColor: e.category?.color ?? null,
          total: new Decimal(e.amount),
          count: 1,
        })
      }
    }

    const byCategory: CategoryStat[] = Array.from(catMap.values())
      .map((c) => ({
        ...c,
        total: c.total.toFixed(2),
        percentage: total.isZero() ? 0 : c.total.dividedBy(total).times(100).toDecimalPlaces(1).toNumber(),
      }))
      .sort((a, b) => parseFloat(b.total) - parseFloat(a.total))

    // ── Por mes (últimos 6 meses) ──────────────────────────────
    const monthMap = new Map<string, { total: Decimal; count: number }>()

    // Pre-llenar los últimos 6 meses con 0 para que la gráfica sea continua
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap.has(key)) monthMap.set(key, { total: new Decimal(0), count: 0 })
    }

    for (const e of expenses) {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const existing = monthMap.get(key)
      if (existing) {
        existing.total = existing.total.plus(e.amount)
        existing.count++
      }
      // Gastos más antiguos que los 6 meses pre-llenados se ignoran en el gráfico mensual
    }

    const byMonth: MonthlyStat[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        total: v.total.toFixed(2),
        count: v.count,
      }))

    // ── Por miembro ────────────────────────────────────────────
    const memberPaid = new Map<string, Decimal>()
    const memberOwed = new Map<string, Decimal>()

    for (const m of members) {
      memberPaid.set(m.userId, new Decimal(0))
      memberOwed.set(m.userId, new Decimal(0))
    }

    for (const e of expenses) {
      // Suma lo que pagó
      const paid = memberPaid.get(e.payerId)
      if (paid !== undefined) memberPaid.set(e.payerId, paid.plus(e.amount))

      // Suma lo que debe cada participante
      for (const split of e.splits) {
        const owed = memberOwed.get(split.userId)
        if (owed !== undefined) memberOwed.set(split.userId, owed.plus(split.amount))
      }
    }

    const byMember: MemberStat[] = members.map((m) => {
      const paid = memberPaid.get(m.userId) ?? new Decimal(0)
      const owed = memberOwed.get(m.userId) ?? new Decimal(0)
      return {
        userId: m.userId,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        totalPaid: paid.toFixed(2),
        totalOwed: owed.toFixed(2),
        balance: paid.minus(owed).toFixed(2),
      }
    }).sort((a, b) => parseFloat(b.totalPaid) - parseFloat(a.totalPaid))

    return {
      totalExpenses: total.toFixed(2),
      totalCount: count,
      avgExpense: avg.toFixed(2),
      byCategory,
      byMonth,
      byMember,
      currency,
    }
  },
}
