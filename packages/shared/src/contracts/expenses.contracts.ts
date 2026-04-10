import { z } from 'zod'

export const SplitTypeSchema = z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'])

const SplitItemExactSchema = z.object({
  userId: z.string(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de monto inválido'),
})

const SplitItemPercentageSchema = z.object({
  userId: z.string(),
  percentage: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de porcentaje inválido'),
})

const SplitItemSharesSchema = z.object({
  userId: z.string(),
  shares: z.number().int().positive(),
})

export const CreateExpenseSchema = z
  .object({
    title: z.string().min(1, 'El título es requerido').max(100),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de monto inválido'),
    payerId: z.string().min(1, 'El pagador es requerido'),
    splitType: SplitTypeSchema,
    categoryId: z.string().optional(),
    notes: z.string().max(500).optional(),
    date: z.string().datetime().optional(),
    // Para EQUAL: lista de participantes (opcional, default: todos los miembros)
    participantIds: z.array(z.string()).min(1).optional(),
    // Para EXACT
    splits: z.array(SplitItemExactSchema).optional(),
    // Para PERCENTAGE
    percentageSplits: z.array(SplitItemPercentageSchema).optional(),
    // Para SHARES
    shareSplits: z.array(SplitItemSharesSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.splitType === 'EXACT') return data.splits && data.splits.length > 0
      if (data.splitType === 'PERCENTAGE')
        return data.percentageSplits && data.percentageSplits.length > 0
      if (data.splitType === 'SHARES') return data.shareSplits && data.shareSplits.length > 0
      return true
    },
    { message: 'Se requieren los splits para el tipo de división seleccionado' },
  )

export const UpdateExpenseSchema = z
  .object({
    // Campos de metadata (no recalculan splits)
    title: z.string().min(1).max(100).optional(),
    categoryId: z.string().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    date: z.string().datetime().optional(),
    // Campos estructurales (cuando cambia alguno, se recalculan todos los splits)
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de monto inválido').optional(),
    payerId: z.string().optional(),
    splitType: SplitTypeSchema.optional(),
    participantIds: z.array(z.string()).min(1).optional(),
    splits: z.array(SplitItemExactSchema).optional(),
    percentageSplits: z.array(SplitItemPercentageSchema).optional(),
    shareSplits: z.array(SplitItemSharesSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.splitType === 'EXACT') return data.splits && data.splits.length > 0
      if (data.splitType === 'PERCENTAGE')
        return data.percentageSplits && data.percentageSplits.length > 0
      if (data.splitType === 'SHARES') return data.shareSplits && data.shareSplits.length > 0
      return true
    },
    { message: 'Se requieren los splits para el tipo de división seleccionado' },
  )

export const ExpenseSplitResponseSchema = z.object({
  userId: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  amount: z.string(),
  isPaid: z.boolean(),
})

export const ReceiptItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.string(),
  memberIds: z.array(z.string()),
  locked: z.boolean(),
  lockedBy: z.string().optional(),
})

export const UpdateReceiptItemsSchema = z.object({
  items: z.array(ReceiptItemSchema),
})

export const ExpenseResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.string(),
  currency: z.string(),
  splitType: SplitTypeSchema,
  payer: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  category: z
    .object({
      id: z.string(),
      name: z.string(),
      emoji: z.string().nullable(),
      color: z.string().nullable(),
    })
    .nullable(),
  splits: z.array(ExpenseSplitResponseSchema),
  myShare: z.string().nullable(),
  notes: z.string().nullable(),
  receiptUrl: z.string().nullable(),
  receiptItems: z.array(ReceiptItemSchema).nullable(),
  date: z.string(),
  createdAt: z.string(),
})

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>
export type UpdateReceiptItemsInput = z.infer<typeof UpdateReceiptItemsSchema>
export type SplitType = z.infer<typeof SplitTypeSchema>
export type ExpenseResponse = z.infer<typeof ExpenseResponseSchema>
export type ExpenseSplitResponse = z.infer<typeof ExpenseSplitResponseSchema>
export type ReceiptItem = z.infer<typeof ReceiptItemSchema>
