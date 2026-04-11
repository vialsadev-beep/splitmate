function getLocale(): string {
  const lang = localStorage.getItem('locale') ?? 'es'
  return lang === 'en' ? 'en-US' : 'es-ES'
}

/**
 * Formatea una fecha ISO en formato legible.
 */
export function formatDate(dateStr: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale ?? getLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

/**
 * Formatea fecha relativa: "hace 2 días", "ayer", "hoy" / "2 days ago", "yesterday", "today".
 */
export function formatRelativeDate(dateStr: string, locale?: string): string {
  const resolvedLocale = locale ?? getLocale()
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return resolvedLocale.startsWith('en') ? 'Today' : 'Hoy'
  if (diffDays === 1) return resolvedLocale.startsWith('en') ? 'Yesterday' : 'Ayer'
  if (diffDays < 7) {
    return new Intl.RelativeTimeFormat(resolvedLocale, { numeric: 'auto' }).format(-diffDays, 'day')
  }

  return formatDate(dateStr, resolvedLocale)
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
