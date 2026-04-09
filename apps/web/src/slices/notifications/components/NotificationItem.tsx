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

interface Props {
  notification: Notification
  onRead: (id: string) => void
}

export function NotificationItem({ notification, onRead }: Props) {
  const isUnread = !notification.readAt

  return (
    <button
      onClick={() => isUnread && onRead(notification.id)}
      className={cn(
        'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors',
        isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent',
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
