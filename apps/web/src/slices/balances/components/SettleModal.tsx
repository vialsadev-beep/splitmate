import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSettleDebt } from '../api/balances.queries'
import { formatCurrency, cn } from '@/shared/utils'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import type { SimplifiedDebt } from '@splitmate/shared'

interface Props {
  debt: SimplifiedDebt
  groupId: string
  currency: string
  onClose: () => void
}

export function SettleModal({ debt, groupId, currency, onClose }: Props) {
  const { t } = useTranslation()
  const settle = useSettleDebt(groupId)
  const [notes, setNotes] = useState('')

  async function handleSettle() {
    try {
      await settle.mutateAsync({
        senderId: debt.from.id,
        receiverId: debt.to.id,
        amount: debt.amount,
        notes: notes || undefined,
      })
      onClose()
    } catch {
      // error shown below via settle.error
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            {t('balances.settleWith', { name: debt.to.name })}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Amount */}
        <div className="p-4 rounded-xl bg-muted/50 text-center">
          <p className="text-3xl font-bold text-foreground">
            {formatCurrency(debt.amount, currency)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('balances.settleWith', { name: debt.to.name })}
          </p>
        </div>

        {/* Nota opcional */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            {t('payments.notes')} <span className="text-muted-foreground">({t('common.optional')})</span>
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('payments.notesPlaceholder')}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {debt.to.paypalMe && (
          <a
            href={`https://www.paypal.com/paypalme/${debt.to.paypalMe}/${debt.amount}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: '#003087', color: 'white' }}
          >
            <ExternalLink className="h-4 w-4" />
            {t('balances.payWithPayPal')}
          </a>
        )}

        {settle.error && (
          <ApiErrorMessage error={settle.error} fallback={t('errors.recordPayment')} />
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSettle}
            disabled={settle.isPending}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold',
              'bg-primary text-primary-foreground',
              'hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50',
            )}
          >
            {settle.isPending ? t('common.loading') : t('balances.settle')}
          </button>
        </div>
      </div>
    </div>
  )
}
