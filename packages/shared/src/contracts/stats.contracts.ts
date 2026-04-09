import { z } from 'zod'

export const CategoryStatSchema = z.object({
  categoryId: z.string().nullable(),
  categoryName: z.string(),
  categoryEmoji: z.string().nullable(),
  categoryColor: z.string().nullable(),
  total: z.string(),
  count: z.number(),
  percentage: z.number(),
})

export const MonthlyStatSchema = z.object({
  month: z.string(), // "2025-01"
  total: z.string(),
  count: z.number(),
})

export const MemberStatSchema = z.object({
  userId: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  totalPaid: z.string(),
  totalOwed: z.string(),
  balance: z.string(),
})

export const GroupStatsSchema = z.object({
  totalExpenses: z.string(),
  totalCount: z.number(),
  avgExpense: z.string(),
  byCategory: z.array(CategoryStatSchema),
  byMonth: z.array(MonthlyStatSchema),
  byMember: z.array(MemberStatSchema),
  currency: z.string(),
})

export type CategoryStat = z.infer<typeof CategoryStatSchema>
export type MonthlyStat = z.infer<typeof MonthlyStatSchema>
export type MemberStat = z.infer<typeof MemberStatSchema>
export type GroupStats = z.infer<typeof GroupStatsSchema>
