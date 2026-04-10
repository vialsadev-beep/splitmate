import 'express-async-errors'
import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import { env } from './config/env'
import { errorHandler } from './shared/middleware/errorHandler'
import { requestId } from './shared/middleware/requestId'

import { authRouter } from './slices/auth/auth.router'
import { groupsRouter } from './slices/groups/groups.router'
import { expensesRouter } from './slices/expenses/expenses.router'
import { balancesRouter } from './slices/balances/balances.router'
import { paymentsRouter } from './slices/payments/payments.router'
import { categoriesRouter } from './slices/categories/categories.router'
import { notificationsRouter } from './slices/notifications/notifications.router'
import { statsRouter } from './slices/stats/stats.router'
import { activityRouter } from './slices/activity/activity.router'
import { budgetsRouter } from './slices/budgets/budgets.router'
import { potRouter } from './slices/pot/pot.router'
import { receiptRouter } from './slices/expenses/receipt.router'

export const app = express()

// ─── Request ID (primero, antes de todo logging) ─────────────
app.use(requestId)

// ─── Seguridad ───────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
)

// ─── Rate limiting global ─────────────────────────────────────
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas peticiones' } },
  }),
)

// ─── Parsing ──────────────────────────────────────────────────
app.use(express.json())
app.use(cookieParser())

// ─── Request logging ─────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    req.log.info(
      { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start },
      'request',
    )
  })
  next()
})

// ─── Static uploads ───────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/groups', groupsRouter)
app.use('/api/v1/groups/:groupId/expenses', expensesRouter)
app.use('/api/v1/groups/:groupId/balances', balancesRouter)
app.use('/api/v1/groups/:groupId/payments', paymentsRouter)
app.use('/api/v1/categories', categoriesRouter)
app.use('/api/v1/groups/:groupId/stats', statsRouter)
app.use('/api/v1/groups/:groupId/activity', activityRouter)
app.use('/api/v1/notifications', notificationsRouter)
app.use('/api/v1/groups/:groupId/budgets', budgetsRouter)
app.use('/api/v1/groups/:groupId/pot', potRouter)
app.use('/api/v1/receipt', receiptRouter)

// ─── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } }))

// ─── Error handler (siempre el último) ───────────────────────
app.use(errorHandler)
