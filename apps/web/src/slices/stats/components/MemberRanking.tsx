import { useTranslation } from 'react-i18next'
import type { MemberStat } from '@splitmate/shared'
import { formatCurrency, cn } from '@/shared/utils'
import { useAuth } from '@/shared/hooks/useAuth'

interface Props {
  members: MemberStat[]
  currency: string
}

export function MemberRanking({ members, currency }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()

  if (members.length === 0) return null

  const maxPaid = Math.max(...members.map((m) => parseFloat(m.totalPaid)), 1)

  return (
    <div className="space-y-3">
      {members.map((m) => {
        const paid = parseFloat(m.totalPaid)
        const balance = parseFloat(m.balance)
        const isMe = m.userId === user?.id
        const pct = (paid / maxPaid) * 100

        return (
          <div key={m.userId} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase">
                  {m.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-foreground truncate">
                  {isMe ? `${m.name} (${t('groups.you')})` : m.name}
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(m.totalPaid, currency)}
                </p>
                <p className={cn(
                  'text-xs',
                  balance > 0 ? 'text-success' : balance < 0 ? 'text-destructive' : 'text-muted-foreground',
                )}>
                  {balance > 0 ? '+' : ''}{formatCurrency(m.balance, currency)}
                </p>
              </div>
            </div>
            {/* Barra de progreso */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
