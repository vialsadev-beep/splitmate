import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, cn } from '@/shared/utils'
import type { SimplifiedDebt } from '@splitmate/shared'

interface Props {
  debt: SimplifiedDebt
  variant: 'owe' | 'owed' | 'other'
  currency: string
  onSettle?: () => void
}

export function DebtCard({ debt, variant, currency, onSettle }: Props) {
  const { t } = useTranslation()

  return (
    <div className={cn(
      'flex items-center gap-3 p-3.5 rounded-xl border',
      variant === 'owe' && 'bg-destructive/5 border-destructive/20',
      variant === 'owed' && 'bg-success/5 border-success/20',
      variant === 'other' && 'bg-card border-border',
    )}>
      {/* From */}
      <div className="flex flex-col items-center gap-0.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
          {debt.from.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs text-muted-foreground truncate max-w-[60px]">{debt.from.name}</span>
      </div>

      {/* Arrow + amount */}
      <div className="flex-1 flex flex-col items-center gap-0.5">
        <span className={cn(
          'text-sm font-bold',
          variant === 'owe' ? 'text-destructive' : variant === 'owed' ? 'text-success' : 'text-foreground',
        )}>
          {formatCurrency(debt.amount, currency)}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* To */}
      <div className="flex flex-col items-center gap-0.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
          {debt.to.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs text-muted-foreground truncate max-w-[60px]">{debt.to.name}</span>
      </div>

      {/* Settle button */}
      {variant === 'owe' && onSettle && (
        <button
          onClick={onSettle}
          className={cn(
            'ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0',
            'bg-primary text-primary-foreground hover:opacity-90 transition-all',
          )}
        >
          {t('balances.settle')}
        </button>
      )}
    </div>
  )
}
