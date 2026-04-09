import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../../shared/lib/prisma'
import { cleanDatabase, registerUser, createGroup, authHeader } from '../../shared/test/helpers'

beforeAll(() => cleanDatabase())
afterAll(() => prisma.$disconnect())

describe('Gastos — CRUD', () => {
  describe('POST /api/v1/groups/:groupId/expenses', () => {
    it('crea un gasto con split EQUAL', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const group = await createGroup(owner.accessToken)

      await request(app)
        .post('/api/v1/groups/join')
        .set(authHeader(member.accessToken))
        .send({ inviteCode: group.inviteCode })

      const res = await request(app)
        .post(`/api/v1/groups/${group.id}/expenses`)
        .set(authHeader(owner.accessToken))
        .send({
          title: 'Cena italiana',
          amount: '60.00',
          payerId: owner.userId,
          splitType: 'EQUAL',
          participantIds: [owner.userId, member.userId],
        })
        .expect(201)

      expect(res.body.data.title).toBe('Cena italiana')
      expect(res.body.data.amount).toBe('60.00')
      expect(res.body.data.splits).toHaveLength(2)
      expect(res.body.data.splits[0].amount).toBe('30.00')
    })

    it('devuelve 403 si no eres miembro del grupo', async () => {
      const owner = await registerUser()
      const stranger = await registerUser()
      const group = await createGroup(owner.accessToken)

      await request(app)
        .post(`/api/v1/groups/${group.id}/expenses`)
        .set(authHeader(stranger.accessToken))
        .send({
          title: 'Hack',
          amount: '10',
          payerId: stranger.userId,
          splitType: 'EQUAL',
          participantIds: [stranger.userId],
        })
        .expect(403)
    })

    it('devuelve 422 si el pagador no es miembro del grupo', async () => {
      const owner = await registerUser()
      const outsider = await registerUser()
      const group = await createGroup(owner.accessToken)

      const res = await request(app)
        .post(`/api/v1/groups/${group.id}/expenses`)
        .set(authHeader(owner.accessToken))
        .send({
          title: 'Test',
          amount: '10',
          payerId: outsider.userId,
          splitType: 'EQUAL',
          participantIds: [owner.userId],
        })
        .expect(422)

      expect(res.body.error.code).toBe('USER_NOT_IN_GROUP')
    })
  })

  describe('GET /api/v1/groups/:groupId/expenses', () => {
    it('lista gastos del grupo con paginación', async () => {
      const { accessToken, userId } = await registerUser()
      const group = await createGroup(accessToken)

      // Crear 3 gastos
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post(`/api/v1/groups/${group.id}/expenses`)
          .set(authHeader(accessToken))
          .send({
            title: `Gasto ${i}`,
            amount: `${i * 10}.00`,
            payerId: userId,
            splitType: 'EQUAL',
            participantIds: [userId],
          })
      }

      const res = await request(app)
        .get(`/api/v1/groups/${group.id}/expenses?page=1&limit=2`)
        .set(authHeader(accessToken))
        .expect(200)

      expect(res.body.data).toHaveLength(2)
      expect(res.body.meta.total).toBe(3)
      expect(res.body.meta.totalPages).toBe(2)
    })
  })

  describe('DELETE /api/v1/groups/:groupId/expenses/:expenseId', () => {
    it('el pagador puede eliminar su gasto', async () => {
      const { accessToken, userId } = await registerUser()
      const group = await createGroup(accessToken)

      const created = await request(app)
        .post(`/api/v1/groups/${group.id}/expenses`)
        .set(authHeader(accessToken))
        .send({ title: 'A borrar', amount: '10', payerId: userId, splitType: 'EQUAL', participantIds: [userId] })
        .expect(201)

      await request(app)
        .delete(`/api/v1/groups/${group.id}/expenses/${created.body.data.id}`)
        .set(authHeader(accessToken))
        .expect(200)

      // Ya no aparece en el listado
      const list = await request(app)
        .get(`/api/v1/groups/${group.id}/expenses`)
        .set(authHeader(accessToken))
        .expect(200)

      const ids = list.body.data.map((e: { id: string }) => e.id)
      expect(ids).not.toContain(created.body.data.id)
    })
  })
})

describe('PATCH /api/v1/groups/:groupId/expenses/:expenseId', () => {
  it('actualiza metadata sin recalcular splits', async () => {
    const { accessToken, userId } = await registerUser()
    const group = await createGroup(accessToken)

    const created = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set(authHeader(accessToken))
      .send({ title: 'Original', amount: '30.00', payerId: userId, splitType: 'EQUAL', participantIds: [userId] })
      .expect(201)

    const res = await request(app)
      .patch(`/api/v1/groups/${group.id}/expenses/${created.body.data.id}`)
      .set(authHeader(accessToken))
      .send({ title: 'Editado', notes: 'nota actualizada' })
      .expect(200)

    expect(res.body.data.title).toBe('Editado')
    expect(res.body.data.notes).toBe('nota actualizada')
    expect(res.body.data.amount).toBe('30.00') // no cambió
    expect(res.body.data.splits).toHaveLength(1)
  })

  it('recalcula splits al cambiar el importe', async () => {
    const { accessToken, userId } = await registerUser()
    const member = await registerUser()
    const group = await createGroup(accessToken)
    await request(app)
      .post('/api/v1/groups/join')
      .set(authHeader(member.accessToken))
      .send({ inviteCode: group.inviteCode })

    const created = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set(authHeader(accessToken))
      .send({
        title: 'Cena',
        amount: '60.00',
        payerId: userId,
        splitType: 'EQUAL',
        participantIds: [userId, member.userId],
      })
      .expect(201)

    const res = await request(app)
      .patch(`/api/v1/groups/${group.id}/expenses/${created.body.data.id}`)
      .set(authHeader(accessToken))
      .send({
        amount: '100.00',
        payerId: userId,
        splitType: 'EQUAL',
        participantIds: [userId, member.userId],
      })
      .expect(200)

    expect(res.body.data.amount).toBe('100.00')
    expect(res.body.data.splits).toHaveLength(2)
    expect(res.body.data.splits[0].amount).toBe('50.00')
  })

  it('devuelve 403 si no eres el pagador', async () => {
    const owner = await registerUser()
    const member = await registerUser()
    const group = await createGroup(owner.accessToken)
    await request(app)
      .post('/api/v1/groups/join')
      .set(authHeader(member.accessToken))
      .send({ inviteCode: group.inviteCode })

    const created = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set(authHeader(owner.accessToken))
      .send({ title: 'De owner', amount: '20.00', payerId: owner.userId, splitType: 'EQUAL', participantIds: [owner.userId] })
      .expect(201)

    await request(app)
      .patch(`/api/v1/groups/${group.id}/expenses/${created.body.data.id}`)
      .set(authHeader(member.accessToken))
      .send({ title: 'Intento de hack' })
      .expect(403)
  })

  it('devuelve 404 al editar gasto de otro grupo (IDOR)', async () => {
    const user1 = await registerUser()
    const user2 = await registerUser()
    const group1 = await createGroup(user1.accessToken)
    const group2 = await createGroup(user2.accessToken)

    const expense = await request(app)
      .post(`/api/v1/groups/${group2.id}/expenses`)
      .set(authHeader(user2.accessToken))
      .send({ title: 'Privado', amount: '50', payerId: user2.userId, splitType: 'EQUAL', participantIds: [user2.userId] })
      .expect(201)

    await request(app)
      .patch(`/api/v1/groups/${group1.id}/expenses/${expense.body.data.id}`)
      .set(authHeader(user1.accessToken))
      .send({ title: 'Hack' })
      .expect(404)
  })
})

describe('Seguridad — IDOR en gastos', () => {
  it('no se puede leer un gasto de otro grupo usando su ID', async () => {
    const user1 = await registerUser()
    const user2 = await registerUser()
    const group1 = await createGroup(user1.accessToken)
    const group2 = await createGroup(user2.accessToken)

    // user2 crea un gasto en group2
    const expense = await request(app)
      .post(`/api/v1/groups/${group2.id}/expenses`)
      .set(authHeader(user2.accessToken))
      .send({ title: 'Secreto', amount: '100', payerId: user2.userId, splitType: 'EQUAL', participantIds: [user2.userId] })
      .expect(201)

    // user1 intenta leer ese gasto usando group1 como scope
    const res = await request(app)
      .get(`/api/v1/groups/${group1.id}/expenses/${expense.body.data.id}`)
      .set(authHeader(user1.accessToken))
      .expect(404) // 404, no revela que existe

    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('no se puede borrar un gasto de otro grupo', async () => {
    const user1 = await registerUser()
    const user2 = await registerUser()
    const group1 = await createGroup(user1.accessToken)
    const group2 = await createGroup(user2.accessToken)

    const expense = await request(app)
      .post(`/api/v1/groups/${group2.id}/expenses`)
      .set(authHeader(user2.accessToken))
      .send({ title: 'Privado', amount: '50', payerId: user2.userId, splitType: 'EQUAL', participantIds: [user2.userId] })
      .expect(201)

    await request(app)
      .delete(`/api/v1/groups/${group1.id}/expenses/${expense.body.data.id}`)
      .set(authHeader(user1.accessToken))
      .expect(404)
  })
})
