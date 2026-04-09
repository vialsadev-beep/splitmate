import { useTranslation } from 'react-i18next'
import { useGroupStats } from '../api/stats.queries'
import { MonthlyBarChart } from '../components/MonthlyBarChart'
import { CategoryDonutChart } from '../components/CategoryDonutChart'
import { MemberRanking } from '../components/MemberRanking'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { formatCurrency } from '@/shared/utils'

interface Props {
  groupId: string
}

export function StatsTab({ groupId }: Props) {
  const { t } = useTranslation()
  const { data: stats, isLoading } = useGroupStats(groupId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  if (!stats || stats.totalCount === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-3xl">📊</p>
        <p className="text-sm font-medium text-foreground">{t('stats.empty')}</p>
        <p className="text-xs text-muted-foreground">{t('stats.emptyDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-6">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">{t('stats.total')}</p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {formatCurrency(stats.totalExpenses, stats.currency)}
          </p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">{t('stats.count')}</p>
          <p className="text-base font-bold text-foreground mt-0.5">{stats.totalCount}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">{t('stats.avg')}</p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {formatCurrency(stats.avgExpense, stats.currency)}
          </p>
        </div>
      </div>

      {/* Evolución mensual */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t('stats.monthly')}</h3>
        <MonthlyBarChart data={stats.byMonth} currency={stats.currency} />
      </div>

      {/* Por categoría */}
      {stats.byCategory.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{t('stats.byCategory')}</h3>
          <CategoryDonutChart data={stats.byCategory} currency={stats.currency} />
        </div>
      )}

      {/* Ranking de miembros */}
      {stats.byMember.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{t('stats.byMember')}</h3>
          <MemberRanking members={stats.byMember} currency={stats.currency} />
        </div>
      )}
    </div>
  )
}
