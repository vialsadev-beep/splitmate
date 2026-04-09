import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../../shared/lib/prisma'
import { balancesRepository, type UserNetBalance } from './balances.repository'
import { balancesCache } from './balances.cache'
import { AppError } from '../../shared/errors/AppError'

interface DebtTransfer {
  from: { id: string; name: string; avatarUrl: string | null }
  to: { id: string; name: string; avatarUrl: string | null; paypalMe: string | null }
  amount: string
}

/**
 * Algoritmo Greedy de simplificación de deudas.
 *
 * Dada una lista de balances netos (positivo = acreedor, negativo = deudor),
 * calcula el conjunto mínimo de transferencias para saldar todas las deudas.
 *
 * Complejidad: O(n log n)
 *
 * @param balances Lista de UserNetBalance del grupo
 * @returns Lista de transferencias {from, to, amount}
 */
export function simplifyDebts(balances: UserNetBalance[]): DebtTransfer[] {
  const EPSILON = new Decimal('0.01')
  const result: DebtTransfer[] = []

  // Separar acreedores y deudores, filtrando balances ≈ 0
  const creditors = balances
    .filter((b) => b.balance.greaterThan(EPSILON))
    .map((b) => ({ ...b, balance: b.balance.toDecimalPlaces(2) }))
    .sort((a, b) => b.balance.comparedTo(a.balance)) // desc

  const debtors = balances
    .filter((b) => b.balance.lessThan(EPSILON.negated()))
    .map((b) => ({ ...b, balance: b.balance.abs().toDecimalPlaces(2) }))
    .sort((a, b) => b.balance.comparedTo(a.balance)) // desc (mayor deuda primero)

  let ci = 0 // índice acreedor
  let di = 0 // índice deudor

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]

    const transferAmount = Decimal.min(creditor.balance, debtor.balance).toDecimalPlaces(2)

    if (transferAmount.greaterThan(EPSILON)) {
      result.push({
        from: { id: debtor.userId, name: debtor.name, avatarUrl: debtor.avatarUrl },
        to: { id: creditor.userId, name: creditor.name, avatarUrl: creditor.avatarUrl, paypalMe: creditor.paypalMe },
        amount: transferAmount.toFixed(2),
      })
    }

    creditor.balance = creditor.balance.minus(transferAmount).toDecimalPlaces(2)
    debtor.balance = debtor.balance.minus(transferAmount).toDecimalPlaces(2)

    if (creditor.balance.lessThanOrEqualTo(EPSILON)) ci++
    if (debtor.balance.lessThanOrEqualTo(EPSILON)) di++
  }

  return result
}

// ─── Tipos de respuesta (necesarios para deserializar del caché) ──

type GroupBalancesResult = Awaited<ReturnType<typeof computeGroupBalances>>
type SimplifiedBalancesResult = Awaited<ReturnType<typeof computeSimplifiedBalances>>

// ─── Funciones de cálculo puras (sin caché) ───────────────────

async function computeGroupBalances(groupId: string) {
  const [netBalances, totalExpenses, group] = await Promise.all([
    balancesRepository.getNetBalances(groupId),
    balancesRepository.getTotalExpenses(groupId),
    prisma.group.findUnique({ where: { id: groupId }, select: { currency: true } }),
  ])
  if (!group) throw AppError.notFound('Grupo no encontrado')
  return {
    members: netBalances.map((b) => ({
      user: { id: b.userId, name: b.name, avatarUrl: b.avatarUrl },
      balance: b.balance.toFixed(2),
      isCreditor: b.balance.greaterThan(0),
    })),
    currency: group.currency,
    totalExpenses: totalExpenses.toFixed(2),
  }
}

async function computeSimplifiedBalances(groupId: string) {
  const [netBalances, group] = await Promise.all([
    balancesRepository.getNetBalances(groupId),
    prisma.group.findUnique({ where: { id: groupId }, select: { currency: true } }),
  ])
  if (!group) throw AppError.notFound('Grupo no encontrado')
  const debts = simplifyDebts(netBalances)
  return { debts, allSettled: debts.length === 0, currency: group.currency }
}

// ─── Service con caché ────────────────────────────────────────

export const balancesService = {
  async getGroupBalances(groupId: string): Promise<GroupBalancesResult> {
    const cached = await balancesCache.get<GroupBalancesResult>(groupId, 'full')
    if (cached) return cached
    const result = await computeGroupBalances(groupId)
    await balancesCache.set(groupId, 'full', result)
    return result
  },

  async getSimplifiedBalances(groupId: string): Promise<SimplifiedBalancesResult> {
    const cached = await balancesCache.get<SimplifiedBalancesResult>(groupId, 'simplified')
    if (cached) return cached
    const result = await computeSimplifiedBalances(groupId)
    await balancesCache.set(groupId, 'simplified', result)
    return result
  },

  async getMyBalance(groupId: string, userId: string) {
    // Reutiliza el caché de balances simplificados para no duplicar queries
    const { debts, currency } = await balancesService.getSimplifiedBalances(groupId)

    // El balance neto del usuario no está en el caché de simplificados;
    // necesitamos los balances raw solo para myBalance — aceptamos la query extra
    const netBalances = await balancesRepository.getNetBalances(groupId)
    const myBalance = netBalances.find((b) => b.userId === userId)?.balance ?? new Decimal(0)

    const iOwe = debts
      .filter((d) => d.from.id === userId)
      .map((d) => ({ user: d.to, amount: d.amount }))

    const theyOweMe = debts
      .filter((d) => d.to.id === userId)
      .map((d) => ({ user: d.from, amount: d.amount }))

    return { myBalance: myBalance.toFixed(2), iOwe, theyOweMe, currency }
  },

  /** Llamar tras cualquier escritura que afecte los balances del grupo */
  invalidateCache: (groupId: string) => balancesCache.invalidate(groupId),
}
