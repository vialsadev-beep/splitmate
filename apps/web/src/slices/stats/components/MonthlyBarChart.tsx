import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { MonthlyStat } from '@splitmate/shared'
import { formatCurrency } from '@/shared/utils'

interface Props {
  data: MonthlyStat[]
  currency: string
}

function formatMonth(key: string, locale: string) {
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString(locale, { month: 'short' })
}

export function MonthlyBarChart({ data, currency }: Props) {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US'

  const chartData = data.map((d) => ({
    month: formatMonth(d.month, locale),
    total: parseFloat(d.total),
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (v === 0 ? '0' : `${v}`)}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--accent))' }}
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.75rem',
            fontSize: '0.75rem',
            color: 'hsl(var(--foreground))',
          }}
          formatter={(value) => [value != null ? formatCurrency(value.toString(), currency) : '-', '']}
          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
        />
        <Bar
          dataKey="total"
          fill="hsl(var(--primary))"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
