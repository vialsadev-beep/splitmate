import { useState } from 'react'
import { X, Copy, Check, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRegenerateInviteCode } from '../api/groups.queries'
import { cn } from '@/shared/utils/cn'
import type { GroupResponse } from '@splitmate/shared'

interface Props {
  group: GroupResponse
  onClose: () => void
}

export function InviteModal({ group, onClose }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const regenerate = useRegenerateInviteCode(group.id)

  const inviteUrl = `${window.location.origin}/join/${group.inviteCode}`

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={cn(
        'w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl',
        'p-5 space-y-4',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{t('groups.inviteLink')}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {t('groups.inviteDesc', { name: group.name })}
        </p>

        {/* Link */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
          <p className="flex-1 text-xs text-muted-foreground truncate font-mono">{inviteUrl}</p>
          <button
            onClick={copyLink}
            className={cn(
              'flex-shrink-0 p-1.5 rounded-lg transition-all',
              copied ? 'text-success' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold',
              'bg-primary text-primary-foreground hover:opacity-90 transition-all',
            )}
          >
            {copied ? t('common.copied') : t('groups.copyLink')}
          </button>
          <button
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            className="p-2.5 rounded-xl border border-border hover:bg-accent transition-colors"
            title={t('groups.regenerateLink')}
          >
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', regenerate.isPending && 'animate-spin')} />
          </button>
        </div>
      </div>
    </div>
  )
}
