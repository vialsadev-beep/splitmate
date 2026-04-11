import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, LockOpen, X } from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'
import { useUpdateReceiptItems } from '../api/expenses.queries'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import { cn } from '@/shared/utils/cn'
import type { ExpenseResponse, ReceiptItem } from '@splitmate/shared'

interface Props {
  expense: ExpenseResponse
  groupId: string
  members: { userId: string; name: string }[]
  onClose: () => void
}

export function ReceiptItemsSheet({ expense, groupId, members, onClose }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const updateItems = useUpdateReceiptItems(groupId, expense.id)

  const [items, setItems] = useState<ReceiptItem[]>(expense.receiptItems ?? [])

  function toggleMember(itemId: string, userId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        // No se puede modificar si está bloqueado por otro
        if (item.locked && item.lockedBy && item.lockedBy !== user?.id) return item
        const already = item.memberIds.includes(userId)
        return {
          ...item,
          memberIds: already
            ? item.memberIds.filter((id) => id !== userId)
            : [...item.memberIds, userId],
          // Si se quita el único miembro que tenía bloqueado, desbloquear
          locked: already && item.memberIds.length === 1 ? false : item.locked,
          lockedBy: already && item.memberIds.length === 1 ? undefined : item.lockedBy,
        }
      }),
    )
  }

  function selectAllForMe() {
    setItems((prev) =>
      prev.map((item) => {
        if (item.locked && item.lockedBy && item.lockedBy !== user?.id) return item
        if (item.memberIds.includes(user?.id ?? '')) return item
        return { ...item, memberIds: [...item.memberIds, user?.id ?? ''] }
      }),
    )
  }

  function toggleLock(itemId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        if (item.memberIds.length !== 1 || item.memberIds[0] !== user?.id) return item
        return { ...item, locked: !item.locked, lockedBy: !item.locked ? user.id : undefined }
      }),
    )
  }

  async function handleSave() {
    await updateItems.mutateAsync(items)
    onClose()
  }

  const assignedCount = items.filter((i) => i.memberIds.length > 0).length
  const currency = expense.currency

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-foreground">{expense.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('receipt.assignedProgress', { assigned: assignedCount, total: items.length })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={selectAllForMe}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              {t('receipt.selectAllMine')}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {items.map((item) => {
            const isLockedByOther = item.locked && item.lockedBy && item.lockedBy !== user?.id
            const isSoleOwner = item.memberIds.length === 1 && item.memberIds[0] === user?.id
            const lockedByMember = item.lockedBy ? members.find((m) => m.userId === item.lockedBy) : null
            const sharePerPerson = item.memberIds.length > 0
              ? (parseFloat(item.price) / item.memberIds.length).toFixed(2)
              : null

            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-xl border p-3 space-y-2 transition-colors',
                  item.memberIds.length > 0
                    ? 'border-green-300/50 bg-green-50/20 dark:bg-green-950/10'
                    : 'border-border bg-card',
                  isLockedByOther && 'opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium text-foreground',
                      item.memberIds.length > 0 && 'line-through text-muted-foreground',
                    )}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-foreground">{item.price} {currency}</span>
                      {sharePerPerson && item.memberIds.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          ({sharePerPerson} {currency} {t('expenses.each')})
                        </span>
                      )}
                      {isLockedByOther && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Lock className="h-3 w-3" />
                          {lockedByMember?.name ?? t('receipt.lockedByOther')}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Botón de bloqueo — solo si soy el único dueño */}
                  {isSoleOwner && (
                    <button
                      type="button"
                      onClick={() => toggleLock(item.id)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors flex-shrink-0',
                        item.locked
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-primary hover:bg-primary/10',
                      )}
                      title={item.locked ? t('receipt.unlock') : t('receipt.lock')}
                    >
                      {item.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>

                {/* Botones de miembros */}
                {!isLockedByOther && (
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m) => {
                      const selected = item.memberIds.includes(m.userId)
                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => toggleMember(item.id, m.userId)}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all',
                            selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <div className={cn(
                            'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                            selected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                          )}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          {m.userId === user?.id ? t('groups.you') : m.name.split(' ')[0]}
                        </button>
                      )
                    })}
                  </div>
                )}

                {isLockedByOther && (
                  <p className="text-xs text-muted-foreground">
                    {t('receipt.lockedCannotEdit')}
                  </p>
                )}
              </div>
            )
          })}

          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t('receipt.noItemsFound')}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-border flex-shrink-0 space-y-3">
          {/* Resumen de lo mío */}
          {(() => {
            const myTotal = items
              .filter((i) => i.memberIds.includes(user?.id ?? ''))
              .reduce((s, i) => s + parseFloat(i.price) / i.memberIds.length, 0)
            return myTotal > 0 ? (
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">{t('receipt.myTotal')}</span>
                <span className="font-bold text-foreground">{myTotal.toFixed(2)} {currency}</span>
              </div>
            ) : null
          })()}

          {updateItems.error && <ApiErrorMessage error={updateItems.error} fallback="Error al guardar" />}

          <button
            type="button"
            onClick={handleSave}
            disabled={updateItems.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {updateItems.isPending ? t('common.loading') : t('receipt.saveAssignment')}
          </button>
        </div>
      </div>
    </div>
  )
}
