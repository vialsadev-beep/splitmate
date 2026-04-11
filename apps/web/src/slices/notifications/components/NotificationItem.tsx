import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import { formatRelativeDate } from '@/shared/utils'
import type { Notification } from '../api/notifications.queries'

const TYPE_ICON: Record<Notification['type'], string> = {
  EXPENSE_ADDED: '🧾',
  PAYMENT_RECEIVED: '💸',
  DEBT_LIMIT: '⚠️',
  GROUP_INVITE: '👥',
  BUDGET_ALERT: '🎯',
}

function getNotificationPath(notification: Notification): string | null {
  const data = notification.data as Record<string, string> | null
  if (!data) return null

  switch (notification.type) {
    case 'EXPENSE_ADDED':
      if (data.groupId && data.expenseId) return `/groups/${data.groupId}/expenses/${data.expenseId}`
      if (data.groupId) return `/groups/${data.groupId}?tab=expenses`
      break
    case 'PAYMENT_RECEIVED':
    case 'DEBT_LIMIT':
      if (data.groupId) return `/groups/${data.groupId}?tab=balance`
      break
    case 'BUDGET_ALERT':
      if (data.groupId) return `/groups/${data.groupId}?tab=budgets`
      break
    case 'GROUP_INVITE':
      if (data.groupId) return `/groups/${data.groupId}`
      break
  }
  return null
}

interface Props {
  notification: Notification
  onRead: (id: string) => void
}

export function NotificationItem({ notification, onRead }: Props) {
  const navigate = useNavigate()
  const isUnread = !notification.readAt
  const path = getNotificationPath(notification)

  function handleClick() {
    if (isUnread) onRead(notification.id)
    if (path) navigate(path)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors',
        isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent',
        path && 'cursor-pointer',
      )}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">
        {TYPE_ICON[notification.type] ?? '🔔'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm leading-snug', isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notification.body}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatRelativeDate(notification.createdAt)}
        </p>
      </div>
    </button>
  )
}
