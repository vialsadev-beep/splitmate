import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SYSTEM_CATEGORIES = [
  { name: 'Comida y bebida', emoji: '🍽️', color: '#FF6B6B' },
  { name: 'Alojamiento', emoji: '🏠', color: '#4ECDC4' },
  { name: 'Transporte', emoji: '🚗', color: '#45B7D1' },
  { name: 'Ocio y entretenimiento', emoji: '🎉', color: '#96CEB4' },
  { name: 'Compras', emoji: '🛒', color: '#FFEAA7' },
  { name: 'Salud', emoji: '🏥', color: '#DDA0DD' },
  { name: 'Servicios', emoji: '💡', color: '#98D8C8' },
  { name: 'Otros', emoji: '📦', color: '#B8B8B8' },
]

async function main() {
  console.log('🌱 Starting seed...')

  // Categorías globales del sistema
  for (const cat of SYSTEM_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        id: `system_${cat.name.toLowerCase().replace(/\s/g, '_')}`,
      },
      update: {},
      create: {
        id: `system_${cat.name.toLowerCase().replace(/\s/g, '_')}`,
        groupId: null,
        name: cat.name,
        emoji: cat.emoji,
        color: cat.color,
      },
    })
  }

  console.log(`✅ ${SYSTEM_CATEGORIES.length} system categories created`)

  // Usuarios de desarrollo
  if (process.env.NODE_ENV !== 'production') {
    const passwordHash = await bcrypt.hash('Password123', 12)

    const ana = await prisma.user.upsert({
      where: { email: 'ana@dev.local' },
      update: {},
      create: {
        email: 'ana@dev.local',
        name: 'Ana García',
        passwordHash,
        locale: 'es',
      },
    })

    const bob = await prisma.user.upsert({
      where: { email: 'bob@dev.local' },
      update: {},
      create: {
        email: 'bob@dev.local',
        name: 'Bob Martínez',
        passwordHash,
        locale: 'es',
      },
    })

    const carl = await prisma.user.upsert({
      where: { email: 'carl@dev.local' },
      update: {},
      create: {
        email: 'carl@dev.local',
        name: 'Carl López',
        passwordHash,
        locale: 'es',
      },
    })

    // Grupo de ejemplo
    const group = await prisma.group.upsert({
      where: { inviteCode: 'demo-group-invite' },
      update: {},
      create: {
        name: 'Viaje a Lisboa',
        emoji: '✈️',
        currency: 'EUR',
        inviteCode: 'demo-group-invite',
        members: {
          create: [
            { userId: ana.id, role: 'ADMIN' },
            { userId: bob.id, role: 'MEMBER' },
            { userId: carl.id, role: 'MEMBER' },
          ],
        },
      },
    })

    // Gastos de ejemplo
    const foodCategoryId = `system_comida_y_bebida`

    const expense1 = await prisma.expense.create({
      data: {
        groupId: group.id,
        payerId: ana.id,
        title: 'Cena en el puerto',
        amount: '87.50',
        currency: 'EUR',
        splitType: 'EQUAL',
        categoryId: foodCategoryId,
        date: new Date('2026-09-15T21:30:00Z'),
        splits: {
          create: [
            { userId: ana.id, amount: '29.17', isPaid: true },
            { userId: bob.id, amount: '29.17', isPaid: false },
            { userId: carl.id, amount: '29.16', isPaid: false },
          ],
        },
      },
    })

    await prisma.expense.create({
      data: {
        groupId: group.id,
        payerId: bob.id,
        title: 'Taxi al aeropuerto',
        amount: '45.00',
        currency: 'EUR',
        splitType: 'EQUAL',
        date: new Date('2026-09-16T08:00:00Z'),
        splits: {
          create: [
            { userId: ana.id, amount: '15.00', isPaid: false },
            { userId: bob.id, amount: '15.00', isPaid: true },
            { userId: carl.id, amount: '15.00', isPaid: false },
          ],
        },
      },
    })

    console.log(`✅ Dev users created: ana, bob, carl (password: Password123)`)
    console.log(`✅ Demo group created: "${group.name}" (inviteCode: demo-group-invite)`)
    console.log(`✅ Demo expenses created`)
  }

  console.log('🎉 Seed completed!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
