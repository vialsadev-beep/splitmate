import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoginSchema, type LoginInput } from '@splitmate/shared'
import { useLogin } from '../api/auth.queries'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import { cn } from '@/shared/utils/cn'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/groups'

  const login = useLogin()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  async function onSubmit(data: LoginInput) {
    try {
      await login.mutateAsync(data)
      navigate(from, { replace: true })
    } catch {
      // Error mostrado via login.error
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">💸</div>
          <h1 className="text-2xl font-bold text-foreground">{t('auth.welcome')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.tagline')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} autoComplete="on" className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              inputMode="email"
              className={cn(
                'w-full px-3 py-3 rounded-xl border bg-background text-foreground',
                'placeholder:text-muted-foreground text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'transition-colors',
                errors.email ? 'border-destructive' : 'border-input',
              )}
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('auth.password')}</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              className={cn(
                'w-full px-3 py-3 rounded-xl border bg-background text-foreground',
                'placeholder:text-muted-foreground text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'transition-colors',
                errors.password ? 'border-destructive' : 'border-input',
              )}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {login.error && (
            <ApiErrorMessage error={login.error} fallback="Credenciales incorrectas" />
          )}

          <button
            type="submit"
            disabled={isSubmitting || login.isPending}
            className={cn(
              'w-full py-3 px-4 rounded-xl font-semibold text-sm',
              'bg-primary text-primary-foreground',
              'hover:opacity-90 active:scale-[0.98] transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {login.isPending ? t('common.loading') : t('auth.login')}
          </button>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="mx-3 text-xs text-muted-foreground">{t('common.or')}</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <a
            href="https://splitmate-production-9842.up.railway.app/api/v1/auth/google"
            className={cn(
              'flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl',
              'border border-border bg-background',
              'hover:bg-accent transition-colors text-sm font-medium text-foreground',
            )}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('auth.loginWithGoogle')}
          </a>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
