import { useEffect } from 'react'
import type { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { CreateExpenseInput } from '@splitmate/shared'
import { cn } from '@/shared/utils/cn'

interface Member {
  userId: string
  name: string
  avatarUrl: string | null
}

interface Props {
  splitType: CreateExpenseInput['splitType']
  members: Member[]
  control: Control<CreateExpenseInput>
  setValue: UseFormSetValue<CreateExpenseInput>
  watch: UseFormWatch<CreateExpenseInput>
}

export function SplitSelector({ splitType, members, setValue, watch }: Props) {
  const { t } = useTranslation()
  const amount = watch('amount')
  const participantIds = watch('participantIds') ?? members.map((m) => m.userId)

  // Al cambiar splitType, resetear splits
  useEffect(() => {
    setValue('splits', undefined)
    setValue('percentageSplits', undefined)
    setValue('shareSplits', undefined)
    if (splitType === 'EQUAL') {
      setValue('participantIds', members.map((m) => m.userId))
    }
  }, [splitType, members, setValue])

  if (splitType === 'EQUAL') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('expenses.participants')}</label>
        <div className="space-y-1.5">
          {members.map((m) => {
            const isSelected = participantIds.includes(m.userId)
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? participantIds.filter((id) => id !== m.userId)
                    : [...participantIds, m.userId]
                  setValue('participantIds', next.length > 0 ? next : participantIds)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex-shrink-0 transition-colors',
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground',
                )} />
                <span className="text-sm text-foreground">{m.name}</span>
                {amount && isSelected && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {(parseFloat(amount) / participantIds.length).toFixed(2)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (splitType === 'EXACT') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('expenses.amountPerPerson')}</label>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-foreground">{m.name}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                inputMode="decimal"
                onChange={(e) => {
                  const current = (watch('splits') ?? []) as { userId: string; amount: string }[]
                  const updated = [...current]
                  const idx = updated.findIndex((s) => s.userId === m.userId)
                  if (idx >= 0) updated[idx].amount = e.target.value
                  else updated.push({ userId: m.userId, amount: e.target.value })
                  setValue('splits', updated)
                }}
                className="w-28 px-3 py-2 rounded-xl border border-input bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (splitType === 'PERCENTAGE') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('expenses.percentagePerPerson')}</label>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-foreground">{m.name}</span>
              <div className="relative w-28">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0"
                  inputMode="decimal"
                  onChange={(e) => {
                    const current = (watch('percentageSplits') ?? []) as { userId: string; percentage: string }[]
                    const updated = [...current]
                    const idx = updated.findIndex((s) => s.userId === m.userId)
                    if (idx >= 0) updated[idx].percentage = e.target.value
                    else updated.push({ userId: m.userId, percentage: e.target.value })
                    setValue('percentageSplits', updated)
                  }}
                  className="w-full pl-3 pr-6 py-2 rounded-xl border border-input bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (splitType === 'SHARES') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('expenses.sharesPerPerson')}</label>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-foreground">{m.name}</span>
              <input
                type="number"
                step="1"
                min="0"
                defaultValue="1"
                inputMode="numeric"
                onChange={(e) => {
                  const current = (watch('shareSplits') ?? []) as { userId: string; shares: number }[]
                  const updated = [...current]
                  const idx = updated.findIndex((s) => s.userId === m.userId)
                  const shares = parseInt(e.target.value) || 0
                  if (idx >= 0) updated[idx].shares = shares
                  else updated.push({ userId: m.userId, shares })
                  setValue('shareSplits', updated)
                }}
                className="w-20 px-3 py-2 rounded-xl border border-input bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
