import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    // Errores operacionales esperados — no hace falta stack trace
    if (err.statusCode >= 500) {
      req.log.error({ err }, err.message)
    } else {
      req.log.warn({ code: err.code, status: err.statusCode }, err.message)
    }

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    })
  }

  // Error inesperado — loguear con contexto completo
  req.log.error({ err, path: req.path, method: req.method }, 'Unhandled error')

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ha ocurrido un error inesperado',
      requestId: req.requestId,
    },
  })
}
