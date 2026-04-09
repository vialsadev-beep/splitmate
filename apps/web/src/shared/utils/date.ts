/**
 * Formatea una fecha ISO en formato legible.
 */
export function formatDate(dateStr: string, locale = 'es-ES'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

/**
 * Formatea fecha relativa: "hace 2 días", "ayer", "hoy".
 */
export function formatRelativeDate(dateStr: string, locale = 'es-ES'): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return locale.startsWith('es') ? 'Hoy' : 'Today'
  if (diffDays === 1) return locale.startsWith('es') ? 'Ayer' : 'Yesterday'
  if (diffDays < 7) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-diffDays, 'day')
  }

  return formatDate(dateStr, locale)
}

/**
 * Convierte una fecha a formato input[type=date] (YYYY-MM-DD).
 */
export function toInputDate(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date()
  return date.toISOString().split('T')[0]
}

/**
 * Convierte fecha de input a ISO string.
 */
export function fromInputDate(dateStr: string): string {
  return new Date(dateStr).toISOString()
}
