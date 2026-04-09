import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../shared/middleware/authenticate'
import { prisma } from '../../shared/lib/prisma'

export const notificationsRouter = Router()

notificationsRouter.use(authenticate)

notificationsRouter.get('/', async (req, res) => {
  const { read, page = '1', limit = '20' } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

  const where: Record<string, unknown> = { userId: req.user!.userId }
  if (read === 'true') where.readAt = { not: null }
  if (read === 'false') where.readAt = null

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user!.userId, readAt: null } }),
  ])

  res.json({
    data: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    })),
    meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), unreadCount },
  })
})

notificationsRouter.post('/read', async (req, res) => {
  const schema = z.object({
    notificationIds: z.union([z.array(z.string()), z.literal('all')]),
  })

  const { notificationIds } = schema.parse(req.body)
  const userId = req.user!.userId

  let count: number
  if (notificationIds === 'all') {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
    count = result.count
  } else {
    const result = await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId, readAt: null },
      data: { readAt: new Date() },
    })
    count = result.count
  }

  res.json({ data: { markedAsRead: count } })
})
