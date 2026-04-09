import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Shield } from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'
import { cn } from '@/shared/utils/cn'
import { useUpdateGroup, useUploadGroupAvatar } from '../api/groups.queries'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import type { GroupResponse } from '@splitmate/shared'

interface Props {
  group: GroupResponse
}

export function MembersTab({ group }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = group.members.find((m) => m.userId === user?.id)?.role === 'ADMIN'

  const updateGroup = useUpdateGroup(group.id)
  const uploadAvatar = useUploadGroupAvatar(group.id)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [debtLimit, setDebtLimit] = useState(group.debtLimit ?? '')
  const [debtLimitSaved, setDebtLimitSaved] = useState(false)
  const [avatarError, setAvatarError] = useState<unknown>(null)
  const [debtLimitError, setDebtLimitError] = useState<unknown>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    try {
      await uploadAvatar.mutateAsync(file)
    } catch (e) {
      setAvatarError(e)
    }
  }

  async function handleSaveDebtLimit() {
    const val = debtLimit.trim()
    setDebtLimitError(null)
    try {
      await updateGroup.mutateAsync({ debtLimit: val || null })
      setDebtLimitSaved(true)
      setTimeout(() => setDebtLimitSaved(false), 2000)
    } catch (e) {
      setDebtLimitError(e)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Sección de admin */}
      {isAdmin && (
        <div className="rounded-xl bg-card border border-border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t('groups.adminSettings')}</h3>
          </div>

          {/* Avatar del grupo */}
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center overflow-hidden">
                {group.avatarUrl ? (
                  <img
                    src={group.avatarUrl!}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">{group.emoji ?? '👥'}</span>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t('groups.groupAvatar')}</p>
              <p className="text-xs text-muted-foreground">{t('groups.groupAvatarDesc')}</p>
            </div>
          </div>
          <ApiErrorMessage error={avatarError} />

          {/* Límite de deuda */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('groups.debtLimit')}</label>
            <p className="text-xs text-muted-foreground">{t('groups.debtLimitDesc')}</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {group.currency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={debtLimit}
                  onChange={(e) => setDebtLimit(e.target.value)}
                  placeholder={t('groups.debtLimitPlaceholder')}
                  className={cn(
                    'w-full pl-14 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
                  )}
                />
              </div>
              <button
                onClick={handleSaveDebtLimit}
                disabled={updateGroup.isPending}
                className={cn(
                  'px-4 rounded-xl text-sm font-semibold transition-all',
                  debtLimitSaved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-primary text-primary-foreground hover:opacity-90',
                  updateGroup.isPending && 'opacity-50',
                )}
              >
                {debtLimitSaved ? '✓' : t('common.save')}
              </button>
            </div>
            <ApiErrorMessage error={debtLimitError} />
          </div>
        </div>
      )}

      {/* Lista de miembros */}
      <div className="space-y-2">
        {group.members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
          >
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-primary">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {member.name}
                {member.userId === user?.id && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({t('groups.you')})</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>

            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
              member.role === 'ADMIN'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground',
            )}>
              {member.role === 'ADMIN' ? t('groups.admin') : t('groups.member')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
