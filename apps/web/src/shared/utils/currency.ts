/**
 * Formatea un monto como moneda con símbolo.
 * Siempre usa string de entrada para evitar errores de float.
 */
export function formatCurrency(amount: string | number, currency = 'EUR', locale = 'es-ES'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Formatea solo el número sin símbolo de moneda.
 */
export function formatAmount(amount: string | number, locale = 'es-ES'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0,00'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Devuelve el símbolo de la moneda.
 */
export function getCurrencySymbol(currency = 'EUR', locale = 'es-ES'): string {
  return (0)
    .toLocaleString(locale, { style: 'currency', currency, minimumFractionDigits: 0 })
    .replace(/\d/g, '')
    .trim()
}

/**
 * Determina si un monto es positivo, negativo o neutro para colorear.
 */
export function getAmountClass(amount: string | number): 'amount-positive' | 'amount-negative' | 'amount-neutral' {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num > 0.005) return 'amount-positive'
  if (num < -0.005) return 'amount-negative'
  return 'amount-neutral'
}
