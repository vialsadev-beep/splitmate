import { Request, Response } from 'express'
import { expensesService } from './expenses.service'
import { PaginationSchema } from '../../shared/utils/pagination'
import { AppError } from '../../shared/errors/AppError'
import { z } from 'zod'

const ExportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().max(100).optional(),
  categoryId: z.string().optional(),
})

const ExpenseQuerySchema = PaginationSchema.extend({
  categoryId: z.string().optional(),
  payerId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().max(100).optional(),
})

export const expensesHandler = {
  async getExpenses(req: Request, res: Response) {
    const result = ExpenseQuerySchema.safeParse(req.query)
    if (!result.success) throw AppError.badRequest('Parámetros de consulta inválidos', result.error.flatten().fieldErrors)
    const expenses = await expensesService.getExpenses(req.params.groupId, req.user!.userId, result.data)
    res.json(expenses)
  },

  async exportCsv(req: Request, res: Response) {
    const result = ExportQuerySchema.safeParse(req.query)
    if (!result.success) throw AppError.badRequest('Parámetros de consulta inválidos')
    const csv = await expensesService.exportCsv(req.params.groupId, req.user!.userId, result.data)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="gastos-${req.params.groupId}.csv"`)
    res.send('\uFEFF' + csv) // BOM para que Excel lo abra correctamente
  },

  async getExpenseById(req: Request, res: Response) {
    const expense = await expensesService.getExpenseById(req.params.groupId, req.params.expenseId, req.user!.userId)
    res.json({ data: expense })
  },

  async createExpense(req: Request, res: Response) {
    const expense = await expensesService.createExpense(req.params.groupId, req.body, req.user!.userId)
    res.status(201).json({ data: expense })
  },

  async updateExpense(req: Request, res: Response) {
    const memberRole = (req as Request & { memberRole?: string }).memberRole ?? 'MEMBER'
    const expense = await expensesService.updateExpense(
      req.params.groupId,
      req.params.expenseId,
      req.body,
      req.user!.userId,
      memberRole,
    )
    res.json({ data: expense })
  },

  async deleteExpense(req: Request, res: Response) {
    const memberRole = (req as Request & { memberRole?: string }).memberRole ?? 'MEMBER'
    await expensesService.deleteExpense(req.params.groupId, req.params.expenseId, req.user!.userId, memberRole)
    res.json({ data: { message: 'Gasto eliminado' } })
  },
}
