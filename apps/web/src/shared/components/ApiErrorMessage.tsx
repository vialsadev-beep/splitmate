import { useTranslation } from 'react-i18next'
import { getApiError } from '@/shared/lib/api-client'

const CODE_TO_KEY: Record<string, string> = {
  UNAUTHORIZED: 'errors.unauthorized',
  RATE_LIMIT: 'errors.networkError',
  SELF_PAYMENT: 'errors.selfPayment',
  SPLIT_MISMATCH: 'errors.splitMismatch',
  PERCENTAGE_MISMATCH: 'errors.percentageMismatch',
  LAST_ADMIN: 'errors.lastAdmin',
  NOT_FOUND: 'errors.notFound',
}

interface Props {
  error: unknown
  fallback?: string
}

export function ApiErrorMessage({ error, fallback }: Props) {
  const { t } = useTranslation()
  if (!error) return null
  const apiError = getApiError(error)

  let message: string
  if (apiError?.code && CODE_TO_KEY[apiError.code]) {
    message = t(CODE_TO_KEY[apiError.code])
  } else {
    message = apiError?.message ?? fallback ?? t('common.error')
  }

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
