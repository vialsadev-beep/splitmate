import { Router, Request, Response } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireGroupMember, requireGroupAdmin } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { budgetsService } from './budgets.service'
import { CreateBudgetSchema } from '@splitmate/shared'

// Montado en /api/v1/groups/:groupId/budgets
export const budgetsRouter = Router({ mergeParams: true })

budgetsRouter.use(authenticate, requireGroupMember)

// GET /api/v1/groups/:groupId/budgets
budgetsRouter.get('/', async (req: Request<{ groupId: string }>, res: Response) => {
  const budgets = await budgetsService.getBudgets(req.params.groupId)
  res.json({ data: budgets })
})

// POST /api/v1/groups/:groupId/budgets — solo admin
budgetsRouter.post('/', requireGroupAdmin, validate(CreateBudgetSchema), async (req: Request<{ groupId: string }>, res: Response) => {
  const budget = await budgetsService.createBudget(req.params.groupId, req.body)
  res.status(201).json({ data: budget })
})

// DELETE /api/v1/groups/:groupId/budgets/:budgetId — solo admin
budgetsRouter.delete('/:budgetId', requireGroupAdmin, async (req: Request<{ groupId: string; budgetId: string }>, res: Response) => {
  await budgetsService.deleteBudget(req.params.groupId, req.params.budgetId)
  res.status(204).send()
})
