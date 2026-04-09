import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { AppError } from '../errors/AppError'

// Verifica que req.user pertenece al grupo en req.params.groupId
export function requireGroupMember(req: Request, _res: Response, next: NextFunction) {
  return authorizeGroup(req, next, 'MEMBER')
}

export function requireGroupAdmin(req: Request, _res: Response, next: NextFunction) {
  return authorizeGroup(req, next, 'ADMIN')
}

async function authorizeGroup(
  req: Request,
  next: NextFunction,
  minRole: 'MEMBER' | 'ADMIN',
) {
  const userId = req.user?.userId
  const groupId = req.params.groupId

  if (!userId || !groupId) {
    throw AppError.unauthorized()
  }

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })

  if (!membership || membership.leftAt) {
    throw AppError.forbidden('No perteneces a este grupo')
  }

  if (minRole === 'ADMIN' && membership.role !== 'ADMIN') {
    throw AppError.forbidden('Se requiere rol de administrador')
  }

  // Adjuntar rol al request para uso posterior
  ;(req as Request & { memberRole?: string }).memberRole = membership.role
  next()
}
