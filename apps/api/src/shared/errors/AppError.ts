export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, AppError.prototype)
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'VALIDATION_ERROR', message, details)
  }

  static unauthorized(message = 'No autenticado') {
    return new AppError(401, 'UNAUTHORIZED', message)
  }

  static forbidden(message = 'Acceso denegado') {
    return new AppError(403, 'FORBIDDEN', message)
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(404, 'NOT_FOUND', message)
  }

  static conflict(message: string) {
    return new AppError(409, 'CONFLICT', message)
  }

  static unprocessable(code: string, message: string) {
    return new AppError(422, code, message)
  }

  static tooManyRequests() {
    return new AppError(429, 'RATE_LIMIT', 'Demasiadas peticiones, intenta más tarde')
  }
}
