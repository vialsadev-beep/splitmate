import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { AppError } from '../../shared/errors/AppError'
import { calculateSplits } from './expenses.service'
import type { CreateExpenseInput } from '@splitmate/shared'

const BASE: CreateExpenseInput = {
  title: 'Test',
  amount: '0',
  payerId: 'A',
  splitType: 'EQUAL',
}

function dec(v: string) {
  return new Decimal(v)
}

// ─── EQUAL ────────────────────────────────────────────────────

describe('calculateSplits — EQUAL', () => {
  it('divide igualmente entre 2 participantes', () => {
    const splits = calculateSplits(dec('60'), 'A', 'EQUAL', {
      ...BASE,
      participantIds: ['A', 'B'],
    })
    expect(splits).toHaveLength(2)
    expect(splits[0].amount.toFixed(2)).toBe('30.00')
    expect(splits[1].amount.toFixed(2)).toBe('30.00')
  })

  it('asigna residuo de centavo al primer participante', () => {
    // 10 / 3 = 3.33... → [3.34, 3.33, 3.33]
    const splits = calculateSplits(dec('10'), 'A', 'EQUAL', {
      ...BASE,
      participantIds: ['A', 'B', 'C'],
    })
    const total = splits.reduce((s, x) => s.plus(x.amount), new Decimal(0))
    expect(total.toFixed(2)).toBe('10.00')
    // primer participante absorbe el residuo
    expect(parseFloat(splits[0].amount.toFixed(2))).toBeGreaterThanOrEqual(
      parseFloat(splits[1].amount.toFixed(2)),
    )
  })

  it('marca isPaid=true solo para el pagador', () => {
    const splits = calculateSplits(dec('60'), 'A', 'EQUAL', {
      ...BASE,
      participantIds: ['A', 'B', 'C'],
    })
    expect(splits.find((s) => s.userId === 'A')?.isPaid).toBe(true)
    expect(splits.find((s) => s.userId === 'B')?.isPaid).toBe(false)
    expect(splits.find((s) => s.userId === 'C')?.isPaid).toBe(false)
  })

  it('lanza error si no hay participantes', () => {
    expect(() =>
      calculateSplits(dec('60'), 'A', 'EQUAL', { ...BASE, participantIds: [] }),
    ).toThrow(AppError)
  })

  it('un solo participante recibe el total', () => {
    const splits = calculateSplits(dec('99.99'), 'A', 'EQUAL', {
      ...BASE,
      participantIds: ['A'],
    })
    expect(splits[0].amount.toFixed(2)).toBe('99.99')
  })
})

// ─── EXACT ────────────────────────────────────────────────────

describe('calculateSplits — EXACT', () => {
  it('asigna montos exactos a cada usuario', () => {
    const splits = calculateSplits(dec('100'), 'A', 'EXACT', {
      ...BASE,
      splits: [
        { userId: 'A', amount: '70' },
        { userId: 'B', amount: '30' },
      ],
    })
    expect(splits).toHaveLength(2)
    expect(splits[0].amount.toFixed(2)).toBe('70.00')
    expect(splits[1].amount.toFixed(2)).toBe('30.00')
  })

  it('lanza error si los splits no suman el total', () => {
    expect(() =>
      calculateSplits(dec('100'), 'A', 'EXACT', {
        ...BASE,
        splits: [
          { userId: 'A', amount: '60' },
          { userId: 'B', amount: '30' },
        ],
      }),
    ).toThrow(AppError)
  })

  it('un solo split con el total completo es válido', () => {
    const splits = calculateSplits(dec('50'), 'A', 'EXACT', {
      ...BASE,
      splits: [{ userId: 'A', amount: '50' }],
    })
    expect(splits[0].amount.toFixed(2)).toBe('50.00')
  })
})

// ─── PERCENTAGE ───────────────────────────────────────────────

describe('calculateSplits — PERCENTAGE', () => {
  it('divide según porcentajes', () => {
    const splits = calculateSplits(dec('200'), 'A', 'PERCENTAGE', {
      ...BASE,
      percentageSplits: [
        { userId: 'A', percentage: '75' },
        { userId: 'B', percentage: '25' },
      ],
    })
    const total = splits.reduce((s, x) => s.plus(x.amount), new Decimal(0))
    expect(total.toFixed(2)).toBe('200.00')
    expect(splits[0].amount.toFixed(2)).toBe('150.00')
    expect(splits[1].amount.toFixed(2)).toBe('50.00')
  })

  it('lanza error si los porcentajes no suman 100', () => {
    expect(() =>
      calculateSplits(dec('100'), 'A', 'PERCENTAGE', {
        ...BASE,
        percentageSplits: [
          { userId: 'A', percentage: '60' },
          { userId: 'B', percentage: '30' },
        ],
      }),
    ).toThrow(AppError)
  })

  it('conserva el total con porcentajes que generan decimales', () => {
    // 100 / 3 → no es exacto
    const splits = calculateSplits(dec('100'), 'A', 'PERCENTAGE', {
      ...BASE,
      percentageSplits: [
        { userId: 'A', percentage: '33.33' },
        { userId: 'B', percentage: '33.33' },
        { userId: 'C', percentage: '33.34' },
      ],
    })
    const total = splits.reduce((s, x) => s.plus(x.amount), new Decimal(0))
    expect(total.toFixed(2)).toBe('100.00')
  })
})

// ─── SHARES ───────────────────────────────────────────────────

describe('calculateSplits — SHARES', () => {
  it('divide según partes (2:1)', () => {
    const splits = calculateSplits(dec('90'), 'A', 'SHARES', {
      ...BASE,
      shareSplits: [
        { userId: 'A', shares: 2 },
        { userId: 'B', shares: 1 },
      ],
    })
    const total = splits.reduce((s, x) => s.plus(x.amount), new Decimal(0))
    expect(total.toFixed(2)).toBe('90.00')
    // A recibe 60, B recibe 30
    expect(splits[0].amount.toFixed(2)).toBe('60.00')
    expect(splits[1].amount.toFixed(2)).toBe('30.00')
  })

  it('lanza error si las partes totales son 0', () => {
    expect(() =>
      calculateSplits(dec('100'), 'A', 'SHARES', {
        ...BASE,
        shareSplits: [],
      }),
    ).toThrow(AppError)
  })

  it('partes iguales equivalen a división EQUAL', () => {
    const splits = calculateSplits(dec('60'), 'A', 'SHARES', {
      ...BASE,
      shareSplits: [
        { userId: 'A', shares: 1 },
        { userId: 'B', shares: 1 },
        { userId: 'C', shares: 1 },
      ],
    })
    const total = splits.reduce((s, x) => s.plus(x.amount), new Decimal(0))
    expect(total.toFixed(2)).toBe('60.00')
  })

  it('conserva el total con partes que generan decimales', () => {
    const splits = calculateSplits(dec('10'), 'A', 'SHARES', {
      ...BASE,
      shareSplits: [
        { userId: 'A', shares: 1 },
        { userId: 'B', shares: 1 },
        { userId: 'C', shares: 1 },
      ],
    })
    const total = splits.reduce((s, x) => s.plus(x.amount), new Decimal(0))
    expect(total.toFixed(2)).toBe('10.00')
  })
})
