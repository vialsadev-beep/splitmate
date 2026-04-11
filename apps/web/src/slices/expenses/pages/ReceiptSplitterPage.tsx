import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createWorker } from 'tesseract.js'
import { Plus, Camera, Loader2, AlertCircle, Sparkles, X } from 'lucide-react'
import { useGroup } from '@/slices/groups/api/groups.queries'
import { useCreateExpense } from '../api/expenses.queries'
import { useAuth } from '@/shared/hooks/useAuth'
import { PageLoader } from '@/shared/components/LoadingSpinner'
import { ApiErrorMessage } from '@/shared/components/ApiErrorMessage'
import { cn } from '@/shared/utils/cn'
import type { ReceiptItem } from '@splitmate/shared'

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
      .trim().replace(/\s+/g, ' ').replace(/^\d+\s+/, '').replace(/[*#@|]+/g, '').trim()
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

  const [step, setStep] = useState<'photo' | 'details'>('photo')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [detectedItems, setDetectedItems] = useState<ParsedItem[]>([])
  const [expenseTitle, setExpenseTitle] = useState('')
  const [payerId, setPayerId] = useState<string>('')
  // Items manuales extra
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [extraItems, setExtraItems] = useState<ParsedItem[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const members = group?.members ?? []

  if (group && !payerId) setPayerId(user?.id ?? members[0]?.userId ?? '')

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
  )

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file))
    setParseError(null)
    setParsing(true)
    try {
      const worker = await createWorker('spa+eng')
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()
      const parsed = parseReceiptText(text)
      setDetectedItems(parsed)
    } catch {
      setParseError(t('receipt.parseError'))
    } finally {
      setParsing(false)
      setStep('details')
    }
  }

  const allItems = [...detectedItems, ...extraItems]
  const total = allItems.reduce((s, i) => s + parseFloat(i.price || '0'), 0)

  function addExtra() {
    const price = parseFloat(newPrice.replace(',', '.'))
    if (!newName.trim() || isNaN(price) || price <= 0) return
    setExtraItems((prev) => [...prev, { name: newName.trim(), price: price.toFixed(2) }])
    setNewName('')
    setNewPrice('')
  }

  function removeDetected(index: number) {
    setDetectedItems((prev) => prev.filter((_, i) => i !== index))
  }

  function removeExtra(index: number) {
    setExtraItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleCreate() {
    if (!expenseTitle.trim() || allItems.length === 0 || !payerId) return

    // Crear el gasto con EQUAL split (todos los miembros) y guardar receiptItems sin asignar
    const receiptItems: ReceiptItem[] = allItems.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      price: item.price,
      memberIds: [],
      locked: false,
    }))

    try {
      await (createExpense.mutateAsync as (data: Parameters<typeof createExpense.mutateAsync>[0] & { receiptItems?: ReceiptItem[] }) => Promise<unknown>)({
        title: expenseTitle.trim(),
        amount: total.toFixed(2),
        payerId,
        splitType: 'EQUAL',
        date: new Date().toISOString(),
        receiptItems,
      })
      navigate(-1)
    } catch {
      // mostrado abajo
    }
  }

  if (isLoading) return <PageLoader />

  const canCreate = expenseTitle.trim() && allItems.length > 0 && payerId

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('receipt.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{group?.name}</p>
      </div>

      {/* Zona de foto */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{t('receipt.photo')}</span>
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
          </div>
        </div>

        {photoUrl ? (
          <img src={photoUrl} alt="Ticket" className="w-full max-h-[35vh] object-contain bg-black/5" />
        ) : (
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
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handlePhotoChange} />
      </div>

      {parseError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{parseError}</p>
        </div>
      )}

      {step === 'details' && (
        <>
          {/* Nombre del gasto y pagador */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">{t('expenses.description')}</label>
              <input value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} placeholder={t('receipt.titlePlaceholder')} className={inputClass} />
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

          {/* Items detectados */}
          {allItems.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t('receipt.items')}</h3>
              {detectedItems.map((item, i) => (
                <div key={`d-${i}`} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-foreground truncate flex-1">{item.name}</span>
                  <span className="text-muted-foreground font-medium flex-shrink-0">{item.price} {group?.currency}</span>
                  <button type="button" onClick={() => removeDetected(i)} className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {extraItems.map((item, i) => (
                <div key={`e-${i}`} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-foreground truncate flex-1">{item.name}</span>
                  <span className="text-muted-foreground font-medium flex-shrink-0">{item.price} {group?.currency}</span>
                  <button type="button" onClick={() => removeExtra(i)} className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="text-sm font-semibold">{t('expenses.total')}</span>
                <span className="text-sm font-bold">{total.toFixed(2)} {group?.currency}</span>
              </div>
            </div>
          )}

          {/* Añadir item manual */}
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{t('receipt.addManual')}</h3>
            <div className="grid grid-cols-2 gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('receipt.itemName')} className={inputClass} onKeyDown={(e) => e.key === 'Enter' && addExtra()} />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{group?.currency ?? 'EUR'}</span>
                <input type="number" step="0.01" min="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0.00" inputMode="decimal" className={cn(inputClass, 'pl-12')} onKeyDown={(e) => e.key === 'Enter' && addExtra()} />
              </div>
            </div>
            <button type="button" onClick={addExtra} disabled={!newName.trim() || !newPrice} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 disabled:opacity-40 transition-colors">
              <Plus className="h-4 w-4" />
              {t('receipt.addLine')}
            </button>
          </div>

          {/* Aviso de asignación posterior */}
          {allItems.length > 0 && (
            <p className="text-xs text-muted-foreground text-center px-4">
              {t('receipt.assignLater')}
            </p>
          )}

          {createExpense.error && <ApiErrorMessage error={createExpense.error} fallback="Error al crear el gasto" />}

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={handleCreate} disabled={createExpense.isPending || !canCreate} className={cn('flex-1 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50')}>
              {createExpense.isPending ? t('common.loading') : t('receipt.createExpense')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
