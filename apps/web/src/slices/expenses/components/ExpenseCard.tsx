import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Paperclip, ScanLine, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatRelativeDate, cn } from '@/shared/utils'
import { useDeleteExpense, useUploadReceipt } from '../api/expenses.queries'
import { useAuth } from '@/shared/hooks/useAuth'
import { ReceiptItemsSheet } from './ReceiptItemsSheet'
import type { ExpenseResponse } from '@splitmate/shared'

interface Props {
  expense: ExpenseResponse
  groupId: string
  currency: string
  isAdmin?: boolean
  members?: { userId: string; name: string }[]
}

export function ExpenseCard({ expense, groupId, currency, isAdmin = false, members = [] }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const deleteExpense = useDeleteExpense(groupId)
  const uploadReceipt = useUploadReceipt(groupId, expense.id)
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const [showReceiptSheet, setShowReceiptSheet] = useState(false)

  const canView = expense.canView
  const isPayer = expense.payer.id === user?.id
  const canEdit = (isPayer || isAdmin) && canView
  const hasReceiptItems = expense.receiptItems && expense.receiptItems.length > 0

  const myShare = expense.myShare ? parseFloat(expense.myShare) : null
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

  // ── Gasto privado sin permiso de ver ─────────────────────────
  if (!canView) {
    return (
      <div className="rounded-xl bg-card border border-violet-300/40 overflow-hidden group relative">
        {/* Contenido borroso */}
        <div className="flex items-center gap-3 p-3.5 blur-sm select-none pointer-events-none" aria-hidden>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="h-5 w-5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-3.5 w-32 rounded bg-muted-foreground/20 mb-1.5" />
            <div className="h-2.5 w-20 rounded bg-muted-foreground/15" />
          </div>
          <div className="text-right">
            <div className="h-3.5 w-14 rounded bg-muted-foreground/20 mb-1.5 ml-auto" />
            <div className="h-2.5 w-10 rounded bg-muted-foreground/15 ml-auto" />
          </div>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-card/60 backdrop-blur-[2px]">
          <ShieldAlert className="h-4 w-4 text-violet-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
            {t('expenses.privateHidden')}
          </span>
        </div>
      </div>
    )
  }

  // ── Card normal ───────────────────────────────────────────────
  return (
    <div className={cn(
      'rounded-xl bg-card border group',
      expense.isPrivate ? 'border-violet-300/40' : 'border-border',
    )}>
      <div className="flex items-center gap-3 p-3.5">
        {/* Category emoji / receipt thumbnail */}
        <button
          onClick={() => {
            if (hasReceiptItems) setShowReceiptSheet(true)
            else if (expense.receiptUrl) window.open(expense.receiptUrl, '_blank')
          }}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden relative',
            (hasReceiptItems || expense.receiptUrl) ? 'cursor-pointer' : 'cursor-default',
            expense.isPrivate ? 'bg-violet-500/10' : 'bg-accent',
          )}
        >
          {expense.receiptUrl ? (
            <img src={expense.receiptUrl} alt="ticket" className="w-full h-full object-cover" />
          ) : hasReceiptItems ? (
            <ScanLine className="h-5 w-5 text-primary" />
          ) : expense.isPrivate ? (
            <ShieldAlert className="h-5 w-5 text-violet-500" />
          ) : (
            expense.category?.emoji ?? '💸'
          )}
          {/* Badge items pendientes */}
          {hasReceiptItems && expense.receiptItems!.some((i) => i.memberIds.length === 0) && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border border-background" />
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{expense.title}</p>
            {expense.isPrivate && (
              <ShieldAlert className="h-3 w-3 text-violet-500 flex-shrink-0" />
            )}
          </div>
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

      {showReceiptSheet && hasReceiptItems && (
        <ReceiptItemsSheet
          expense={expense}
          groupId={groupId}
          members={members}
          onClose={() => setShowReceiptSheet(false)}
        />
      )}
    </div>
  )
}
