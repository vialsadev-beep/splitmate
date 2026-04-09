import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGroups } from '../api/groups.queries'
import { GroupCard } from '../components/GroupCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { PageLoader } from '@/shared/components/LoadingSpinner'
import { cn } from '@/shared/utils/cn'

export default function GroupsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: groups, isLoading } = useGroups()

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{t('groups.title')}</h2>
        <button
          onClick={() => navigate('/groups/new')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold',
            'bg-primary text-primary-foreground',
            'hover:opacity-90 active:scale-[0.98] transition-all',
          )}
        >
          <Plus className="h-4 w-4" />
          {t('common.create')}
        </button>
      </div>

      {!groups?.length ? (
        <EmptyState
          icon="🏖️"
          title={t('groups.empty')}
          description={t('groups.emptyDesc')}
          action={
            <button
              onClick={() => navigate('/groups/new')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
            >
              {t('groups.create')}
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}
