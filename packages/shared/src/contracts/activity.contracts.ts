import { z } from 'zod'

export const ActivityTypeSchema = z.enum(['EXPENSE_CREATED', 'EXPENSE_DELETED', 'PAYMENT_CREATED'])

export const ActivityItemSchema = z.object({
  id: z.string(),
  type: ActivityTypeSchema,
  actorId: z.string(),
  actorName: z.string(),
  actorAvatarUrl: z.string().nullable(),
  title: z.string(),
  amount: z.string(),
  currency: z.string(),
  createdAt: z.string(),
})

export const ActivityFeedSchema = z.object({
  data: z.array(ActivityItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
})

export type ActivityType = z.infer<typeof ActivityTypeSchema>
export type ActivityItem = z.infer<typeof ActivityItemSchema>
export type ActivityFeed = z.infer<typeof ActivityFeedSchema>
