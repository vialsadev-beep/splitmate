import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { simplifyDebts } from './balances.service'
import type { UserNetBalance } from './balances.repository'

function makeBalance(id: string, balance: string): UserNetBalance {
  return {
    userId: id,
    name: `User ${id}`,
    avatarUrl: null,
    paypalMe: null,
    balance: new Decimal(balance),
  }
}

describe('simplifyDebts', () => {
  it('retorna array vacío cuando no hay deudas', () => {
    const result = simplifyDebts([
      makeBalance('A', '0'),
      makeBalance('B', '0'),
    ])
    expect(result).toHaveLength(0)
  })

  it('retorna array vacío cuando todos los balances son casi cero', () => {
    const result = simplifyDebts([
      makeBalance('A', '0.005'),
      makeBalance('B', '-0.005'),
    ])
    expect(result).toHaveLength(0)
  })

  it('caso simple: A debe a B', () => {
    const balances = [
      makeBalance('A', '30'),
      makeBalance('B', '-30'),
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(1)
    expect(result[0].from.id).toBe('B')
    expect(result[0].to.id).toBe('A')
    expect(result[0].amount).toBe('30.00')
  })

  it('tres personas: A pagó todo, B y C deben a A', () => {
    const balances = [
      makeBalance('A', '60'),    // A pagó 90, su parte 30 → le deben 60
      makeBalance('B', '-30'),   // B debe 30 a A
      makeBalance('C', '-30'),   // C debe 30 a A
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(2)
    expect(result.every((d) => d.to.id === 'A')).toBe(true)
  })

  it('simplifica deuda en cadena: A→B, B→C se simplifica a A→C y A→B ajustado', () => {
    // A tiene +30 (le deben), B tiene 0 (saldado), C tiene -30 (debe)
    const balances = [
      makeBalance('A', '30'),
      makeBalance('B', '0'),
      makeBalance('C', '-30'),
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(1)
    expect(result[0].from.id).toBe('C')
    expect(result[0].to.id).toBe('A')
  })

  it('múltiples acreedores y deudores se minimizan correctamente', () => {
    const balances = [
      makeBalance('A', '50'),
      makeBalance('B', '30'),
      makeBalance('C', '-40'),
      makeBalance('D', '-40'),
    ]
    const result = simplifyDebts(balances)

    // Verificar que la suma de transfers salda todo
    const totalDebt = balances
      .filter((b) => b.balance.lessThan(0))
      .reduce((sum, b) => sum + Math.abs(parseFloat(b.balance.toString())), 0)

    const totalTransferred = result.reduce((sum, d) => sum + parseFloat(d.amount), 0)
    expect(Math.abs(totalTransferred - totalDebt)).toBeLessThan(0.02)
  })

  it('la conservación se mantiene: suma de todos los balances = 0', () => {
    const balances = [
      makeBalance('A', '100'),
      makeBalance('B', '-45'),
      makeBalance('C', '-30'),
      makeBalance('D', '-25'),
    ]
    const sum = balances.reduce((acc, b) => acc + parseFloat(b.balance.toString()), 0)
    expect(Math.abs(sum)).toBeLessThan(0.01) // suma ≈ 0

    const result = simplifyDebts(balances)
    // Verificar que todos los deudores pueden pagar
    expect(result.length).toBeGreaterThan(0)
    result.forEach((d) => {
      expect(parseFloat(d.amount)).toBeGreaterThan(0)
    })
  })

  it('maneja montos con decimales correctamente (0.01 precision)', () => {
    const balances = [
      makeBalance('A', '0.33'),
      makeBalance('B', '-0.33'),
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe('0.33')
  })

  it('maneja montos grandes correctamente', () => {
    const balances = [
      makeBalance('A', '9999.99'),
      makeBalance('B', '-9999.99'),
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe('9999.99')
  })

  it('un solo miembro con balance 0 retorna vacío', () => {
    const result = simplifyDebts([makeBalance('A', '0')])
    expect(result).toHaveLength(0)
  })

  it('todos ya saldados (todos balance 0)', () => {
    const result = simplifyDebts([
      makeBalance('A', '0'),
      makeBalance('B', '0'),
      makeBalance('C', '0'),
    ])
    expect(result).toHaveLength(0)
  })

  it('minimiza el número de transferencias vs solución naive', () => {
    // 3 personas: A debe a B y C, pero con balance neto B puede saldar a C
    const balances = [
      makeBalance('A', '60'),   // acreedor
      makeBalance('B', '-20'),  // deudor
      makeBalance('C', '-40'),  // deudor mayor
    ]
    const result = simplifyDebts(balances)
    // Mínimo: 2 transferencias (C→A 40, B→A 20)
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('caso real de viaje: 4 personas, gastos varios', () => {
    // Ana pagó mucho, Bob un poco, Carl y David deben
    const balances = [
      makeBalance('ana',   '87.50'),
      makeBalance('bob',   '12.50'),
      makeBalance('carl',  '-45.00'),
      makeBalance('david', '-55.00'),
    ]
    const result = simplifyDebts(balances)

    // La suma de lo transferido debe igualar la deuda total
    const totalDebt = 45.00 + 55.00
    const totalTransferred = result.reduce((sum, d) => sum + parseFloat(d.amount), 0)
    expect(Math.abs(totalTransferred - totalDebt)).toBeLessThan(0.02)

    // No debe haber transferencias de un usuario a sí mismo
    result.forEach((d) => {
      expect(d.from.id).not.toBe(d.to.id)
    })
  })

  it('todos los amounts en el resultado son positivos', () => {
    const balances = [
      makeBalance('A', '50'),
      makeBalance('B', '-20'),
      makeBalance('C', '-30'),
    ]
    const result = simplifyDebts(balances)
    result.forEach((d) => {
      expect(parseFloat(d.amount)).toBeGreaterThan(0)
    })
  })
})
