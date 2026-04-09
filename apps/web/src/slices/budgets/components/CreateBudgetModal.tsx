import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { CreateBudgetSchema, type CreateBudgetInput } from '@splitmate/shared'
import { apiClient } from '@/shared/lib/api-client'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import { cn } from '@/shared/utils/cn'
import { useCreateBudget } from '../api/budgets.queries'

interface Category {
  id: string
  name: string
  emoji: string | null
  groupId: string | null
}

interface Props {
  groupId: string
  currency: string
  onClose: () => void
}

const inputClass = cn(
  'w-full px-3 py-3 rounded-xl border border-input bg-background text-foreground text-sm',
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
)

export function CreateBudgetModal({ groupId, currency, onClose }: Props) {
  const { t } = useTranslation()
  const createBudget = useCreateBudget(groupId)
  const [serverError, setServerError] = useState<unknown>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Category[] }>(`/categories?groupId=${groupId}`)
      return res.data.data
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateBudgetInput>({
    resolver: zodResolver(CreateBudgetSchema),
    defaultValues: {
      period: 'MONTHLY',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    },
  })

  const period = watch('period')

  async function onSubmit(data: CreateBudgetInput) {
    setServerError(null)
    if (data.period === 'CUSTOM' && data.endDate && data.startDate >= data.endDate) {
      setServerError(new Error(t('budgets.endDateError')))
      return
    }
    try {
      await createBudget.mutateAsync(data)
      onClose()
    } catch (e) {
      setServerError(e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{t('budgets.create')}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('budgets.name')}</label>
            <input
              {...register('name')}
              placeholder={t('budgets.namePlaceholder')}
              className={cn(inputClass, errors.name && 'border-destructive')}
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Importe */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('budgets.limit')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {currency}
              </span>
              <input
                {...register('amount')}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className={cn(inputClass, 'pl-14', errors.amount && 'border-destructive')}
              />
            </div>
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Período */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('budgets.periodLabel')}</label>
            <select {...register('period')} className={inputClass}>
              <option value="WEEKLY">{t('budgets.period.weekly')}</option>
              <option value="MONTHLY">{t('budgets.period.monthly')}</option>
              <option value="YEARLY">{t('budgets.period.yearly')}</option>
              <option value="CUSTOM">{t('budgets.period.custom')}</option>
            </select>
          </div>

          {/* Fechas para período CUSTOM */}
          {period === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">{t('budgets.startDate')}</label>
                <input
                  {...register('startDate', {
                    setValueAs: (v) => v ? new Date(v).toISOString() : v,
                  })}
                  type="date"
                  className={cn(inputClass, errors.startDate && 'border-destructive')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">{t('budgets.endDate')}</label>
                <input
                  {...register('endDate', {
                    setValueAs: (v) => v ? new Date(v).toISOString() : undefined,
                  })}
                  type="date"
                  className={cn(inputClass, errors.endDate && 'border-destructive')}
                />
              </div>
            </div>
          )}

          {/* Categoría (opcional) */}
          {categories.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                {t('expenses.category')}{' '}
                <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
              </label>
              <select {...register('categoryId')} className={inputClass}>
                <option value="">{t('budgets.allCategories')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji ? `${c.emoji} ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ApiErrorMessage error={serverError} />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={createBudget.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {createBudget.isPending ? t('common.loading') : t('budgets.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
