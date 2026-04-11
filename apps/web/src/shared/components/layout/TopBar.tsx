import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/cn'
import { useUnreadCount } from '@/slices/notifications/api/notifications.queries'

const ROOT_PATHS = ['/groups', '/profile', '/notifications']

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: unreadCount = 0 } = useUnreadCount()

  const TITLES: Record<string, string> = {
    '/groups': 'SplitMate',
    '/profile': t('profile.title'),
    '/notifications': t('notifications.title'),
  }

  const title = TITLES[location.pathname] ?? 'SplitMate'
  const showBack = !ROOT_PATHS.includes(location.pathname)

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-40',
      'bg-background/80 backdrop-blur-md border-b border-border',
      'h-14 flex items-center px-4',
    )}>
      <div className="flex items-center gap-2 flex-1">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
        )}
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
      </div>

      {!showBack && (
        <button
          onClick={() => navigate('/notifications')}
          className="p-2 rounded-lg hover:bg-accent transition-colors relative"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </header>
  )
}
