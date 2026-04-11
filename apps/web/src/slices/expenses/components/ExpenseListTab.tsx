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
import type { ExpenseResponse } from '@splitmate/shared'

interface Props {
  groupId: string
  currency: string
  isAdmin?: boolean
  members?: { userId: string; name: string }[]
}

export function ExpenseListTab({ groupId, currency, isAdmin = false, members = [] }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [allExpenses, setAllExpenses] = useState<ExpenseResponse[]>([])
  const [hasMore, setHasMore] = useState(true)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isFetching } = useExpenses(groupId, {
    search: debouncedSearch || undefined,
    page,
  })

  // Merge pages into allExpenses
  const pageExpenses = data?.data ?? []

  // On search change, reset
  const [lastSearch, setLastSearch] = useState(debouncedSearch)
  if (debouncedSearch !== lastSearch) {
    setLastSearch(debouncedSearch)
    setPage(1)
    setAllExpenses([])
    setHasMore(true)
  }

  // Merge page data
  const [lastPage, setLastPage] = useState(0)
  if (page !== lastPage && !isFetching && pageExpenses.length > 0) {
    setLastPage(page)
    if (page === 1) {
      setAllExpenses(pageExpenses)
    } else {
      setAllExpenses((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const newExpenses = pageExpenses.filter((e) => !existingIds.has(e.id))
        return [...prev, ...newExpenses]
      })
    }
    if (data?.meta && pageExpenses.length < data.meta.limit) {
      setHasMore(false)
    }
  }

  // Handle page 1 reset when search changes
  if (page === 1 && !isFetching && lastPage === page && pageExpenses.length > 0 && allExpenses[0]?.id !== pageExpenses[0]?.id) {
    setAllExpenses(pageExpenses)
  }

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

  const expenses = allExpenses.length > 0 ? allExpenses : (page === 1 ? pageExpenses : [])
  const isFiltering = !!debouncedSearch
  const totalCount = data?.meta?.total ?? 0

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
      {isLoading && page === 1 ? (
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
        <div className={cn('space-y-2 transition-opacity', isFetching && page === 1 && 'opacity-60')}>
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} groupId={groupId} currency={currency} isAdmin={isAdmin} members={members} />
          ))}

          {/* Load more / counter */}
          {totalCount > expenses.length && hasMore ? (
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={isFetching}
              className="w-full py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            >
              {isFetching ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  {t('common.loading')}
                </span>
              ) : (
                t('expenses.showingOf', { count: expenses.length, total: totalCount })
              )}
            </button>
          ) : totalCount > 0 && expenses.length >= totalCount ? null : null}
        </div>
      )}
    </div>
  )
}
