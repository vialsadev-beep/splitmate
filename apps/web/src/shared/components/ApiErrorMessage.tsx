import { getApiError } from '@/shared/lib/api-client'

interface Props {
  error: unknown
  fallback?: string
}

/**
 * Muestra el mensaje de error de una petición fallida.
 * Para errores 500 incluye el requestId para facilitar el soporte.
 */
export function ApiErrorMessage({ error, fallback = 'Ha ocurrido un error' }: Props) {
  const apiError = getApiError(error)
  const message = apiError?.message ?? fallback
  const requestId = apiError?.requestId

  return (
    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
      <p className="text-xs text-destructive text-center">{message}</p>
      {requestId && apiError?.status === 500 && (
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Ref: {requestId}
        </p>
      )}
    </div>
  )
}
