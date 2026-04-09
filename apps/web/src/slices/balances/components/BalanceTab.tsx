import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSimplifiedBalance } from '../api/balances.queries'
import { DebtCard } from './DebtCard'
import { SettleModal } from './SettleModal'
import { PageLoader } from '@/shared/components/LoadingSpinner'
import { EmptyState } from '@/shared/components/EmptyState'
import type { SimplifiedDebt } from '@splitmate/shared'
import { useAuth } from '@/shared/hooks/useAuth'

interface Props {
  groupId: string
}

export function BalanceTab({ groupId }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data, isLoading } = useSimplifiedBalance(groupId)
  const [settleDebt, setSettleDebt] = useState<SimplifiedDebt | null>(null)

  if (isLoading) return <PageLoader />

  if (data?.allSettled) {
    return (
      <EmptyState
        icon="✅"
        title={t('balances.settled')}
        description={t('balances.settledDesc')}
      />
    )
  }

  const myDebts = data?.debts.filter((d) => d.from.id === user?.id) ?? []
  const othersOweMe = data?.debts.filter((d) => d.to.id === user?.id) ?? []
  const otherDebts = data?.debts.filter(
    (d) => d.from.id !== user?.id && d.to.id !== user?.id,
  ) ?? []

  return (
    <div className="space-y-4">
      {/* Mis deudas */}
      {myDebts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('balances.youOwe')}
          </h3>
          {myDebts.map((debt, i) => (
            <DebtCard
              key={i}
              debt={debt}
              variant="owe"
              currency={data?.currency ?? 'EUR'}
              onSettle={() => setSettleDebt(debt)}
            />
          ))}
        </div>
      )}

      {/* Me deben */}
      {othersOweMe.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('balances.theyOwe')}
          </h3>
          {othersOweMe.map((debt, i) => (
            <DebtCard
              key={i}
              debt={debt}
              variant="owed"
              currency={data?.currency ?? 'EUR'}
            />
          ))}
        </div>
      )}

      {/* Deudas entre otros */}
      {otherDebts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Otras deudas del grupo
          </h3>
          {otherDebts.map((debt, i) => (
            <DebtCard
              key={i}
              debt={debt}
              variant="other"
              currency={data?.currency ?? 'EUR'}
            />
          ))}
        </div>
      )}

      {settleDebt && (
        <SettleModal
          debt={settleDebt}
          groupId={groupId}
          currency={data?.currency ?? 'EUR'}
          onClose={() => setSettleDebt(null)}
        />
      )}
    </div>
  )
}
