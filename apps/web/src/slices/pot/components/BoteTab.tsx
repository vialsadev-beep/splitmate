import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, Check, X, Settings, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'
import { cn } from '@/shared/utils/cn'
import { formatCurrency } from '@/shared/utils'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import {
  useGroupPot,
  useConfigurePot,
  useAddContribution,
  useConfirmContribution,
  useCancelContribution,
  type PotContribution,
} from '../api/pot.queries'

interface Props {
  groupId: string
  currency: string
  isAdmin: boolean
}

// ─── Abrir PayPal.me ─────────────────────────────────────────
function openPayPal(paypalMe: string, amount: number) {
  const url = `https://www.paypal.com/paypalme/${paypalMe}/${amount.toFixed(2)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

// ─── Tarjeta de contribución individual ──────────────────────
function ContributionCard({
  contribution,
  isAdmin,
  currentUserId,
  currency,
  onConfirm,
  onCancel,
  confirming,
  cancelling,
}: {
  contribution: PotContribution
  isAdmin: boolean
  currentUserId: string
  currency: string
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  confirming: boolean
  cancelling: boolean
}) {
  const { t } = useTranslation()
  const isMe = contribution.userId === currentUserId
  const canCancel = (isMe || isAdmin) && contribution.status === 'PENDING'

  const statusColors = {
    PENDING: 'bg-warning/10 text-warning border-warning/20',
    CONFIRMED: 'bg-success/10 text-success border-success/20',
    CANCELLED: 'bg-muted text-muted-foreground border-border',
  }

  const statusLabel = {
    PENDING: t('pot.statusPending'),
    CONFIRMED: t('pot.statusConfirmed'),
    CANCELLED: t('pot.statusCancelled'),
  }

  return (
    <div className={cn('flex items-center gap-3 px-3.5 py-3', contribution.status === 'CANCELLED' && 'opacity-50')}>
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        {contribution.userAvatarUrl ? (
          <img src={contribution.userAvatarUrl} alt={contribution.userName} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-primary">{contribution.userName.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{isMe ? t('groups.you') : contribution.userName}</p>
        {contribution.payerContact && <p className="text-xs text-muted-foreground truncate">PayPal: {contribution.payerContact}</p>}
        {contribution.notes && <p className="text-xs text-muted-foreground truncate">{contribution.notes}</p>}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-semibold text-foreground">{formatCurrency(contribution.amount, currency)}</span>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', statusColors[contribution.status])}>
          {statusLabel[contribution.status]}
        </span>
      </div>

      {isAdmin && contribution.status === 'PENDING' && (
        <button
          onClick={() => onConfirm(contribution.id)}
          disabled={confirming}
          title={t('pot.confirm')}
          className="w-7 h-7 rounded-full bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors flex-shrink-0"
        >
          {confirming ? <LoadingSpinner size="xs" /> : <Check className="h-3.5 w-3.5" />}
        </button>
      )}
      {canCancel && (
        <button
          onClick={() => onCancel(contribution.id)}
          disabled={cancelling}
          title={t('common.cancel')}
          className="w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors flex-shrink-0"
        >
          {cancelling ? <LoadingSpinner size="xs" /> : <X className="h-3 w-3" />}
        </button>
      )}
    </div>
  )
}

// ─── Modal para ingresar al bote ─────────────────────────────
function ContributeModal({
  paypalMe,
  currency,
  onClose,
  groupId,
}: {
  paypalMe: string
  currency: string
  onClose: () => void
  groupId: string
}) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [payerContact, setPayerContact] = useState('')
  const [notes, setNotes] = useState('')
  const addContribution = useAddContribution(groupId)

  async function handlePay() {
    const num = parseFloat(amount)
    if (!num || num <= 0) return
    await addContribution.mutateAsync({ amount: num, payerContact: payerContact || undefined, notes: notes || undefined })
    openPayPal(paypalMe, num)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-background rounded-2xl shadow-xl">
        <div className="p-5 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">{t('pot.contribute')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('pot.contributeDesc', { name: paypalMe })}
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('pot.amount')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currency}</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('pot.payerContact')}</label>
            <input
              type="text"
              value={payerContact}
              onChange={(e) => setPayerContact(e.target.value)}
              maxLength={100}
              placeholder={t('pot.payerContactPlaceholder')}
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t('pot.notes')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              placeholder={t('pot.notesPlaceholder')}
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* Indicador PayPal */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#003087]/10 border border-[#003087]/20">
            <span className="text-lg">🅿️</span>
            <p className="text-xs text-foreground">
              {t('pot.paypalInfo', { user: paypalMe })}
            </p>
          </div>
          <ApiErrorMessage error={addContribution.error} />
        </div>
        <div className="p-4 flex gap-2 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            {t('common.cancel')}
          </button>
          <button
            onClick={handlePay}
            disabled={!amount || parseFloat(amount) <= 0 || addContribution.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: '#003087', color: 'white' }}
          >
            {addContribution.isPending ? (
              <LoadingSpinner size="xs" />
            ) : (
              <>
                <ExternalLink className="h-3.5 w-3.5" />
                {t('pot.openPayPal')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Formulario de configuración (solo admin) ─────────────────
function ConfigureForm({ groupId, current, onDone }: { groupId: string; current: { paypalMe: string } | null; onDone: () => void }) {
  const { t } = useTranslation()
  const [paypalMe, setPaypalMe] = useState(current?.paypalMe ?? '')
  const configure = useConfigurePot(groupId)

  async function handleSave() {
    await configure.mutateAsync({ paypalMe: paypalMe.trim() })
    onDone()
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{t('pot.configure')}</h3>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">{t('pot.paypalUsername')}</label>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground flex-shrink-0">paypal.me/</span>
          <input
            type="text"
            value={paypalMe}
            onChange={(e) => setPaypalMe(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
            placeholder="tunombre"
            className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">{t('pot.paypalUsernameDesc')}</p>
      </div>
      <ApiErrorMessage error={configure.error} />
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors">
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={!paypalMe.trim() || configure.isPending}
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {configure.isPending ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

// ─── Tab principal ────────────────────────────────────────────
export function BoteTab({ groupId, currency, isAdmin }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: pot, isLoading } = useGroupPot(groupId)
  const confirmContribution = useConfirmContribution(groupId)
  const cancelContribution = useCancelContribution(groupId)

  const [showContribute, setShowContribute] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  }

  if (!pot) {
    return (
      <div className="space-y-4 pb-6">
        <div className="py-12 text-center space-y-3">
          <p className="text-4xl">💰</p>
          <p className="text-sm font-medium text-foreground">{t('pot.notConfigured')}</p>
          <p className="text-xs text-muted-foreground">{t('pot.notConfiguredDesc')}</p>
        </div>
        {isAdmin && (
          showConfig
            ? <ConfigureForm groupId={groupId} current={null} onDone={() => setShowConfig(false)} />
            : (
              <button
                onClick={() => setShowConfig(true)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Settings className="h-4 w-4" />
                {t('pot.configurePot')}
              </button>
            )
        )}
      </div>
    )
  }

  const activeContributions = pot.contributions.filter((c) => c.status !== 'CANCELLED')
  const pendingContributions = pot.contributions.filter((c) => c.status === 'PENDING')
  const historyContributions = pot.contributions.filter((c) => c.status === 'CANCELLED')

  return (
    <div className="space-y-4 pb-6">
      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('pot.totalInPot')}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(pot.totalConfirmed, currency)}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-7 w-7 text-primary" />
          </div>
        </div>
        {pendingContributions.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {t('pot.pendingInfo', {
              count: pendingContributions.length,
              amount: formatCurrency(
                pendingContributions.reduce((acc, c) => acc + parseFloat(c.amount), 0).toFixed(2),
                currency,
              ),
            })}
          </p>
        )}
      </div>

      {/* Botón PayPal */}
      <button
        onClick={() => setShowContribute(true)}
        className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-[0.98]"
        style={{ background: '#003087', color: 'white' }}
      >
        <ExternalLink className="h-4 w-4" />
        {t('pot.payWithPayPal')}
      </button>

      {/* Configurar (admin) */}
      {isAdmin && (
        showConfig
          ? <ConfigureForm groupId={groupId} current={pot} onDone={() => setShowConfig(false)} />
          : (
            <button
              onClick={() => setShowConfig(true)}
              className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2 hover:bg-accent transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              {t('pot.editConfig')}
            </button>
          )
      )}

      {/* Lista de contribuciones */}
      {activeContributions.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{t('pot.contributions')}</h3>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {activeContributions.map((c) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                isAdmin={isAdmin}
                currentUserId={user?.id ?? ''}
                currency={currency}
                onConfirm={(id) => confirmContribution.mutate(id)}
                onCancel={(id) => cancelContribution.mutate(id)}
                confirming={confirmContribution.isPending && confirmContribution.variables === c.id}
                cancelling={cancelContribution.isPending && cancelContribution.variables === c.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cancelados */}
      {historyContributions.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {t('pot.showCancelled', { count: historyContributions.length })}
          </button>
          {showHistory && (
            <div className="mt-2 rounded-xl bg-card border border-border divide-y divide-border">
              {historyContributions.map((c) => (
                <ContributionCard
                  key={c.id}
                  contribution={c}
                  isAdmin={isAdmin}
                  currentUserId={user?.id ?? ''}
                  currency={currency}
                  onConfirm={() => {}}
                  onCancel={() => {}}
                  confirming={false}
                  cancelling={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeContributions.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{t('pot.noContributions')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('pot.noContributionsDesc')}</p>
        </div>
      )}

      {showContribute && (
        <ContributeModal
          paypalMe={pot.paypalMe}
          currency={currency}
          groupId={groupId}
          onClose={() => setShowContribute(false)}
        />
      )}
    </div>
  )
}
