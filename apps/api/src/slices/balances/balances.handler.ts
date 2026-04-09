import { Request, Response } from 'express'
import { balancesService } from './balances.service'

export const balancesHandler = {
  async getGroupBalances(req: Request, res: Response) {
    const result = await balancesService.getGroupBalances(req.params.groupId)
    res.json({ data: result })
  },

  async getSimplifiedBalances(req: Request, res: Response) {
    const result = await balancesService.getSimplifiedBalances(req.params.groupId)
    res.json({ data: result })
  },

  async getMyBalance(req: Request, res: Response) {
    const result = await balancesService.getMyBalance(req.params.groupId, req.user!.userId)
    res.json({ data: result })
  },
}
