import { useTranslation } from 'react-i18next'
import { Receipt, CreditCard, Trash2 } from 'lucide-react'
import { useActivityFeed } from '../api/activity.queries'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { formatCurrency, formatRelativeDate } from '@/shared/utils'
import { useAuth } from '@/shared/hooks/useAuth'
import { cn } from '@/shared/utils/cn'
import type { ActivityItem } from '@splitmate/shared'

interface Props {
  groupId: string
}

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  if (type === 'PAYMENT_CREATED') {
    return (
      <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
        <CreditCard className="h-4 w-4 text-success" />
      </div>
    )
  }
  if (type === 'EXPENSE_DELETED') {
    return (
      <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
        <Trash2 className="h-4 w-4 text-destructive" />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Receipt className="h-4 w-4 text-primary" />
    </div>
  )
}

function ActivityRow({ item, currency }: { item: ActivityItem; currency: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isMe = item.actorId === user?.id
  const actor = isMe ? t('groups.you') : item.actorName

  let description = ''
  if (item.type === 'EXPENSE_CREATED') {
    description = t('activity.addedExpense', { actor, title: item.title })
  } else if (item.type === 'EXPENSE_DELETED') {
    description = t('activity.deletedExpense', { actor, title: item.title })
  } else if (item.type === 'PAYMENT_CREATED') {
    description = t('activity.recordedPayment', { actor, receiver: item.title })
  }

  return (
    <div className="flex items-center gap-3">
      <ActivityIcon type={item.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">{description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(item.createdAt)}</p>
      </div>
      <div className={cn(
        'text-sm font-semibold flex-shrink-0',
        item.type === 'EXPENSE_DELETED'
          ? 'text-muted-foreground line-through'
          : item.type === 'PAYMENT_CREATED'
          ? 'text-success'
          : 'text-foreground',
      )}>
        {formatCurrency(item.amount, currency)}
      </div>
    </div>
  )
}

export function ActivityFeedTab({ groupId }: Props) {
  const { t } = useTranslation()
  const { data, isLoading } = useActivityFeed(groupId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  const items = data?.data ?? []

  if (items.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-3xl">📋</p>
        <p className="text-sm font-medium text-foreground">{t('activity.empty')}</p>
        <p className="text-xs text-muted-foreground">{t('activity.emptyDesc')}</p>
      </div>
    )
  }

  // Agrupar por día
  const grouped = new Map<string, ActivityItem[]>()
  for (const item of items) {
    const day = new Date(item.createdAt).toDateString()
    if (!grouped.has(day)) grouped.set(day, [])
    grouped.get(day)!.push(item)
  }

  const currency = items[0]?.currency ?? 'EUR'

  return (
    <div className="space-y-4 pb-6">
      {Array.from(grouped.entries()).map(([day, dayItems]) => (
        <div key={day} className="space-y-1">
          {/* Separador de fecha */}
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              {formatRelativeDate(dayItems[0].createdAt)}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Items del día */}
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {dayItems.map((item) => (
              <div key={item.id} className="px-3.5 py-3">
                <ActivityRow item={item} currency={currency} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
