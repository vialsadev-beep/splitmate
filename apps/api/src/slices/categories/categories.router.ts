import { Router } from 'express'
import { authenticate } from '../../shared/middleware/authenticate'
import { prisma } from '../../shared/lib/prisma'

export const categoriesRouter = Router()

categoriesRouter.use(authenticate)

// Listar categorías del sistema + las del grupo si se pasa groupId
categoriesRouter.get('/', async (req, res) => {
  const groupId = req.query.groupId as string | undefined

  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { groupId: null }, // categorías del sistema
        ...(groupId ? [{ groupId }] : []),
      ],
    },
    orderBy: { name: 'asc' },
  })

  res.json({ data: categories })
})
