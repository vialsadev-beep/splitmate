import { useTranslation } from 'react-i18next'
import { LogOut, Moon, Sun, Monitor, Globe } from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'
import { useTheme } from '@/shared/hooks/useTheme'
import { useLogout } from '@/slices/auth/api/auth.queries'
import { cn } from '@/shared/utils/cn'
import i18n from '@/shared/lib/i18n'

type Theme = 'light' | 'dark' | 'system'

const THEMES: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'profile.themeLight' },
  { value: 'dark', icon: Moon, labelKey: 'profile.themeDark' },
  { value: 'system', icon: Monitor, labelKey: 'profile.themeSystem' },
]

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
]

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const logout = useLogout()

  async function handleLogout() {
    if (confirm(t('auth.logoutConfirm'))) {
      await logout.mutateAsync()
      window.location.href = '/login'
    }
  }

  function changeLanguage(locale: string) {
    i18n.changeLanguage(locale)
    localStorage.setItem('locale', locale)
  }

  return (
    <div className="space-y-6">
      {/* Avatar + nombre */}
      <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-primary">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Tema */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          {t('profile.theme')}
        </h3>
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          {THEMES.map(({ value, icon: Icon, labelKey }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                theme === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Idioma */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          {t('profile.language')}
        </h3>
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          {LANGUAGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => changeLanguage(value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                i18n.language === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={logout.isPending}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl',
          'border border-destructive/30 text-destructive',
          'hover:bg-destructive/5 active:scale-[0.98] transition-all',
          'text-sm font-semibold disabled:opacity-50',
        )}
      >
        <LogOut className="h-4 w-4" />
        {logout.isPending ? t('common.loading') : t('common.logout')}
      </button>
    </div>
  )
}
