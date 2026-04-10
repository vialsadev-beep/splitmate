import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CreateExpenseSchema, type CreateExpenseInput } from '@splitmate/shared'
import { useCreateExpense } from '../api/expenses.queries'
import { useGroup } from '@/slices/groups/api/groups.queries'
import { SplitSelector } from '../components/SplitSelector'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import { cn } from '@/shared/utils/cn'
import { useAuth } from '@/shared/hooks/useAuth'
import { toInputDate } from '@/shared/utils/date'

export default function CreateExpensePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
  const { user } = useAuth()
  const { data: group } = useGroup(groupId!)
  const createExpense = useCreateExpense(groupId!)

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } =
    useForm<CreateExpenseInput>({
      resolver: zodResolver(CreateExpenseSchema),
      defaultValues: {
        splitType: 'EQUAL',
        payerId: user?.id ?? '',
        date: new Date().toISOString(),
        participantIds: group?.members.map((m) => m.userId) ?? [],
      },
    })

  const splitType = useWatch({ control, name: 'splitType' })
  const members = group?.members ?? []

  // Cuando el grupo carga, inicializar participantIds con todos los miembros
  useEffect(() => {
    if (group?.members && group.members.length > 0) {
      setValue('participantIds', group.members.map((m) => m.userId))
    }
  }, [group?.members, setValue])

  async function onSubmit(data: CreateExpenseInput) {
    try {
      await createExpense.mutateAsync(data)
      navigate(-1)
    } catch {
      // error handled below
    }
  }

  const inputClass = cn(
    'w-full px-3 py-3 rounded-xl border border-input bg-background text-foreground text-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
  )

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('expenses.add')}</h2>
        {group && <p className="text-sm text-muted-foreground mt-1">{group.name}</p>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Descripción */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.description')}</label>
          <input
            {...register('title')}
            placeholder="Cena, taxi, supermercado..."
            className={cn(inputClass, errors.title && 'border-destructive')}
            autoFocus
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        {/* Importe */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.amount')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              {group?.currency ?? 'EUR'}
            </span>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              inputMode="decimal"
              className={cn(inputClass, 'pl-14', errors.amount && 'border-destructive')}
            />
          </div>
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        {/* Pagado por */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.paidBy')}</label>
          <select
            {...register('payerId')}
            className={inputClass}
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userId === user?.id ? `${m.name} (tú)` : m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de división */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('expenses.splitType')}</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'EQUAL', label: t('expenses.splitEqual') },
              { value: 'EXACT', label: t('expenses.splitExact') },
              { value: 'PERCENTAGE', label: t('expenses.splitPercentage') },
              { value: 'SHARES', label: t('expenses.splitShares') },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('splitType', value as CreateExpenseInput['splitType'])}
                className={cn(
                  'py-2.5 px-3 rounded-xl border text-sm font-medium transition-all',
                  splitType === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Split selector dinámico */}
        <SplitSelector
          splitType={splitType}
          members={members}
          control={control}
          setValue={setValue}
          watch={watch}
        />

        {/* Fecha */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.date')}</label>
          <input
            type="date"
            defaultValue={toInputDate()}
            onChange={(e) => setValue('date', new Date(e.target.value).toISOString())}
            className={inputClass}
          />
        </div>

        {/* Notas */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            {t('expenses.notes')} <span className="text-muted-foreground">({t('common.optional')})</span>
          </label>
          <input
            {...register('notes')}
            placeholder="Añade una nota..."
            className={inputClass}
          />
        </div>

        {createExpense.error && (
          <ApiErrorMessage error={createExpense.error} fallback="Error al crear el gasto" />
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
            disabled={createExpense.isPending}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold',
              'bg-primary text-primary-foreground',
              'hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50',
            )}
          >
            {createExpense.isPending ? t('common.loading') : t('common.add')}
          </button>
        </div>
      </form>
    </div>
  )
}
