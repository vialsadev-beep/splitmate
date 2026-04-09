export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  locale: string
  theme: string
  createdAt: Date
  passwordHash: string | null
  paypalMe: string | null
}
