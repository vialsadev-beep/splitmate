import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

import { env } from '../../config/env'
import { validate } from '../../shared/middleware/validate'
import { authenticate } from '../../shared/middleware/authenticate'
import { uploadMiddleware } from '../../shared/middleware/upload'
import { authHandler } from './auth.handler'
import { authService } from './auth.service'
import { authRepository } from './auth.repository'
import { RegisterSchema, LoginSchema, UpdateProfileSchema, ChangePasswordSchema } from '@splitmate/shared'

export const authRouter = Router()

// Rate limit específico para auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiados intentos, espera 15 minutos' } },
})

// ─── Configurar Passport Google ──────────────────────────────
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) return done(new Error('No email from Google'))

          const result = await authService.loginWithOAuth({
            email,
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
            provider: 'google',
            providerId: profile.id,
          })

          done(null, result as unknown as Express.User)
        } catch (err) {
          done(err as Error)
        }
      },
    ),
  )
}

// ─── Rutas públicas ───────────────────────────────────────────
authRouter.post('/register', authRateLimit, validate(RegisterSchema), authHandler.register)
authRouter.post('/login', authRateLimit, validate(LoginSchema), authHandler.login)
authRouter.post('/refresh', authHandler.refresh)
authRouter.post('/logout', authHandler.logout)

// ─── Google OAuth ─────────────────────────────────────────────
authRouter.get('/google', passport.authenticate('google', { scope: ['email', 'profile'], session: false }))
authRouter.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), authHandler.googleCallback)

// ─── Rutas protegidas ─────────────────────────────────────────
authRouter.get('/me', authenticate, authHandler.getMe)
authRouter.patch('/me', authenticate, validate(UpdateProfileSchema), authHandler.updateMe)

// Subir avatar de usuario
authRouter.post('/me/avatar', authenticate, uploadMiddleware.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'No se subió ningún archivo' } })
  const avatarUrl = `/uploads/${req.file.filename}`
  const user = await authRepository.updateUser(req.user!.userId, { avatarUrl })
  const formatted = {
    id: user.id, name: user.name, email: user.email,
    avatarUrl: user.avatarUrl, locale: user.locale, theme: user.theme,
    createdAt: user.createdAt.toISOString(), hasPassword: !!user.passwordHash,
  }
  res.json({ data: formatted })
})

// Cambiar contraseña
authRouter.post('/me/password', authenticate, validate(ChangePasswordSchema), async (req, res) => {
  await authService.changePassword(req.user!.userId, req.body)
  res.json({ data: { message: 'Contraseña actualizada correctamente' } })
})
