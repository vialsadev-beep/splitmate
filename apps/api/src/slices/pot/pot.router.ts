import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireGroupMember, requireGroupAdmin } from '../../shared/middleware/authorize'
import { prisma } from '../../shared/lib/prisma'
import { AppError } from '../../shared/errors/AppError'

// Montado en /api/v1/groups/:groupId/pot
export const potRouter = Router({ mergeParams: true })

potRouter.use(authenticate, requireGroupMember)

const ConfigurePotSchema = z.object({
  paypalMe: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/, 'Usuario de PayPal.me inválido'),
  enabled: z.boolean().optional(),
})

const CreateContributionSchema = z.object({
  amount: z.number().positive().multipleOf(0.01),
  notes: z.string().max(200).optional(),
})

function formatContribution(c: {
  id: string
  amount: { toFixed: (n: number) => string }
  status: string
  notes: string | null
  confirmedAt: Date | null
  confirmedBy: string | null
  createdAt: Date
  userId: string
  user: { id: string; name: string; avatarUrl: string | null }
}) {
  return {
    id: c.id,
    userId: c.userId,
    userName: c.user.name,
    userAvatarUrl: c.user.avatarUrl,
    amount: c.amount.toFixed(2),
    status: c.status,
    notes: c.notes,
    confirmedAt: c.confirmedAt?.toISOString() ?? null,
    confirmedBy: c.confirmedBy,
    createdAt: c.createdAt.toISOString(),
  }
}

// GET /api/v1/groups/:groupId/pot
potRouter.get('/', async (req: Request<{ groupId: string }>, res: Response) => {
  const pot = await prisma.groupPot.findUnique({
    where: { groupId: req.params.groupId },
    include: {
      contributions: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!pot) return res.json({ data: null })

  const totalConfirmed = pot.contributions
    .filter((c) => c.status === 'CONFIRMED')
    .reduce((acc, c) => acc + Number(c.amount), 0)

  res.json({
    data: {
      id: pot.id,
      paypalMe: pot.paypalMe,
      enabled: pot.enabled,
      totalConfirmed: totalConfirmed.toFixed(2),
      contributions: pot.contributions.map(formatContribution),
    },
  })
})

// PUT /api/v1/groups/:groupId/pot — crear o actualizar (solo admin)
potRouter.put('/', requireGroupAdmin, async (req: Request<{ groupId: string }>, res: Response) => {
  const result = ConfigurePotSchema.safeParse(req.body)
  if (!result.success) throw AppError.badRequest('Datos inválidos')

  const pot = await prisma.groupPot.upsert({
    where: { groupId: req.params.groupId },
    create: { groupId: req.params.groupId, ...result.data },
    update: result.data,
  })

  res.json({ data: { id: pot.id, paypalMe: pot.paypalMe, enabled: pot.enabled } })
})

// POST /api/v1/groups/:groupId/pot/contributions — miembro registra intención de pago
potRouter.post('/contributions', async (req: Request<{ groupId: string }>, res: Response) => {
  const result = CreateContributionSchema.safeParse(req.body)
  if (!result.success) throw AppError.badRequest('Datos inválidos')

  const pot = await prisma.groupPot.findUnique({ where: { groupId: req.params.groupId } })
  if (!pot || !pot.enabled) throw AppError.notFound('El bote no está configurado en este grupo')

  const contribution = await prisma.potContribution.create({
    data: {
      potId: pot.id,
      groupId: req.params.groupId,
      userId: req.user!.userId,
      amount: result.data.amount,
      notes: result.data.notes,
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  res.status(201).json({ data: formatContribution(contribution) })
})

// PATCH /api/v1/groups/:groupId/pot/contributions/:id/confirm — admin confirma recepción
potRouter.patch('/contributions/:id/confirm', requireGroupAdmin, async (req: Request<{ groupId: string; id: string }>, res: Response) => {
  const contribution = await prisma.potContribution.findFirst({
    where: { id: req.params.id, groupId: req.params.groupId, status: 'PENDING' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
  if (!contribution) throw AppError.notFound('Contribución no encontrada o ya confirmada')

  const updated = await prisma.potContribution.update({
    where: { id: req.params.id },
    data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedBy: req.user!.userId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  res.json({ data: formatContribution(updated) })
})

// DELETE /api/v1/groups/:groupId/pot/contributions/:id — cancelar
potRouter.delete('/contributions/:id', async (req: Request<{ groupId: string; id: string }>, res: Response) => {
  const contribution = await prisma.potContribution.findFirst({
    where: { id: req.params.id, groupId: req.params.groupId },
  })
  if (!contribution) throw AppError.notFound('Contribución no encontrada')

  const isAdmin = (req as Request & { memberRole?: string }).memberRole === 'ADMIN'
  const isOwner = contribution.userId === req.user!.userId
  if (!isAdmin && !isOwner) throw AppError.forbidden('No tienes permiso para cancelar esta contribución')
  if (contribution.status === 'CONFIRMED') throw AppError.badRequest('No se puede cancelar una contribución ya confirmada')

  await prisma.potContribution.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  })

  res.status(204).send()
})
