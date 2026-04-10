import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CreateGroupSchema, type CreateGroupInput } from '@splitmate/shared'
import { useCreateGroup } from '../api/groups.queries'
import { cn } from '@/shared/utils/cn'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'CLP', 'COP']
const EMOJIS = ['✈️', '🏠', '👫', '🎉', '🍕', '🏖️', '🎮', '🚗', '⚽', '🎵']

export default function CreateGroupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createGroup = useCreateGroup()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateGroupInput>({
    resolver: zodResolver(CreateGroupSchema),
    defaultValues: { currency: 'EUR', emoji: '✈️' },
  })

  const selectedEmoji = watch('emoji')

  async function onSubmit(data: CreateGroupInput) {
    try {
      const group = await createGroup.mutateAsync(data)
      navigate(`/groups/${group?.id}`, { replace: true })
    } catch {
      // error shown in UI
    }
  }

  const inputClass = (hasError: boolean) => cn(
    'w-full px-3 py-3 rounded-xl border bg-background text-foreground text-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
    hasError ? 'border-destructive' : 'border-input',
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('groups.create')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('groups.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Emoji picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('groups.emoji')}</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setValue('emoji', emoji)}
                className={cn(
                  'w-10 h-10 text-xl rounded-xl border-2 transition-all',
                  selectedEmoji === emoji
                    ? 'border-primary bg-primary/10 scale-110'
                    : 'border-border hover:border-muted-foreground',
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Nombre */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('groups.name')}</label>
          <input
            {...register('name')}
            placeholder={t('groups.namePlaceholder')}
            className={inputClass(!!errors.name)}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Descripción */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            {t('groups.description')} <span className="text-muted-foreground">({t('common.optional')})</span>
          </label>
          <input
            {...register('description')}
            placeholder={t('groups.descriptionPlaceholder')}
            className={inputClass(false)}
          />
        </div>

        {/* Moneda */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('common.currency')}</label>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('currency', c)}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                  watch('currency') === c
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground hover:border-muted-foreground',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {createGroup.error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive text-center">Error al crear el grupo</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={createGroup.isPending}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold',
              'bg-primary text-primary-foreground',
              'hover:opacity-90 active:scale-[0.98] transition-all',
              'disabled:opacity-50',
            )}
          >
            {createGroup.isPending ? t('common.loading') : t('common.create')}
          </button>
        </div>
      </form>
    </div>
  )
}
