import { Request, Response } from 'express'
import { groupsService } from './groups.service'

export const groupsHandler = {
  async getMyGroups(req: Request, res: Response) {
    const groups = await groupsService.getMyGroups(req.user!.userId)
    res.json({ data: groups })
  },

  async getGroupById(req: Request, res: Response) {
    const group = await groupsService.getGroupById(req.params.groupId, req.user!.userId)
    res.json({ data: group })
  },

  async createGroup(req: Request, res: Response) {
    const group = await groupsService.createGroup(req.body, req.user!.userId)
    res.status(201).json({ data: group })
  },

  async updateGroup(req: Request, res: Response) {
    const group = await groupsService.updateGroup(req.params.groupId, req.body)
    res.json({ data: group })
  },

  async deleteGroup(req: Request, res: Response) {
    await groupsService.deleteGroup(req.params.groupId)
    res.json({ data: { message: 'Grupo eliminado correctamente' } })
  },

  async joinGroup(req: Request, res: Response) {
    const group = await groupsService.joinGroup(req.body.inviteCode, req.user!.userId)
    res.json({ data: group })
  },

  async leaveGroup(req: Request, res: Response) {
    await groupsService.removeMember(req.params.groupId, req.user!.userId, req.user!.userId)
    res.json({ data: { message: 'Has salido del grupo' } })
  },

  async removeMember(req: Request, res: Response) {
    await groupsService.removeMember(req.params.groupId, req.params.userId, req.user!.userId)
    res.json({ data: { message: 'Miembro eliminado del grupo' } })
  },

  async updateMemberRole(req: Request, res: Response) {
    await groupsService.updateMemberRole(req.params.groupId, req.params.userId, req.body.role)
    res.json({ data: { message: 'Rol actualizado correctamente' } })
  },

  async regenerateInviteCode(req: Request, res: Response) {
    const result = await groupsService.regenerateInviteCode(req.params.groupId)
    res.json({ data: result })
  },
}
