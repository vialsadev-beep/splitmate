import { useTranslation } from 'react-i18next'
import { getApiError } from '@/shared/lib/api-client'

interface Props {
  error: unknown
  fallback?: string
}

export function ApiErrorMessage({ error, fallback }: Props) {
  const { t } = useTranslation()
  if (!error) return null
  const apiError = getApiError(error)
  const message = apiError?.message ?? fallback ?? t('common.error')
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
