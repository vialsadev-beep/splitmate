import { z } from 'zod'

export const CreatePaymentSchema = z.object({
  senderId: z.string().min(1),
  receiverId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de monto inválido'),
  notes: z.string().max(200).optional(),
  date: z.string().datetime().optional(),
})

export const PaymentResponseSchema = z.object({
  id: z.string(),
  sender: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  receiver: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  amount: z.string(),
  currency: z.string(),
  notes: z.string().nullable(),
  date: z.string(),
  createdAt: z.string(),
})

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>
