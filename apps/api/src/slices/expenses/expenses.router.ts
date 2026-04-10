import { Router, Request, Response } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireGroupMember } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { expensesHandler } from './expenses.handler'
import { uploadMiddleware } from '../../shared/middleware/upload'
import { prisma } from '../../shared/lib/prisma'
import { AppError } from '../../shared/errors/AppError'
import { CreateExpenseSchema, UpdateExpenseSchema, UpdateReceiptItemsSchema } from '@splitmate/shared'
import { expensesService } from './expenses.service'

// Este router se monta en /api/v1/groups/:groupId/expenses
// Express no pasa params del padre por defecto → mergeParams: true
export const expensesRouter = Router({ mergeParams: true })

expensesRouter.use(authenticate, requireGroupMember)

expensesRouter.get('/', expensesHandler.getExpenses)
expensesRouter.get('/export', expensesHandler.exportCsv) // antes de /:expenseId
expensesRouter.post('/', validate(CreateExpenseSchema), expensesHandler.createExpense)
expensesRouter.get('/:expenseId', expensesHandler.getExpenseById)
expensesRouter.patch('/:expenseId', validate(UpdateExpenseSchema), expensesHandler.updateExpense)
expensesRouter.delete('/:expenseId', expensesHandler.deleteExpense)

// PATCH /groups/:groupId/expenses/:expenseId/receipt-items — actualizar items del ticket
expensesRouter.patch(
  '/:expenseId/receipt-items',
  validate(UpdateReceiptItemsSchema),
  async (req: Request<{ groupId: string; expenseId: string }>, res: Response) => {
    const { groupId, expenseId } = req.params
    const { items } = req.body as { items: import('@splitmate/shared').ReceiptItem[] }
    const result = await expensesService.updateReceiptItems(groupId, expenseId, items, req.user!.userId)
    res.json({ data: result })
  },
)

// POST /groups/:groupId/expenses/:expenseId/receipt — subir foto del ticket
expensesRouter.post(
  '/:expenseId/receipt',
  uploadMiddleware.single('receipt'),
  async (req: Request<{ groupId: string; expenseId: string }>, res: Response) => {
    if (!req.file) throw AppError.badRequest('No se adjuntó ningún archivo')

    const expense = await prisma.expense.findFirst({
      where: { id: req.params.expenseId, groupId: req.params.groupId, deletedAt: null },
    })
    if (!expense) throw AppError.notFound('Gasto no encontrado')

    // Solo el pagador o un admin puede adjuntar/cambiar el recibo
    const memberRole = (req as Request & { memberRole?: string }).memberRole
    if (expense.payerId !== req.user!.userId && memberRole !== 'ADMIN') {
      throw AppError.forbidden('Solo el pagador o un administrador puede adjuntar un recibo')
    }

    const receiptUrl = `/uploads/${req.file.filename}`
    await prisma.expense.update({ where: { id: expense.id }, data: { receiptUrl } })

    res.json({ data: { receiptUrl } })
  },
)
