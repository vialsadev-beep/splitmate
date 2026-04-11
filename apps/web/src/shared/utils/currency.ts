function getLocale(): string {
  const lang = localStorage.getItem('locale') ?? 'es'
  return lang === 'en' ? 'en-US' : 'es-ES'
}

/**
 * Formatea un monto como moneda con símbolo.
 * Siempre usa string de entrada para evitar errores de float.
 */
export function formatCurrency(amount: string | number, currency = 'EUR', locale?: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'

  return new Intl.NumberFormat(locale ?? getLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Formatea solo el número sin símbolo de moneda.
 */
export function formatAmount(amount: string | number, locale?: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0,00'
  return new Intl.NumberFormat(locale ?? getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Devuelve el símbolo de la moneda.
 */
export function getCurrencySymbol(currency = 'EUR', locale?: string): string {
  return (0)
    .toLocaleString(locale ?? getLocale(), { style: 'currency', currency, minimumFractionDigits: 0 })
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
