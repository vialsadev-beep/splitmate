import { NavLink } from 'react-router-dom'
import { Users, User } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useTranslation } from 'react-i18next'

const NAV_ITEMS = [
  { to: '/groups', icon: Users, labelKey: 'groups.title' },
  { to: '/profile', icon: User, labelKey: 'profile.title' },
]

export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-40',
      'bg-background/90 backdrop-blur-md border-t border-border',
      'pb-safe',
    )}>
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-6">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
                <span className="text-xs font-medium">{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
