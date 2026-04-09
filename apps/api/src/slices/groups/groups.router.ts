import { Router, Request, Response } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireGroupMember, requireGroupAdmin } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { groupsHandler } from './groups.handler'
import { uploadMiddleware } from '../../shared/middleware/upload'
import { groupsRepository } from './groups.repository'
import { AppError } from '../../shared/errors/AppError'
import { CreateGroupSchema, UpdateGroupSchema, JoinGroupSchema, UpdateMemberRoleSchema } from '@splitmate/shared'

export const groupsRouter = Router()

// Todas las rutas requieren autenticación
groupsRouter.use(authenticate)

// ─── Grupos ───────────────────────────────────────────────────
groupsRouter.get('/', groupsHandler.getMyGroups)
groupsRouter.post('/', validate(CreateGroupSchema), groupsHandler.createGroup)
groupsRouter.post('/join', validate(JoinGroupSchema), groupsHandler.joinGroup)

groupsRouter.get('/:groupId', requireGroupMember, groupsHandler.getGroupById)
groupsRouter.patch('/:groupId', requireGroupAdmin, validate(UpdateGroupSchema), groupsHandler.updateGroup)
groupsRouter.delete('/:groupId', requireGroupAdmin, groupsHandler.deleteGroup)

// POST /groups/:groupId/avatar — subir avatar del grupo (solo admin)
groupsRouter.post(
  '/:groupId/avatar',
  requireGroupAdmin,
  uploadMiddleware.single('avatar'),
  async (req: Request<{ groupId: string }>, res: Response) => {
    if (!req.file) throw AppError.badRequest('No se adjuntó ningún archivo')
    const avatarUrl = `/uploads/${req.file.filename}`
    await groupsRepository.update(req.params.groupId, { avatarUrl })
    res.json({ data: { avatarUrl } })
  },
)

// ─── Miembros ─────────────────────────────────────────────────
groupsRouter.post('/:groupId/invite/regenerate', requireGroupAdmin, groupsHandler.regenerateInviteCode)
groupsRouter.delete('/:groupId/members/:userId', requireGroupAdmin, groupsHandler.removeMember)
groupsRouter.patch('/:groupId/members/:userId', requireGroupAdmin, validate(UpdateMemberRoleSchema), groupsHandler.updateMemberRole)
