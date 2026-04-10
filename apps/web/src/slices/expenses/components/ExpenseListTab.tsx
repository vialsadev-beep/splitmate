import { useState } from 'react'
import { Search, X, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useExpenses } from '../api/expenses.queries'
import { apiClient } from '@/shared/lib/api-client'
import { ExpenseCard } from './ExpenseCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { cn } from '@/shared/utils/cn'

interface Props {
  groupId: string
  currency: string
  isAdmin?: boolean
}

export function ExpenseListTab({ groupId, currency, isAdmin = false }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isFetching } = useExpenses(groupId, {
    search: debouncedSearch || undefined,
  })

  async function handleExport() {
    const qs = new URLSearchParams()
    if (debouncedSearch) qs.set('search', debouncedSearch)
    const res = await apiClient.get(`/groups/${groupId}/expenses/export?${qs}`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `gastos.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const expenses = data?.data ?? []
  const isFiltering = !!debouncedSearch

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda + exportar */}
      <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('expenses.searchPlaceholder')}
          className={cn(
            'w-full pl-9 pr-9 py-2.5 rounded-xl border border-input bg-background',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
          )}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <button
        onClick={handleExport}
        title={t('expenses.export')}
        className="p-2.5 rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
      >
        <Download className="h-4 w-4" />
      </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : expenses.length === 0 ? (
        isFiltering ? (
          <div className="py-10 text-center space-y-1">
            <p className="text-2xl">🔍</p>
            <p className="text-sm font-medium text-foreground">{t('expenses.searchEmpty')}</p>
            <p className="text-xs text-muted-foreground">
              {t('expenses.searchEmptyDesc', { query: debouncedSearch })}
            </p>
          </div>
        ) : (
          <EmptyState
            icon="🧾"
            title={t('expenses.empty')}
            description={t('expenses.emptyDesc')}
          />
        )
      ) : (
        <div className={cn('space-y-2 transition-opacity', isFetching && 'opacity-60')}>
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} groupId={groupId} currency={currency} isAdmin={isAdmin} />
          ))}
          {data?.meta && data.meta.total > expenses.length && (
            <p className="text-center text-xs text-muted-foreground py-2">
              {t('expenses.showingOf', { count: expenses.length, total: data.meta.total })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
