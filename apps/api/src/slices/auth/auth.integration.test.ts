import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../../shared/lib/prisma'
import { cleanDatabase, registerUser, authHeader, uniqueEmail } from '../../shared/test/helpers'

beforeAll(() => cleanDatabase())
afterAll(() => prisma.$disconnect())

describe('POST /api/v1/auth/register', () => {
  it('registra un usuario nuevo y devuelve accessToken + user', async () => {
    const email = uniqueEmail('reg')
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123!', name: 'Test User' })
      .expect(201)

    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.user.email).toBe(email)
    expect(res.body.data).not.toHaveProperty('refreshToken') // no en body
    expect(res.headers['set-cookie']).toBeDefined() // sí en cookie
  })

  it('devuelve 409 si el email ya existe', async () => {
    const email = uniqueEmail('dup')
    await request(app).post('/api/v1/auth/register').send({ email, password: 'Password123!', name: 'Usuario Uno' })
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123!', name: 'Usuario Dos' })
      .expect(409)

    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('devuelve 400 con email inválido', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'Password123!', name: 'X' })
      .expect(400)

    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('devuelve 400 con contraseña vacía', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail(), password: '', name: 'X' })
      .expect(400)

    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/v1/auth/login', () => {
  const email = uniqueEmail('login')
  const password = 'Password123!'

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ email, password, name: 'Login User' })
  })

  it('devuelve accessToken con credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200)

    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data).not.toHaveProperty('refreshToken')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('devuelve 401 con contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401)

    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('devuelve 401 con email que no existe', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'noexiste@test.local', password })
      .expect(401)

    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })
})

describe('GET /api/v1/auth/me', () => {
  it('devuelve el perfil del usuario autenticado', async () => {
    const { accessToken, email } = await registerUser()
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(accessToken))
      .expect(200)

    expect(res.body.data.email).toBe(email)
    expect(res.body.data).not.toHaveProperty('passwordHash')
  })

  it('devuelve 401 sin token', async () => {
    await request(app).get('/api/v1/auth/me').expect(401)
  })

  it('devuelve 401 con token inválido', async () => {
    await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401)
  })
})

describe('POST /api/v1/auth/refresh', () => {
  it('renueva el accessToken usando la cookie de refresh', async () => {
    const email = uniqueEmail('refresh')
    // Login para obtener la cookie rt
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' })
      .expect(401) // no existe todavía — registrar primero

    await request(app).post('/api/v1/auth/register').send({ email, password: 'Password123!', name: 'Refresh User' })
    const loginRes2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' })
      .expect(200)

    const cookie = loginRes2.headers['set-cookie']
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .expect(200)

    expect(refreshRes.body.data.accessToken).toBeDefined()
    expect(refreshRes.body.data).not.toHaveProperty('refreshToken')
  })

  it('devuelve 401 sin cookie de refresh', async () => {
    await request(app).post('/api/v1/auth/refresh').expect(401)
  })
})

describe('POST /api/v1/auth/logout', () => {
  it('revoca la sesión y limpia la cookie', async () => {
    const { accessToken } = await registerUser()
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set(authHeader(accessToken))
      .expect(200)

    expect(res.body.data.message).toBeDefined()
    // La cookie rt debe borrarse (Set-Cookie con expires en el pasado)
    const cookie = res.headers['set-cookie']?.[0] ?? ''
    expect(cookie).toMatch(/rt=;/)
  })
})
