import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { CreateExpenseSchema, type CreateExpenseInput } from '@splitmate/shared'
import { useExpense, useUpdateExpense, useCategories } from '../api/expenses.queries'
import { useGroup } from '@/slices/groups/api/groups.queries'
import { SplitSelector } from '../components/SplitSelector'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import { PageLoader } from '@/shared/components/LoadingSpinner'
import { cn } from '@/shared/utils/cn'
import { useAuth } from '@/shared/hooks/useAuth'
import { toInputDate } from '@/shared/utils/date'

export default function EditExpensePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { groupId, expenseId } = useParams<{ groupId: string; expenseId: string }>()
  const { user } = useAuth()
  const { data: group } = useGroup(groupId!)
  const { data: expense, isLoading } = useExpense(groupId!, expenseId!)
  const updateExpense = useUpdateExpense(groupId!, expenseId!)
  const { data: categories = [] } = useCategories(groupId!)
  const [isPrivate, setIsPrivate] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } =
    useForm<CreateExpenseInput>({
      resolver: zodResolver(CreateExpenseSchema),
      defaultValues: {
        splitType: 'EQUAL',
        payerId: user?.id ?? '',
        date: new Date().toISOString(),
        participantIds: [],
      },
    })

  const splitType = useWatch({ control, name: 'splitType' })
  const members = group?.members ?? []

  useEffect(() => {
    if (!expense) return
    setIsPrivate(expense.isPrivate)

    const defaults: Partial<CreateExpenseInput> = {
      title: expense.title,
      amount: expense.amount,
      payerId: expense.payer.id,
      splitType: expense.splitType,
      notes: expense.notes ?? undefined,
      date: expense.date,
      categoryId: expense.category?.id,
    }

    if (expense.splitType === 'EQUAL') {
      defaults.participantIds = expense.splits.map((s) => s.userId)
    } else if (expense.splitType === 'EXACT') {
      defaults.splits = expense.splits.map((s) => ({ userId: s.userId, amount: s.amount }))
    } else if (expense.splitType === 'PERCENTAGE') {
      const total = parseFloat(expense.amount)
      defaults.percentageSplits = expense.splits.map((s) => ({
        userId: s.userId,
        percentage: total > 0 ? ((parseFloat(s.amount) / total) * 100).toFixed(2) : '0',
      }))
    } else if (expense.splitType === 'SHARES') {
      defaults.shareSplits = expense.splits.map((s) => ({ userId: s.userId, shares: 1 }))
    }

    reset(defaults as CreateExpenseInput)
  }, [expense, reset])

  async function onSubmit(data: CreateExpenseInput) {
    try {
      await (updateExpense.mutateAsync as (d: CreateExpenseInput & { isPrivate?: boolean }) => Promise<unknown>)({
        ...data,
        isPrivate,
      })
      navigate(-1)
    } catch {
      // error handled below
    }
  }

  const inputClass = cn(
    'w-full px-3 py-3 rounded-xl border border-input bg-background text-foreground text-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
  )

  if (isLoading) return <PageLoader />

  if (!expense) return (
    <div className="py-10 text-center text-muted-foreground">
      {t('expenses.notFound')}
    </div>
  )

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('expenses.edit')}</h2>
          {group && <p className="text-sm text-muted-foreground mt-1">{group.name}</p>}
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsPrivate((v) => !v)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onTouchStart={() => setShowTooltip(true)}
            onTouchEnd={() => setTimeout(() => setShowTooltip(false), 1800)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all',
              isPrivate
                ? 'border-violet-400 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                : 'border-border text-muted-foreground hover:border-violet-400/60 hover:text-violet-500',
            )}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {isPrivate ? t('expenses.private') : t('expenses.makePrivate')}
          </button>

          {showTooltip && (
            <div className="absolute right-0 top-full mt-2 w-56 z-50 pointer-events-none">
              <div className="bg-popover border border-border rounded-xl shadow-lg p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('expenses.privateTooltip')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isPrivate && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-400/30">
          <ShieldAlert className="h-4 w-4 text-violet-500 flex-shrink-0" />
          <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
            {t('expenses.privateBanner')}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.description')}</label>
          <input
            {...register('title')}
            placeholder={t('expenses.descriptionPlaceholder')}
            className={cn(inputClass, errors.title && 'border-destructive')}
            autoFocus
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.amount')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              {group?.currency ?? expense.currency}
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

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.paidBy')}</label>
          <select {...register('payerId')} className={inputClass}>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userId === user?.id ? `${m.name} (${t('groups.you')})` : m.name}
              </option>
            ))}
          </select>
        </div>

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

        <SplitSelector
          splitType={splitType}
          members={members}
          control={control}
          setValue={setValue}
          watch={watch}
        />

        {/* Categoría */}
        {categories.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('expenses.category')} <span className="text-muted-foreground">({t('common.optional')})</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setValue('categoryId', undefined)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-all',
                  !watch('categoryId')
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                💸 {t('stats.other')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setValue('categoryId', cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-all',
                    watch('categoryId') === cat.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {cat.emoji && <span>{cat.emoji}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.date')}</label>
          <input
            type="date"
            defaultValue={toInputDate(expense.date)}
            onChange={(e) => setValue('date', new Date(e.target.value).toISOString())}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            {t('expenses.notes')} <span className="text-muted-foreground">({t('common.optional')})</span>
          </label>
          <input
            {...register('notes')}
            placeholder={t('expenses.notesPlaceholder')}
            className={inputClass}
          />
        </div>

        {updateExpense.error && (
          <ApiErrorMessage error={updateExpense.error} fallback="Error al editar el gasto" />
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
            disabled={updateExpense.isPending}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold',
              'bg-primary text-primary-foreground',
              'hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50',
            )}
          >
            {updateExpense.isPending ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
