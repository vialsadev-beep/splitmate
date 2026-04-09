import { z } from 'zod'

export const BudgetPeriodSchema = z.enum(['WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'])

export const CreateBudgetSchema = z.object({
  name: z.string().min(1).max(80),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de importe inválido'),
  period: BudgetPeriodSchema.default('MONTHLY'),
  categoryId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
})

export const BudgetResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.string(),
  period: BudgetPeriodSchema,
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  categoryEmoji: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  // Calculado en runtime
  spent: z.string(),
  remaining: z.string(),
  percentage: z.number(), // 0-100+
  status: z.enum(['ok', 'warning', 'exceeded']),
})

export type BudgetPeriod = z.infer<typeof BudgetPeriodSchema>
export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>
export type BudgetResponse = z.infer<typeof BudgetResponseSchema>
