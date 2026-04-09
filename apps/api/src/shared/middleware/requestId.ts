import { randomUUID } from 'node:crypto'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      log: ReturnType<typeof logger.child>
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID()
  req.requestId = id
  req.log = logger.child({ requestId: id })
  res.setHeader('X-Request-Id', id)
  next()
}
