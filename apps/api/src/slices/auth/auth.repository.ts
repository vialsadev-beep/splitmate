import { prisma } from '../../shared/lib/prisma'

export const authRepository = {
  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    })
  },

  async findUserById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
  },

  async createUser(data: {
    email: string
    name: string
    passwordHash?: string
    locale?: string
  }) {
    return prisma.user.create({ data })
  },

  async updateUser(id: string, data: Partial<{ name: string; avatarUrl: string; locale: string; theme: string; passwordHash: string }>) {
    return prisma.user.update({ where: { id }, data })
  },

  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    })
  },

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } })
  },

  async revokeRefreshToken(token: string) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    })
  },

  async revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  },

  async cleanExpiredTokens() {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
  },

  async findOrCreateOAuthUser(data: {
    email: string
    name: string
    avatarUrl?: string
    provider: string
    providerId: string
  }) {
    const existing = await prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider: data.provider, providerId: data.providerId } },
      include: { user: true },
    })

    if (existing) return existing.user

    // Verificar si ya existe usuario con ese email
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    })

    if (existingUser) {
      // Vincular cuenta OAuth al usuario existente
      await prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider: data.provider,
          providerId: data.providerId,
        },
      })
      return existingUser
    }

    // Crear usuario nuevo con OAuth
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        oauthAccounts: {
          create: { provider: data.provider, providerId: data.providerId },
        },
      },
    })
  },
}
