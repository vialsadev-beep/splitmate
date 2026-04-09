import { z } from 'zod'

export const UserDebtSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  amount: z.string(),
})

export const SimplifiedDebtSchema = z.object({
  from: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  to: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  amount: z.string(),
})

export const MemberBalanceSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  balance: z.string(),
  isCreditor: z.boolean(),
})

export const GroupBalanceResponseSchema = z.object({
  members: z.array(MemberBalanceSchema),
  currency: z.string(),
  totalExpenses: z.string(),
})

export const SimplifiedBalanceResponseSchema = z.object({
  debts: z.array(SimplifiedDebtSchema),
  allSettled: z.boolean(),
  currency: z.string(),
})

export const MyBalanceResponseSchema = z.object({
  myBalance: z.string(),
  iOwe: z.array(UserDebtSchema),
  theyOweMe: z.array(UserDebtSchema),
  currency: z.string(),
})

export type SimplifiedDebt = z.infer<typeof SimplifiedDebtSchema>
export type MemberBalance = z.infer<typeof MemberBalanceSchema>
export type GroupBalanceResponse = z.infer<typeof GroupBalanceResponseSchema>
export type SimplifiedBalanceResponse = z.infer<typeof SimplifiedBalanceResponseSchema>
export type MyBalanceResponse = z.infer<typeof MyBalanceResponseSchema>
