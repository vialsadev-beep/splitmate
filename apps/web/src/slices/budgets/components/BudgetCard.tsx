import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/cn'
import { formatCurrency } from '@/shared/utils'
import { useDeleteBudget } from '../api/budgets.queries'
import type { BudgetResponse } from '@splitmate/shared'

interface Props {
  budget: BudgetResponse
  groupId: string
  currency: string
}

const STATUS_STYLES = {
  ok: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  warning: {
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  exceeded: {
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

export function BudgetCard({ budget, groupId, currency }: Props) {
  const { t } = useTranslation()
  const deleteBudget = useDeleteBudget(groupId)
  const styles = STATUS_STYLES[budget.status]
  const pct = Math.min(budget.percentage, 100)

  function handleDelete() {
    if (!window.confirm(t('budgets.deleteConfirm'))) return
    deleteBudget.mutate(budget.id)
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {budget.categoryEmoji && (
            <span className="text-xl flex-shrink-0">{budget.categoryEmoji}</span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{budget.name}</p>
            {budget.categoryName && (
              <p className="text-xs text-muted-foreground truncate">{budget.categoryName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', styles.badge)}>
            {t(`budgets.period.${budget.period.toLowerCase()}`)}
          </span>
          <button
            onClick={handleDelete}
            disabled={deleteBudget.isPending}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', styles.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {t('budgets.spent')}{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(budget.spent, currency)}
            </span>
          </span>
          <span>
            {budget.status === 'exceeded' ? (
              <span className="font-medium text-red-600 dark:text-red-400">
                +{formatCurrency((parseFloat(budget.spent) - parseFloat(budget.amount)).toFixed(2), currency)}{' '}
                {t('budgets.over')}
              </span>
            ) : (
              <>
                {t('budgets.remaining')}{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(budget.remaining, currency)}
                </span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Limit */}
      <p className="text-xs text-muted-foreground text-right">
        {t('budgets.limit')}{' '}
        <span className="font-semibold text-foreground">{formatCurrency(budget.amount, currency)}</span>
        {' '}· {budget.percentage.toFixed(0)}%
      </p>
    </div>
  )
}
