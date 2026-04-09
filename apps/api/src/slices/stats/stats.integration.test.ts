import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../../shared/lib/prisma'
import { cleanDatabase, registerUser, createGroup, authHeader } from '../../shared/test/helpers'

beforeAll(() => cleanDatabase())
afterAll(() => prisma.$disconnect())

describe('GET /api/v1/groups/:groupId/stats', () => {
  it('devuelve stats vacías cuando no hay gastos', async () => {
    const { accessToken } = await registerUser()
    const group = await createGroup(accessToken)

    const res = await request(app)
      .get(`/api/v1/groups/${group.id}/stats`)
      .set(authHeader(accessToken))
      .expect(200)

    expect(res.body.data.totalCount).toBe(0)
    expect(res.body.data.totalExpenses).toBe('0.00')
    expect(res.body.data.byCategory).toHaveLength(0)
    expect(res.body.data.byMonth).toHaveLength(6) // siempre 6 meses
  })

  it('calcula totales y desglose por categoría correctamente', async () => {
    const { accessToken, userId } = await registerUser()
    const member = await registerUser()
    const group = await createGroup(accessToken)
    await request(app)
      .post('/api/v1/groups/join')
      .set(authHeader(member.accessToken))
      .send({ inviteCode: group.inviteCode })

    // Dos gastos iguales → 50% cada uno si hubiera categoría, aquí sin categoría
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`/api/v1/groups/${group.id}/expenses`)
        .set(authHeader(accessToken))
        .send({
          title: `Gasto ${i}`,
          amount: '30.00',
          payerId: userId,
          splitType: 'EQUAL',
          participantIds: [userId, member.userId],
        })
    }

    const res = await request(app)
      .get(`/api/v1/groups/${group.id}/stats`)
      .set(authHeader(accessToken))
      .expect(200)

    expect(res.body.data.totalCount).toBe(3)
    expect(res.body.data.totalExpenses).toBe('90.00')
    expect(parseFloat(res.body.data.avgExpense)).toBeCloseTo(30, 1)
    expect(res.body.data.byMember).toHaveLength(2)
    // El pagador aparece primero (mayor totalPaid)
    expect(res.body.data.byMember[0].userId).toBe(userId)
    expect(res.body.data.byMember[0].totalPaid).toBe('90.00')
  })

  it('devuelve 403 si no eres miembro del grupo', async () => {
    const owner = await registerUser()
    const stranger = await registerUser()
    const group = await createGroup(owner.accessToken)

    await request(app)
      .get(`/api/v1/groups/${group.id}/stats`)
      .set(authHeader(stranger.accessToken))
      .expect(403)
  })
})
