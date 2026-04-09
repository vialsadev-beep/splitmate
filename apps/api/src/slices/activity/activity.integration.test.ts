import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../../shared/lib/prisma'
import { cleanDatabase, registerUser, createGroup, authHeader } from '../../shared/test/helpers'

beforeAll(() => cleanDatabase())
afterAll(() => prisma.$disconnect())

describe('GET /api/v1/groups/:groupId/activity', () => {
  it('devuelve feed vacío cuando no hay gastos ni pagos', async () => {
    const { accessToken } = await registerUser()
    const group = await createGroup(accessToken)

    const res = await request(app)
      .get(`/api/v1/groups/${group.id}/activity`)
      .set(authHeader(accessToken))
      .expect(200)

    expect(res.body.data).toHaveLength(0)
    expect(res.body.meta.total).toBe(0)
  })

  it('incluye gastos creados en el feed', async () => {
    const { accessToken, userId } = await registerUser()
    const group = await createGroup(accessToken)

    await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set(authHeader(accessToken))
      .send({ title: 'Taxi', amount: '20.00', payerId: userId, splitType: 'EQUAL', participantIds: [userId] })
      .expect(201)

    const res = await request(app)
      .get(`/api/v1/groups/${group.id}/activity`)
      .set(authHeader(accessToken))
      .expect(200)

    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].type).toBe('EXPENSE_CREATED')
    expect(res.body.data[0].title).toBe('Taxi')
    expect(res.body.data[0].amount).toBe('20.00')
  })

  it('incluye gastos eliminados con tipo EXPENSE_DELETED', async () => {
    const { accessToken, userId } = await registerUser()
    const group = await createGroup(accessToken)

    const created = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set(authHeader(accessToken))
      .send({ title: 'Borrable', amount: '5.00', payerId: userId, splitType: 'EQUAL', participantIds: [userId] })
      .expect(201)

    await request(app)
      .delete(`/api/v1/groups/${group.id}/expenses/${created.body.data.id}`)
      .set(authHeader(accessToken))
      .expect(200)

    const res = await request(app)
      .get(`/api/v1/groups/${group.id}/activity`)
      .set(authHeader(accessToken))
      .expect(200)

    const types = res.body.data.map((item: { type: string }) => item.type)
    expect(types).toContain('EXPENSE_DELETED')
  })

  it('devuelve 403 si no eres miembro', async () => {
    const owner = await registerUser()
    const stranger = await registerUser()
    const group = await createGroup(owner.accessToken)

    await request(app)
      .get(`/api/v1/groups/${group.id}/activity`)
      .set(authHeader(stranger.accessToken))
      .expect(403)
  })
})

describe('GET /api/v1/groups/:groupId/expenses?search=', () => {
  it('filtra gastos por título (case insensitive)', async () => {
    const { accessToken, userId } = await registerUser()
    const group = await createGroup(accessToken)

    await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set(authHeader(accessToken))
      .send({ title: 'Cena en restaurante', amount: '40.00', payerId: userId, splitType: 'EQUAL', participantIds: [userId] })

    await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set(authHeader(accessToken))
      .send({ title: 'Taxi al aeropuerto', amount: '25.00', payerId: userId, splitType: 'EQUAL', participantIds: [userId] })

    const res = await request(app)
      .get(`/api/v1/groups/${group.id}/expenses?search=CENA`)
      .set(authHeader(accessToken))
      .expect(200)

    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].title).toBe('Cena en restaurante')
  })

  it('devuelve lista vacía si no hay coincidencias', async () => {
    const { accessToken, userId } = await registerUser()
    const group = await createGroup(accessToken)

    await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set(authHeader(accessToken))
      .send({ title: 'Supermercado', amount: '60.00', payerId: userId, splitType: 'EQUAL', participantIds: [userId] })

    const res = await request(app)
      .get(`/api/v1/groups/${group.id}/expenses?search=zzznomatch`)
      .set(authHeader(accessToken))
      .expect(200)

    expect(res.body.data).toHaveLength(0)
    expect(res.body.meta.total).toBe(0)
  })
})
