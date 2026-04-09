import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { AppError } from '../errors/AppError'

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const details = result.error.flatten().fieldErrors
      throw AppError.badRequest('Datos de entrada inválidos', details)
    }
    req.body = result.data
    next()
  }
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      throw AppError.badRequest('Parámetros de consulta inválidos', result.error.flatten().fieldErrors)
    }
    req.query = result.data as typeof req.query
    next()
  }
}
