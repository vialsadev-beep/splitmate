import { useTranslation } from 'react-i18next'
import { CheckCheck } from 'lucide-react'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useNotifications, useMarkAsRead } from '../api/notifications.queries'
import { NotificationItem } from '../components/NotificationItem'

export default function NotificationsPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useNotifications()
  const markAsRead = useMarkAsRead()

  const notifications = data?.data ?? []
  const unreadCount = data?.meta.unreadCount ?? 0

  function handleRead(id: string) {
    markAsRead.mutate([id])
  }

  function handleMarkAllRead() {
    markAsRead.mutate('all')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* Acción global */}
      {unreadCount > 0 && (
        <div className="flex justify-end px-4 py-2">
          <button
            onClick={handleMarkAllRead}
            disabled={markAsRead.isPending}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t('notifications.markAllRead')}
          </button>
        </div>
      )}

      {/* Lista */}
      {notifications.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <p className="text-4xl">🔔</p>
          <p className="text-sm font-medium text-foreground">{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onRead={handleRead} />
          ))}
        </div>
      )}
    </div>
  )
}
