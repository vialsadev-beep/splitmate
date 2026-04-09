import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { AppError } from '../errors/AppError'

export interface JwtPayload {
  userId: string
  email: string
}

declare global {
  namespace Express {
    // Extends Passport's Express.User so req.user has userId + email
    interface User extends JwtPayload {}
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Token de autenticación requerido')
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.user = payload
    next()
  } catch {
    throw AppError.unauthorized('Token inválido o expirado')
  }
}
