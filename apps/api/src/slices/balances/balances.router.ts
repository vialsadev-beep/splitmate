import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireGroupMember } from '../../shared/middleware/authorize'
import { balancesHandler } from './balances.handler'

export const balancesRouter = Router({ mergeParams: true })

balancesRouter.use(authenticate, requireGroupMember)

balancesRouter.get('/', balancesHandler.getGroupBalances)
balancesRouter.get('/simplified', balancesHandler.getSimplifiedBalances)
balancesRouter.get('/me', balancesHandler.getMyBalance)
