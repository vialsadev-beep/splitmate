import { Request, Response } from 'express'
import { authService } from './auth.service'
import { env } from '../../config/env'

const COOKIE_NAME = 'rt'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(COOKIE_NAME)
}

export const authHandler = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body)
    setRefreshCookie(res, result.refreshToken)
    res.status(201).json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    })
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body)
    setRefreshCookie(res, result.refreshToken)
    res.json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    })
  },

  async refresh(req: Request, res: Response) {
    const token = req.cookies[COOKIE_NAME] || req.body?.refreshToken
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Refresh token requerido' } })
    }

    const tokens = await authService.refresh(token)
    setRefreshCookie(res, tokens.refreshToken)
    res.json({ data: { accessToken: tokens.accessToken } })
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies[COOKIE_NAME] || req.body?.refreshToken
    if (token) await authService.logout(token)
    clearRefreshCookie(res)
    res.json({ data: { message: 'Sesión cerrada correctamente' } })
  },

  async getMe(req: Request, res: Response) {
    const user = await authService.getProfile(req.user!.userId)
    res.json({ data: user })
  },

  async updateMe(req: Request, res: Response) {
    const user = await authService.updateProfile(req.user!.userId, req.body)
    res.json({ data: user })
  },

  googleCallback(req: Request, res: Response) {
    const user = req.user as { accessToken: string; refreshToken: string } | undefined
    if (!user) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`)
    }
    setRefreshCookie(res, user.refreshToken)
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${user.accessToken}`)
  },
}
