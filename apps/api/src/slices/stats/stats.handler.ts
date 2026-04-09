import { Request, Response } from 'express'
import { statsService } from './stats.service'

export const statsHandler = {
  async getGroupStats(req: Request, res: Response) {
    const stats = await statsService.getGroupStats(req.params.groupId)
    res.json({ data: stats })
  },
}
