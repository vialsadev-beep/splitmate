import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut, Moon, Sun, Monitor, Globe, ExternalLink, Camera, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'
import { useTheme } from '@/shared/hooks/useTheme'
import { useLogout, useUpdateProfile, useUploadUserAvatar, useChangePassword } from '@/slices/auth/api/auth.queries'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
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
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadUserAvatar()
  const changePassword = useChangePassword()

  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [nameSaved, setNameSaved] = useState(false)

  const [paypalMe, setPaypalMe] = useState(user?.paypalMe ?? '')
  const [paypalSaved, setPaypalSaved] = useState(false)

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  async function handleSaveName() {
    if (!name.trim() || name.trim() === user?.name) return
    try {
      await updateProfile.mutateAsync({ name: name.trim() })
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } catch {
      // error shown below
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadAvatar.mutateAsync(file)
  }

  async function handleSavePaypal() {
    try {
      await updateProfile.mutateAsync({ paypalMe: paypalMe.trim() || null })
      setPaypalSaved(true)
      setTimeout(() => setPaypalSaved(false), 2000)
    } catch {
      // error shown below
    }
  }

  async function handleChangePassword() {
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordMismatch'))
      return
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setPasswordSaved(false)
        setShowPasswordForm(false)
      }, 2500)
    } catch {
      // error shown below
    }
  }

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

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
  )

  return (
    <div className="space-y-6">
      {/* Avatar + nombre */}
      <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
        <div className="relative flex-shrink-0">
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="relative w-16 h-16 rounded-full overflow-hidden group"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {uploadAvatar.isPending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="h-4 w-4 text-white" />
              }
            </div>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{t('profile.editName')}</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              className={cn(inputClass, 'py-2')}
            />
            <button
              onClick={handleSaveName}
              disabled={updateProfile.isPending || !name.trim() || name.trim() === user?.name}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
            >
              {nameSaved ? <Check className="h-4 w-4" /> : t('common.save')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
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

      {/* PayPal.me */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          {t('profile.paypal')}
        </h3>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground">{t('profile.paypalDesc')}</p>
          <a
            href="https://www.paypal.com/myaccount/settings/account"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary font-medium"
          >
            <ExternalLink className="h-3 w-3" />
            {t('profile.paypalFindUsername')}
          </a>
          {updateProfile.error && (
            <ApiErrorMessage error={updateProfile.error} fallback={t('errors.saveFailed')} />
          )}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center rounded-xl border border-input bg-background overflow-hidden">
              <span className="px-3 text-sm text-muted-foreground flex-shrink-0">paypal.me/</span>
              <input
                type="text"
                value={paypalMe}
                onChange={(e) => setPaypalMe(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                placeholder="tunombre"
                className="flex-1 py-2.5 pr-3 bg-transparent text-sm text-foreground focus:outline-none"
              />
            </div>
            <button
              onClick={handleSavePaypal}
              disabled={updateProfile.isPending}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {paypalSaved ? <Check className="h-4 w-4" /> : t('common.save')}
            </button>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      {user?.hasPassword && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            {t('profile.account')}
          </h3>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setShowPasswordForm((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              {t('profile.changePassword')}
              {showPasswordForm ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showPasswordForm && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('profile.currentPassword')}
                  className={inputClass}
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('profile.newPassword')}
                  className={inputClass}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('profile.confirmNewPassword')}
                  className={inputClass}
                  onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                />
                {passwordError && (
                  <p className="text-xs text-destructive">{passwordError}</p>
                )}
                {changePassword.error && (
                  <ApiErrorMessage error={changePassword.error} fallback={t('errors.changePassword')} />
                )}
                {passwordSaved && (
                  <p className="text-xs text-success">{t('profile.passwordChanged')}</p>
                )}
                <button
                  onClick={handleChangePassword}
                  disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {changePassword.isPending ? t('common.loading') : t('common.save')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
