import { Request, Response } from 'express'
import { paymentsService } from './payments.service'
import { PaginationSchema } from '../../shared/utils/pagination'
import { AppError } from '../../shared/errors/AppError'

export const paymentsHandler = {
  async getPayments(req: Request, res: Response) {
    const result = PaginationSchema.safeParse(req.query)
    if (!result.success) throw AppError.badRequest('Parámetros de consulta inválidos', result.error.flatten().fieldErrors)
    const payments = await paymentsService.getPayments(req.params.groupId, result.data)
    res.json(payments)
  },

  async createPayment(req: Request, res: Response) {
    const payment = await paymentsService.createPayment(req.params.groupId, req.body, req.user!.userId)
    res.status(201).json({ data: payment })
  },

  async deletePayment(req: Request, res: Response) {
    const memberRole = (req as Request & { memberRole?: string }).memberRole ?? 'MEMBER'
    await paymentsService.deletePayment(req.params.groupId, req.params.paymentId, req.user!.userId, memberRole)
    res.json({ data: { message: 'Pago eliminado' } })
  },
}
