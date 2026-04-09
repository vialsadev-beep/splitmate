import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useGroupBudgets } from '../api/budgets.queries'
import { BudgetCard } from './BudgetCard'
import { CreateBudgetModal } from './CreateBudgetModal'

interface Props {
  groupId: string
  currency: string
}

export function BudgetsTab({ groupId, currency }: Props) {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const { data: budgets, isLoading } = useGroupBudgets(groupId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t('budgets.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('budgets.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('budgets.add')}
        </button>
      </div>

      {/* Lista */}
      {!budgets || budgets.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-3xl">🎯</p>
          <p className="text-sm font-medium text-foreground">{t('budgets.empty')}</p>
          <p className="text-xs text-muted-foreground">{t('budgets.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} groupId={groupId} currency={currency} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBudgetModal
          groupId={groupId}
          currency={currency}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
