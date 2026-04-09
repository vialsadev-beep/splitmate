import 'dotenv/config'
import { app } from './app'
import { env } from './config/env'
import { prisma } from './shared/lib/prisma'
import { connectRedis } from './shared/lib/redis'
import { logger } from './shared/lib/logger'
import { startCronJobs } from './shared/lib/cron'

async function bootstrap() {
  try {
    await prisma.$connect()
    logger.info('PostgreSQL connected')

    await connectRedis()

    startCronJobs()

    app.listen(env.PORT, () => {
      logger.info(`🚀 API running on http://localhost:${env.PORT}`)
      logger.info(`   Environment: ${env.NODE_ENV}`)
    })
  } catch (error) {
    logger.error({ error }, 'Failed to start server')
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

bootstrap()
