import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Receipt, Scale, Users, Link as LinkIcon, BarChart2, Clock, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGroup } from '../api/groups.queries'
import { useAuth } from '@/shared/hooks/useAuth'
import { PageLoader } from '@/shared/components/LoadingSpinner'
import { cn } from '@/shared/utils/cn'
import { ExpenseListTab } from '@/slices/expenses/components/ExpenseListTab'
import { BalanceTab } from '@/slices/balances/components/BalanceTab'
import { MembersTab } from '../components/MembersTab'
import { InviteModal } from '../components/InviteModal'
import { StatsTab } from '@/slices/stats/pages/StatsTab'
import { ActivityFeedTab } from '@/slices/activity/components/ActivityFeedTab'
import { BudgetsTab } from '@/slices/budgets/components/BudgetsTab'
type Tab = 'expenses' | 'balance' | 'budgets' | 'stats' | 'activity' | 'members'

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('expenses')
  const [showInvite, setShowInvite] = useState(false)

  const { data: group, isLoading } = useGroup(groupId!)
  const { user } = useAuth()

  if (isLoading) return <PageLoader />
  if (!group) return null

  const tabs = [
    { id: 'expenses' as Tab, label: t('groups.expenses'), icon: Receipt },
    { id: 'balance' as Tab, label: t('groups.balance'), icon: Scale },
    { id: 'budgets' as Tab, label: t('budgets.title'), icon: Target },
    { id: 'stats' as Tab, label: t('stats.title'), icon: BarChart2 },
    { id: 'activity' as Tab, label: t('activity.title'), icon: Clock },
    { id: 'members' as Tab, label: t('groups.members'), icon: Users },
  ]

  return (
    <div className="space-y-4">
      {/* Header del grupo */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl flex-shrink-0">
          {group.emoji ?? '👥'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground truncate">{group.name}</h2>
          {group.description && (
            <p className="text-sm text-muted-foreground truncate">{group.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="p-2 rounded-xl border border-border hover:bg-accent transition-colors"
          title={t('groups.invite')}
        >
          <LinkIcon className="h-4 w-4 text-foreground" />
        </button>
      </div>

      {/* Tabs — deslizable en móvil */}
      <div className="overflow-x-auto scrollbar-none -mx-4 px-4">
        <div className="flex rounded-xl bg-muted p-1 gap-1 min-w-max sm:min-w-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={label}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                activeTab === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de tabs */}
      <div>
        {activeTab === 'expenses' && <ExpenseListTab groupId={groupId!} currency={group.currency} />}
        {activeTab === 'balance' && <BalanceTab groupId={groupId!} />}
        {activeTab === 'budgets' && <BudgetsTab groupId={groupId!} currency={group.currency} />}
        {activeTab === 'stats' && <StatsTab groupId={groupId!} />}
        {activeTab === 'activity' && <ActivityFeedTab groupId={groupId!} />}
        {activeTab === 'members' && <MembersTab group={group} />}
      </div>

      {/* FAB: Añadir gasto */}
      {activeTab === 'expenses' && (
        <button
          onClick={() => navigate(`/groups/${groupId}/expenses/new`)}
          className={cn(
            'fixed bottom-24 right-4 z-30',
            'w-14 h-14 rounded-2xl shadow-lg',
            'bg-primary text-primary-foreground',
            'flex items-center justify-center',
            'hover:opacity-90 active:scale-95 transition-all',
          )}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {showInvite && (
        <InviteModal
          group={group}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  )
}
