import { z } from 'zod'

export const CreateGroupSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  description: z.string().max(200).optional(),
  emoji: z.string().max(10).optional(),
  currency: z.string().length(3, 'Debe ser un código ISO 4217 de 3 letras').default('EUR'),
})

export const UpdateGroupSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(200).optional(),
  emoji: z.string().max(10).optional(),
  debtLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
})

export const JoinGroupSchema = z.object({
  inviteCode: z.string().min(1),
})

export const InviteMemberSchema = z.object({
  email: z.string().email(),
})

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
})

export const MemberResponseSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['ADMIN', 'MEMBER']),
  joinedAt: z.string(),
})

export const GroupResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  emoji: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  currency: z.string(),
  inviteCode: z.string(),
  debtLimit: z.string().nullable(),
  members: z.array(MemberResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const GroupSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string().nullable(),
  currency: z.string(),
  memberCount: z.number(),
  myBalance: z.string(),
  updatedAt: z.string(),
})

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>
export type JoinGroupInput = z.infer<typeof JoinGroupSchema>
export type MemberResponse = z.infer<typeof MemberResponseSchema>
export type GroupResponse = z.infer<typeof GroupResponseSchema>
export type GroupSummary = z.infer<typeof GroupSummarySchema>
