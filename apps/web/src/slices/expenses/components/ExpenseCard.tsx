import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Paperclip } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatRelativeDate, cn } from '@/shared/utils'
import { useDeleteExpense, useUploadReceipt } from '../api/expenses.queries'
import { useAuth } from '@/shared/hooks/useAuth'
import type { ExpenseResponse } from '@splitmate/shared'

interface Props {
  expense: ExpenseResponse
  groupId: string
  currency: string
  isAdmin?: boolean
}

export function ExpenseCard({ expense, groupId, currency, isAdmin = false }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const deleteExpense = useDeleteExpense(groupId)
  const uploadReceipt = useUploadReceipt(groupId, expense.id)
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const canEdit = expense.payer.id === user?.id || isAdmin

  const myShare = expense.myShare ? parseFloat(expense.myShare) : null
  const isPayer = expense.payer.id === user?.id
  const amountLabel = isPayer
    ? `+${formatCurrency(expense.amount, currency)}`
    : myShare !== null
    ? `-${formatCurrency(myShare, currency)}`
    : ''

  function handleDelete() {
    if (confirm(t('expenses.deleteConfirm'))) {
      deleteExpense.mutate(expense.id)
    }
  }

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadReceipt.mutate(file)
  }

  return (
    <div className="rounded-xl bg-card border border-border group">
      <div className="flex items-center gap-3 p-3.5">
        {/* Category emoji / receipt thumbnail */}
        <button
          onClick={() => expense.receiptUrl && window.open(expense.receiptUrl, '_blank')}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden',
            expense.receiptUrl ? 'cursor-pointer' : 'bg-accent cursor-default',
          )}
          disabled={!expense.receiptUrl}
        >
          {expense.receiptUrl ? (
            <img
              src={expense.receiptUrl}
              alt="ticket"
              className="w-full h-full object-cover"
            />
          ) : (
            expense.category?.emoji ?? '💸'
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{expense.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('expenses.paidBy')}: {isPayer ? t('groups.you') : expense.payer.name}
            {' · '}
            {formatRelativeDate(expense.date)}
          </p>
        </div>

        {/* Amount + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className={cn(
              'text-sm font-semibold',
              isPayer ? 'text-success' : 'text-destructive',
            )}>
              {amountLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(expense.amount, currency)} {t('expenses.total').toLowerCase()}
            </p>
          </div>

          {canEdit && (
            <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-all">
              <button
                onClick={() => receiptInputRef.current?.click()}
                disabled={uploadReceipt.isPending}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                title={t('expenses.attachReceipt')}
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => navigate(`/groups/${groupId}/expenses/${expense.id}/edit`)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title={t('common.edit')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteExpense.isPending}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title={t('common.delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={receiptInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleReceiptChange}
      />
    </div>
  )
}
