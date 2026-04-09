import Redis from 'ioredis'
import { env } from '../../config/env'
import { logger } from './logger'

export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 })
  : null

if (redis) {
  redis.on('connect', () => logger.info('Redis connected'))
  redis.on('error', (err) => logger.error({ err }, 'Redis error'))
}

export async function connectRedis() {
  if (!redis) {
    logger.warn('REDIS_URL not set — running without Redis (dev mode)')
    return
  }
  await redis.connect()
}
