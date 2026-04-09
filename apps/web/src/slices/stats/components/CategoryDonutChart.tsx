import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { CategoryStat } from '@splitmate/shared'
import { formatCurrency } from '@/shared/utils'
import { cn } from '@/shared/utils/cn'

const PALETTE = [
  'hsl(var(--primary))',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
]

interface Props {
  data: CategoryStat[]
  currency: string
}

export function CategoryDonutChart({ data, currency }: Props) {
  const { t } = useTranslation()

  // Mostrar top 7 + agrupar el resto como "Otros"
  const sorted = [...data].sort((a, b) => parseFloat(b.total) - parseFloat(a.total))
  const top = sorted.slice(0, 7)
  const rest = sorted.slice(7)

  const chartData = rest.length > 0
    ? [
        ...top,
        {
          categoryId: '__other__',
          categoryName: t('stats.other'),
          categoryEmoji: null,
          categoryColor: null,
          total: rest.reduce((acc, c) => (parseFloat(acc as unknown as string) + parseFloat(c.total)).toFixed(2) as unknown as string, '0'),
          count: rest.reduce((acc, c) => acc + c.count, 0),
          percentage: rest.reduce((acc, c) => acc + c.percentage, 0),
        } as CategoryStat,
      ]
    : top

  if (chartData.length === 0) return null

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            dataKey="total"
            nameKey="categoryName"
            strokeWidth={2}
            stroke="hsl(var(--background))"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem',
              fontSize: '0.75rem',
              color: 'hsl(var(--foreground))',
            }}
            formatter={(value, _name, props) => {
              const item = props.payload as CategoryStat
              const formatted = value != null ? formatCurrency(value.toString(), currency) : '-'
              return [
                `${formatted} (${item.percentage.toFixed(1)}%)`,
                item.categoryEmoji ? `${item.categoryEmoji} ${item.categoryName}` : item.categoryName,
              ]
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Leyenda */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {chartData.map((c, i) => (
          <div key={c.categoryId ?? i} className="flex items-center gap-2 min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className={cn('text-xs text-foreground truncate')}>
              {c.categoryEmoji && <span className="mr-0.5">{c.categoryEmoji}</span>}
              {c.categoryName}
            </span>
            <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
              {c.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
