import { redis } from '../../shared/lib/redis'
import { logger } from '../../shared/lib/logger'

const PREFIX = 'splitmate:balances'
const TTL_SECONDS = 60 // 1 minuto como safety net

function key(groupId: string, suffix: string) {
  return `${PREFIX}:${groupId}:${suffix}`
}

export const balancesCache = {
  async get<T>(groupId: string, suffix: string): Promise<T | null> {
    if (!redis) return null
    try {
      const raw = await redis.get(key(groupId, suffix))
      return raw ? (JSON.parse(raw) as T) : null
    } catch (err) {
      logger.warn({ err }, 'balancesCache.get failed — cache miss')
      return null
    }
  },

  async set(groupId: string, suffix: string, value: unknown): Promise<void> {
    if (!redis) return
    try {
      await redis.set(key(groupId, suffix), JSON.stringify(value), 'EX', TTL_SECONDS)
    } catch (err) {
      logger.warn({ err }, 'balancesCache.set failed — continuing without cache')
    }
  },

  /** Invalida todas las entradas de balance de un grupo */
  async invalidate(groupId: string): Promise<void> {
    if (!redis) return
    try {
      const pattern = `${PREFIX}:${groupId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) await redis.del(...keys)
    } catch (err) {
      logger.warn({ err }, 'balancesCache.invalidate failed — stale data may linger up to 60s')
    }
  },
}
