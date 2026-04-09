import { z } from 'zod'

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
})

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
})

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  locale: z.enum(['es', 'en']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
})

export const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  locale: z.string(),
  theme: z.string(),
  createdAt: z.string(),
  hasPassword: z.boolean(),
})

export const AuthResponseSchema = z.object({
  user: UserResponseSchema,
  accessToken: z.string(),
  // refreshToken ya no se devuelve en el body — viaja solo en httpOnly cookie
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
export type UserResponse = z.infer<typeof UserResponseSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
