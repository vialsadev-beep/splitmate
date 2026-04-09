import { prisma } from './prisma'
import { logger } from './logger'

/**
 * Elimina refresh tokens ya expirados o revocados hace más de 24h.
 * Mantiene los revocados recientes por si se necesitan en auditoría.
 */
async function purgeStaleRefreshTokens() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h atrás

  const { count } = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { lt: cutoff } },
      ],
    },
  })

  if (count > 0) {
    logger.info({ count }, 'Purged stale refresh tokens')
  }
}

const INTERVAL_MS = 6 * 60 * 60 * 1000 // cada 6 horas

export function startCronJobs() {
  // Ejecutar inmediatamente al arrancar y luego cada 6h
  purgeStaleRefreshTokens().catch((err) =>
    logger.error({ err }, 'Error in initial refresh token purge'),
  )

  const timer = setInterval(() => {
    purgeStaleRefreshTokens().catch((err) =>
      logger.error({ err }, 'Error purging refresh tokens'),
    )
  }, INTERVAL_MS)

  // No bloquear el proceso si solo queda este timer
  timer.unref()

  logger.info('Cron jobs started (refresh token purge every 6h)')
}
