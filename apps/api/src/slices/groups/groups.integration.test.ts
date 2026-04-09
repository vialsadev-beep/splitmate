import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../../shared/lib/prisma'
import { cleanDatabase, registerUser, createGroup, authHeader } from '../../shared/test/helpers'

beforeAll(() => cleanDatabase())
afterAll(() => prisma.$disconnect())

describe('Grupos — CRUD completo', () => {
  describe('POST /api/v1/groups', () => {
    it('crea un grupo y el creador queda como ADMIN', async () => {
      const { accessToken, userId } = await registerUser()
      const res = await request(app)
        .post('/api/v1/groups')
        .set(authHeader(accessToken))
        .send({ name: 'Viaje a Roma', currency: 'EUR', emoji: '🏛️' })
        .expect(201)

      expect(res.body.data.name).toBe('Viaje a Roma')
      expect(res.body.data.inviteCode).toBeDefined()
      const adminMember = res.body.data.members.find((m: { userId: string }) => m.userId === userId)
      expect(adminMember?.role).toBe('ADMIN')
    })

    it('devuelve 400 con nombre vacío', async () => {
      const { accessToken } = await registerUser()
      await request(app)
        .post('/api/v1/groups')
        .set(authHeader(accessToken))
        .send({ name: '', currency: 'EUR' })
        .expect(400)
    })

    it('devuelve 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/groups')
        .send({ name: 'Test', currency: 'EUR' })
        .expect(401)
    })
  })

  describe('GET /api/v1/groups', () => {
    it('lista solo los grupos del usuario', async () => {
      const user1 = await registerUser()
      const user2 = await registerUser()
      await createGroup(user1.accessToken, { name: 'Grupo de User1' })
      await createGroup(user2.accessToken, { name: 'Grupo de User2' })

      const res = await request(app)
        .get('/api/v1/groups')
        .set(authHeader(user1.accessToken))
        .expect(200)

      const names = res.body.data.map((g: { name: string }) => g.name)
      expect(names).toContain('Grupo de User1')
      expect(names).not.toContain('Grupo de User2')
    })
  })

  describe('GET /api/v1/groups/:groupId', () => {
    it('devuelve el grupo con sus miembros', async () => {
      const { accessToken } = await registerUser()
      const group = await createGroup(accessToken)

      const res = await request(app)
        .get(`/api/v1/groups/${group.id}`)
        .set(authHeader(accessToken))
        .expect(200)

      expect(res.body.data.id).toBe(group.id)
      expect(res.body.data.members).toHaveLength(1)
    })

    it('devuelve 403 si no eres miembro', async () => {
      const owner = await registerUser()
      const stranger = await registerUser()
      const group = await createGroup(owner.accessToken)

      await request(app)
        .get(`/api/v1/groups/${group.id}`)
        .set(authHeader(stranger.accessToken))
        .expect(403)
    })
  })

  describe('POST /api/v1/groups/join (inviteCode)', () => {
    it('un usuario puede unirse con el código de invitación', async () => {
      const owner = await registerUser()
      const joiner = await registerUser()
      const group = await createGroup(owner.accessToken)

      await request(app)
        .post('/api/v1/groups/join')
        .set(authHeader(joiner.accessToken))
        .send({ inviteCode: group.inviteCode })
        .expect(200)

      // El joiner ahora puede ver el grupo
      const res = await request(app)
        .get(`/api/v1/groups/${group.id}`)
        .set(authHeader(joiner.accessToken))
        .expect(200)

      expect(res.body.data.members).toHaveLength(2)
    })

    it('devuelve 409 si ya eres miembro', async () => {
      const owner = await registerUser()
      const group = await createGroup(owner.accessToken)

      await request(app)
        .post('/api/v1/groups/join')
        .set(authHeader(owner.accessToken))
        .send({ inviteCode: group.inviteCode })
        .expect(409)
    })

    it('devuelve 404 con código inválido', async () => {
      const { accessToken } = await registerUser()
      await request(app)
        .post('/api/v1/groups/join')
        .set(authHeader(accessToken))
        .send({ inviteCode: 'codigo-inexistente' })
        .expect(404)
    })
  })

  describe('PATCH /api/v1/groups/:groupId', () => {
    it('el admin puede actualizar el grupo', async () => {
      const { accessToken } = await registerUser()
      const group = await createGroup(accessToken)

      const res = await request(app)
        .patch(`/api/v1/groups/${group.id}`)
        .set(authHeader(accessToken))
        .send({ name: 'Nombre actualizado' })
        .expect(200)

      expect(res.body.data.name).toBe('Nombre actualizado')
    })

    it('un MEMBER no puede actualizar el grupo', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const group = await createGroup(owner.accessToken)

      await request(app)
        .post('/api/v1/groups/join')
        .set(authHeader(member.accessToken))
        .send({ inviteCode: group.inviteCode })

      await request(app)
        .patch(`/api/v1/groups/${group.id}`)
        .set(authHeader(member.accessToken))
        .send({ name: 'Hack' })
        .expect(403)
    })
  })
})

describe('Seguridad — IDOR entre grupos', () => {
  it('no se puede acceder a un grupo ajeno con /:groupId de otro grupo', async () => {
    const user1 = await registerUser()
    const user2 = await registerUser()
    const group2 = await createGroup(user2.accessToken, { name: 'Grupo Privado de User2' })

    await request(app)
      .get(`/api/v1/groups/${group2.id}`)
      .set(authHeader(user1.accessToken))
      .expect(403)
  })
})
