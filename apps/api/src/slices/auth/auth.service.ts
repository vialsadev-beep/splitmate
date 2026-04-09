import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { AppError } from '../../shared/errors/AppError'
import { authRepository } from './auth.repository'
import type { TokenPair, AuthUser } from './auth.types'
import type { RegisterInput, LoginInput, UpdateProfileInput } from '@splitmate/shared'

const BCRYPT_ROUNDS = 12

function generateTokens(userId: string, email: string): TokenPair {
  const accessToken = jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
  })

  // jti garantiza unicidad incluso si dos tokens se generan en el mismo segundo
  const refreshToken = jwt.sign({ userId, type: 'refresh', jti: randomUUID() }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
  })

  return { accessToken, refreshToken }
}

function getRefreshTokenExpiry(): Date {
  const days = parseInt(env.JWT_REFRESH_EXPIRES.replace('d', ''), 10)
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + days)
  return expiry
}

function formatUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    theme: user.theme,
    createdAt: user.createdAt.toISOString(),
  }
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await authRepository.findUserByEmail(input.email)
    if (existing) {
      throw AppError.conflict('Ya existe una cuenta con este email')
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
    const user = await authRepository.createUser({
      email: input.email,
      name: input.name,
      passwordHash,
    })

    const tokens = generateTokens(user.id, user.email)
    await authRepository.createRefreshToken(user.id, tokens.refreshToken, getRefreshTokenExpiry())

    return { user: formatUser(user as AuthUser), ...tokens }
  },

  async login(input: LoginInput) {
    const user = await authRepository.findUserByEmail(input.email)
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Credenciales inválidas')
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash)
    if (!isValid) {
      throw AppError.unauthorized('Credenciales inválidas')
    }

    const tokens = generateTokens(user.id, user.email)
    await authRepository.createRefreshToken(user.id, tokens.refreshToken, getRefreshTokenExpiry())

    return { user: formatUser(user as AuthUser), ...tokens }
  },

  async refresh(token: string) {
    const stored = await authRepository.findRefreshToken(token)

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token inválido o expirado')
    }

    try {
      jwt.verify(token, env.JWT_SECRET)
    } catch {
      await authRepository.revokeRefreshToken(token)
      throw AppError.unauthorized('Refresh token inválido')
    }

    // Rotación: revocar el token usado y generar uno nuevo
    await authRepository.revokeRefreshToken(token)

    const user = await authRepository.findUserById(stored.userId)
    if (!user) throw AppError.unauthorized('Usuario no encontrado')

    const tokens = generateTokens(user.id, user.email)
    await authRepository.createRefreshToken(user.id, tokens.refreshToken, getRefreshTokenExpiry())

    return tokens
  },

  async logout(token: string) {
    await authRepository.revokeRefreshToken(token).catch(() => {})
  },

  async getProfile(userId: string) {
    const user = await authRepository.findUserById(userId)
    if (!user) throw AppError.notFound('Usuario no encontrado')
    return formatUser(user as AuthUser)
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await authRepository.updateUser(userId, input)
    return formatUser(user as AuthUser)
  },

  async loginWithOAuth(data: {
    email: string
    name: string
    avatarUrl?: string
    provider: string
    providerId: string
  }) {
    const user = await authRepository.findOrCreateOAuthUser(data)
    const tokens = generateTokens(user.id, user.email)
    await authRepository.createRefreshToken(user.id, tokens.refreshToken, getRefreshTokenExpiry())
    return { user: formatUser(user as AuthUser), ...tokens }
  },
}
