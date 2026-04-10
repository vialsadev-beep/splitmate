import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createWorker } from 'tesseract.js'
import { Plus, Trash2, Camera, ChevronDown, ChevronUp, X, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { useGroup } from '@/slices/groups/api/groups.queries'
import { useCreateExpense } from '../api/expenses.queries'
import { useAuth } from '@/shared/hooks/useAuth'
import { PageLoader } from '@/shared/components/LoadingSpinner'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import { cn } from '@/shared/utils/cn'

interface LineItem {
  id: string
  name: string
  price: string
  memberIds: string[]
}

interface ParsedItem {
  name: string
  price: string
}

const SKIP_RE = /total|subtotal|iva|imp\.?|desc\.?|dcto|entrega|cambio|tarjeta|efectivo|ticket|factura|gracias|fecha|hora|cif|nif|unidades?|cantidad|pvp|operador|cajero|visita|num\.|n[oº]\.?/i
const PRICE_RE = /(\d{1,4}[.,]\d{2})\s*[€$]?\s*(?:[A-Z*]|\*|=)?\s*$/

function parseReceiptText(text: string): ParsedItem[] {
  const items: ParsedItem[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.length < 3 || SKIP_RE.test(line)) continue
    const priceMatch = line.match(PRICE_RE)
    if (!priceMatch) continue
    const price = parseFloat(priceMatch[1].replace(',', '.'))
    if (price <= 0 || price > 500) continue
    const name = line.slice(0, line.lastIndexOf(priceMatch[0]))
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^\d+\s+/, '')
      .replace(/[*#@|]+/g, '')
      .trim()
    if (name.length < 2) continue
    items.push({ name, price: price.toFixed(2) })
  }
  return items
}

export default function ReceiptSplitterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
  const { user } = useAuth()
  const { data: group, isLoading } = useGroup(groupId!)
  const createExpense = useCreateExpense(groupId!)

  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoExpanded, setPhotoExpanded] = useState(true)
  const [items, setItems] = useState<LineItem[]>([])
  const [expenseTitle, setExpenseTitle] = useState('')
  const [payerId, setPayerId] = useState<string>('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  // Form para nuevo item manual
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newMemberIds, setNewMemberIds] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const members = group?.members ?? []

  if (group && !payerId) {
    setPayerId(user?.id ?? members[0]?.userId ?? '')
  }

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
  )

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setPhotoUrl(url)
    setPhotoExpanded(true)
    setParseError(null)

    // Auto-parsear con Claude Vision
    await parseReceipt(file)
  }

  async function parseReceipt(file: File) {
    setParsing(true)
    setParseError(null)
    try {
      const worker = await createWorker('spa+eng')
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      const parsed = parseReceiptText(text)
      if (parsed.length === 0) {
        setParseError(t('receipt.noItemsFound'))
        return
      }
      setItems(parsed.map((item) => ({
        id: crypto.randomUUID(),
        name: item.name,
        price: item.price,
        memberIds: [],
      })))
    } catch {
      setParseError(t('receipt.parseError'))
    } finally {
      setParsing(false)
    }
  }

  function toggleMemberForItem(itemId: string, userId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId ? item : {
          ...item,
          memberIds: item.memberIds.includes(userId)
            ? item.memberIds.filter((id) => id !== userId)
            : [...item.memberIds, userId],
        },
      ),
    )
  }

  function toggleMember(userId: string) {
    setNewMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  function addItem() {
    const price = parseFloat(newPrice.replace(',', '.'))
    if (!newName.trim() || isNaN(price) || price <= 0) return
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: newName.trim(), price: price.toFixed(2), memberIds: newMemberIds },
    ])
    setNewName('')
    setNewPrice('')
    setNewMemberIds([])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function updateItemName(id: string, name: string) {
    setItems((prev) => prev.map((item) => item.id !== id ? item : { ...item, name }))
  }

  function updateItemPrice(id: string, price: string) {
    setItems((prev) => prev.map((item) => item.id !== id ? item : { ...item, price }))
  }

  // Totales por miembro
  const memberTotals = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.userId] = 0
    return acc
  }, {})

  for (const item of items) {
    if (item.memberIds.length === 0) continue
    const share = parseFloat(item.price) / item.memberIds.length
    for (const uid of item.memberIds) {
      if (memberTotals[uid] !== undefined) memberTotals[uid] += share
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.price || '0'), 0)
  const activeMemberIds = members.filter((m) => memberTotals[m.userId] > 0).map((m) => m.userId)
  const unassignedItems = items.filter((item) => item.memberIds.length === 0)

  async function handleSubmit() {
    if (!expenseTitle.trim() || items.length === 0 || activeMemberIds.length === 0) return

    const rawSplits = activeMemberIds.map((uid) => ({
      userId: uid,
      amount: memberTotals[uid].toFixed(2),
    }))

    // Ajustar residuo de redondeo
    const splitSum = rawSplits.reduce((s, sp) => s + parseFloat(sp.amount), 0)
    const residual = parseFloat((totalAmount - splitSum).toFixed(2))
    if (residual !== 0 && rawSplits.length > 0) {
      rawSplits[0].amount = (parseFloat(rawSplits[0].amount) + residual).toFixed(2)
    }

    try {
      await createExpense.mutateAsync({
        title: expenseTitle.trim(),
        amount: totalAmount.toFixed(2),
        payerId,
        splitType: 'EXACT',
        splits: rawSplits,
        date: new Date().toISOString(),
      })
      navigate(-1)
    } catch {
      // shown below
    }
  }

  if (isLoading) return <PageLoader />

  const canSubmit = expenseTitle.trim() && items.length > 0 && activeMemberIds.length > 0 && unassignedItems.length === 0

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('receipt.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{group?.name}</p>
      </div>

      {/* Foto del ticket */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => photoUrl && setPhotoExpanded((v) => !v)}
            className="flex-1 text-left text-sm font-semibold text-foreground"
          >
            {t('receipt.photo')}
          </button>
          <div className="flex items-center gap-2">
            {parsing && (
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('receipt.analyzing')}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {photoUrl ? t('receipt.changePhoto') : t('receipt.addPhoto')}
            </button>
            {photoUrl && !parsing && (
              photoExpanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {photoUrl && photoExpanded && (
          <div className="relative">
            <img src={photoUrl} alt="Ticket" className="w-full max-h-[45vh] object-contain bg-black/5" />
            <button
              type="button"
              onClick={() => { setPhotoUrl(null); setItems([]); setParseError(null) }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!photoUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-10 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Camera className="h-8 w-8" />
            <span className="text-sm">{t('receipt.tapToAdd')}</span>
            <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {t('receipt.autoDetect')}
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      {/* Error de parsing */}
      {parseError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{parseError}</p>
        </div>
      )}

      {/* Nombre del gasto y quién paga */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.description')}</label>
          <input
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            placeholder={t('receipt.titlePlaceholder')}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">{t('expenses.paidBy')}</label>
          <select value={payerId} onChange={(e) => setPayerId(e.target.value)} className={inputClass}>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userId === user?.id ? `${m.name} (${t('groups.you')})` : m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items detectados / manuales */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{t('receipt.items')}</h3>
            {unassignedItems.length > 0 && (
              <span className="text-xs text-amber-500 font-medium">
                {t('receipt.unassigned', { count: unassignedItems.length })}
              </span>
            )}
          </div>

          {items.map((item) => {
            const unassigned = item.memberIds.length === 0
            const sharePerPerson = item.memberIds.length > 0
              ? (parseFloat(item.price || '0') / item.memberIds.length).toFixed(2)
              : null

            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-xl border bg-card p-3 space-y-2.5 transition-colors',
                  unassigned ? 'border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10' : 'border-border',
                )}
              >
                {/* Nombre + precio + borrar */}
                <div className="flex items-center gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItemName(item.id, e.target.value)}
                    className={cn(
                      'flex-1 px-2.5 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary transition-colors',
                    )}
                  />
                  <div className="relative w-24 flex-shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price}
                      onChange={(e) => updateItemPrice(item.id, e.target.value)}
                      className={cn(
                        'w-full pl-2 pr-2 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground text-right',
                        'focus:outline-none focus:ring-2 focus:ring-primary transition-colors',
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Quién lo pidió */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('receipt.whoOrdered')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m) => {
                      const selected = item.memberIds.includes(m.userId)
                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => toggleMemberForItem(item.id, m.userId)}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all',
                            selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <div className={cn(
                            'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                            selected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                          )}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{m.userId === user?.id ? t('groups.you') : m.name.split(' ')[0]}</span>
                        </button>
                      )
                    })}
                  </div>
                  {sharePerPerson && item.memberIds.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {sharePerPerson} {group?.currency} {t('expenses.each')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Añadir línea manual */}
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t('receipt.addManual')}</h3>

        <div className="grid grid-cols-2 gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('receipt.itemName')}
            className={inputClass}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {group?.currency ?? 'EUR'}
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className={cn(inputClass, 'pl-12')}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{t('receipt.whoOrdered')}</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => toggleMember(m.userId)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  newMemberIds.includes(m.userId)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold',
                  newMemberIds.includes(m.userId) ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                {m.userId === user?.id ? t('groups.you') : m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={addItem}
          disabled={!newName.trim() || !newPrice}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 disabled:opacity-40 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('receipt.addLine')}
        </button>
      </div>

      {/* Resumen de totales */}
      {activeMemberIds.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t('receipt.summary')}</h3>
          {members
            .filter((m) => memberTotals[m.userId] > 0)
            .map((m) => (
              <div key={m.userId} className="flex items-center justify-between">
                <span className="text-sm text-foreground">
                  {m.userId === user?.id ? t('groups.you') : m.name}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {memberTotals[m.userId].toFixed(2)} {group?.currency}
                </span>
              </div>
            ))}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{t('expenses.total')}</span>
            <span className="text-sm font-bold text-foreground">
              {totalAmount.toFixed(2)} {group?.currency}
            </span>
          </div>
        </div>
      )}

      {createExpense.error && (
        <ApiErrorMessage error={createExpense.error} fallback="Error al crear el gasto" />
      )}

      {/* Botones */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createExpense.isPending || !canSubmit}
          className={cn(
            'flex-1 py-3 rounded-xl text-sm font-semibold',
            'bg-primary text-primary-foreground',
            'hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50',
          )}
        >
          {createExpense.isPending ? t('common.loading') : t('receipt.createExpense')}
        </button>
      </div>
    </div>
  )
}
