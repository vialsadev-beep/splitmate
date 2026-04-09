import { Request, Response } from 'express'
import { z } from 'zod'
import { AppError } from '../../shared/errors/AppError'
import { activityService } from './activity.service'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const activityHandler = {
  async getFeed(req: Request, res: Response) {
    const result = QuerySchema.safeParse(req.query)
    if (!result.success) throw AppError.badRequest('Parámetros inválidos')
    const { page, limit } = result.data
    const feed = await activityService.getFeed(req.params.groupId, page, limit)
    res.json(feed)
  },
}
