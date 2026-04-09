/**
 * Helpers compartidos para tests de integración.
 * Requiere DB real — solo usar con vitest.integration.config.ts
 */
import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../lib/prisma'

// ─── Limpieza de DB ───────────────────────────────────────────

/** Borra todas las filas en el orden correcto (FK) */
export async function cleanDatabase() {
  // CASCADE maneja las FK automáticamente desde las tablas raíz
  await prisma.$executeRawUnsafe('TRUNCATE TABLE audit_logs, notifications, expense_splits, expenses, payments, budgets, group_members, groups, refresh_tokens, oauth_accounts, users CASCADE')
  // Las categorías de sistema (groupId IS NULL) se preservan intencionalmente
  await prisma.$executeRawUnsafe('DELETE FROM categories WHERE "groupId" IS NOT NULL')
}

// ─── Auth helpers ────────────────────────────────────────────

interface RegisteredUser {
  accessToken: string
  userId: string
  email: string
}

let _counter = 0
export function uniqueEmail(prefix = 'user') {
  return `${prefix}_${++_counter}_${Date.now()}@test.local`
}

export async function registerUser(
  email = uniqueEmail(),
  password = 'Password123!',
  name = 'Test User',
): Promise<RegisteredUser> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password, name })
    .expect(201)

  return {
    accessToken: res.body.data.accessToken,
    userId: res.body.data.user.id,
    email,
  }
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── Group helpers ────────────────────────────────────────────

export async function createGroup(
  accessToken: string,
  overrides: Partial<{ name: string; currency: string; emoji: string }> = {},
) {
  const res = await request(app)
    .post('/api/v1/groups')
    .set(authHeader(accessToken))
    .send({ name: 'Test Group', currency: 'EUR', ...overrides })
    .expect(201)

  return res.body.data as { id: string; inviteCode: string; name: string }
}
