import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireGroupMember } from '../../shared/middleware/authorize'
import { activityHandler } from './activity.handler'

// Montado en /api/v1/groups/:groupId/activity
export const activityRouter = Router({ mergeParams: true })

activityRouter.use(authenticate, requireGroupMember)

activityRouter.get('/', activityHandler.getFeed)
