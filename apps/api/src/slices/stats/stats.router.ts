import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireGroupMember } from '../../shared/middleware/authorize'
import { statsHandler } from './stats.handler'

// Montado en /api/v1/groups/:groupId/stats
export const statsRouter = Router({ mergeParams: true })

statsRouter.use(authenticate, requireGroupMember)

statsRouter.get('/', statsHandler.getGroupStats)
