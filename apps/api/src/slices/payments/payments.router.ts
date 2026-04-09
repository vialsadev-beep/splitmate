import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireGroupMember } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { paymentsHandler } from './payments.handler'
import { CreatePaymentSchema } from '@splitmate/shared'

export const paymentsRouter = Router({ mergeParams: true })

paymentsRouter.use(authenticate, requireGroupMember)

paymentsRouter.get('/', paymentsHandler.getPayments)
paymentsRouter.post('/', validate(CreatePaymentSchema), paymentsHandler.createPayment)
paymentsRouter.delete('/:paymentId', paymentsHandler.deletePayment)
