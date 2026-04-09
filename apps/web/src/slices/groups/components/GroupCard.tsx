import { useNavigate } from 'react-router-dom'
import { Users, ChevronRight } from 'lucide-react'
import { cn, getAmountClass, formatCurrency } from '@/shared/utils'
import type { GroupSummary } from '@splitmate/shared'

interface Props {
  group: GroupSummary
}

export function GroupCard({ group }: Props) {
  const navigate = useNavigate()
  const balance = parseFloat(group.myBalance)
  const balanceClass = getAmountClass(group.myBalance)

  return (
    <button
      onClick={() => navigate(`/groups/${group.id}`)}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl',
        'bg-card border border-border',
        'hover:border-primary/30 hover:shadow-sm',
        'active:scale-[0.99] transition-all text-left',
      )}
    >
      {/* Emoji / Avatar */}
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl">
        {group.emoji ?? '👥'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{group.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{group.memberCount} miembros</span>
        </div>
      </div>

      {/* Balance */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          {Math.abs(balance) < 0.01 ? (
            <span className="text-sm text-muted-foreground font-medium">Saldado</span>
          ) : (
            <span className={cn('text-sm font-semibold', balanceClass)}>
              {balance > 0 ? '+' : ''}{formatCurrency(group.myBalance, group.currency)}
            </span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  )
}
