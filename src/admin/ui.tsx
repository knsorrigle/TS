import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, Upload, Loader2, Trash2, ImageOff, Link2 } from 'lucide-react'
import { checkImage, uploadImage } from './adminApi'
import { toast } from '../lib/toast'

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-[600] uppercase tracking-[0.06em] text-mute-hi">{label}</span>
        {hint && !error && <span className="text-[12px] text-mute">{hint}</span>}
        {error && <span className="text-[12px] text-ember">{error}</span>}
      </span>
      {children}
    </label>
  )
}

const base = 'w-full rounded-xl border bg-void/60 px-3.5 text-[15px] text-frost outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-mute focus:border-spark/70 focus:shadow-[0_0_0_3px_rgb(26_159_232/0.15)] disabled:opacity-50'
export const Input = ({ invalid, className = '', ...p }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) =>
  <input {...p} aria-invalid={invalid || undefined} className={`${base} h-11 ${invalid ? 'border-ember/60' : 'border-line-strong'} ${className}`} />
export const Textarea = ({ className = '', ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
  <textarea {...p} className={`${base} min-h-[110px] resize-y border-line-strong py-3 leading-relaxed ${className}`} />
export const Select = ({ options, className = '', ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) => (
  <select {...p} className={`${base} h-11 cursor-pointer border-line-strong ${className}`}>
    {options.map((o) => <option key={o} value={o} className="bg-ink">{o}</option>)}
  </select>
)

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2.5 text-[13.5px] text-frost/85 disabled:opacity-40"
    >
      <span className={`relative h-[22px] w-[38px] rounded-full transition-colors duration-300 ${checked ? 'bg-spark' : 'bg-white/12'}`}>
        <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-frost shadow transition-transform duration-500 ease-[var(--ease-expo)] ${checked ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
      </span>
      {label}
    </button>
  )
}

/** Side drawer editor: Esc closes (unless saving), focus moves in, background is inert. */
export function Drawer({ title, open, onClose, children, footer, busy }: { title: string; open: boolean; onClose: () => void; children: ReactNode; footer: ReactNode; busy?: boolean }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    setTimeout(() => panel.current?.querySelector<HTMLElement>('input, textarea, select')?.focus(), 80)
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    addEventListener('keydown', key)
    document.documentElement.style.overflow = 'hidden'
    return () => { removeEventListener('keydown', key); document.documentElement.style.overflow = ''; prev?.focus?.() }
  }, [open, busy, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[140] flex justify-end">
      <button type="button" aria-label="Close editor" tabIndex={-1} className="absolute inset-0 bg-void/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className="admin-drawer relative flex h-full w-full max-w-[640px] flex-col border-l border-line bg-ink">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="t-h2 text-[20px] text-frost">{title}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-mute-hi hover:bg-white/5 hover:text-frost disabled:opacity-30"><X size={16} /></button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">{children}</div>
        <footer className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer>
      </div>
    </div>
  )
}

/** Upload to the event-images bucket (≤5 MB, jpg/png/webp) or paste a URL. */
export function ImageField({ value, onChange, label = 'Image' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const take = async (file?: File) => {
    if (!file) return
    const bad = checkImage(file)
    if (bad) { setErr(bad); return }
    setErr(''); setBusy(true)
    try { onChange(await uploadImage(file)); toast.success('Image uploaded') }
    catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed') }
    finally { setBusy(false) }
  }

  return (
    <Field label={label} hint="JPG, PNG or WebP · max 5 MB" error={err}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files[0]) }}
        className={`relative overflow-hidden rounded-xl border border-dashed transition-colors ${drag ? 'border-spark bg-spark/5' : 'border-line-strong'}`}
      >
        {value ? (
          <div className="relative aspect-[16/9]">
            <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setErr('That URL doesn’t load as an image.')} />
            <button type="button" onClick={() => onChange('')} className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-void/80 px-3 py-1.5 text-[12.5px] text-frost backdrop-blur hover:bg-void"><ImageOff size={13} /> Remove</button>
          </div>
        ) : (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="flex w-full flex-col items-center gap-2 py-9 text-[14px] text-mute-hi transition-colors hover:text-frost">
            {busy ? <Loader2 size={20} className="animate-spin text-spark" /> : <Upload size={20} />}
            {busy ? 'Uploading…' : 'Drop an image or click to upload'}
          </button>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { take(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Link2 size={14} className="shrink-0 text-mute" aria-hidden />
        <Input value={value.startsWith('blob:') ? '' : value} onChange={(e) => { setErr(''); onChange(e.target.value) }} placeholder="…or paste an image URL" className="!h-9 !text-[13.5px]" />
      </div>
    </Field>
  )
}

/** Two-step delete: first click arms it for 3s. */
export function DeleteButton({ onConfirm, label = 'Delete' }: { onConfirm: () => Promise<void> | void; label?: string }) {
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t) }, [armed])
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!armed) return setArmed(true)
        setBusy(true)
        try { await onConfirm() } finally { setBusy(false); setArmed(false) }
      }}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors ${armed ? 'bg-ember/15 text-ember' : 'text-mute-hi hover:bg-white/5 hover:text-frost'}`}
      aria-label={armed ? `Confirm ${label.toLowerCase()}` : label}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      {armed ? 'Click again' : label}
    </button>
  )
}

export function Badge({ on, children }: { on?: boolean; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-[600] ${on ? 'bg-spark/15 text-spark' : 'bg-white/6 text-mute-hi'}`}>{children}</span>
}

export function Panel({ title, action, children, count }: { title: string; action?: ReactNode; children: ReactNode; count?: number }) {
  return (
    <section className="rounded-2xl border border-line bg-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="t-h2 text-[19px] text-frost">{title}{count !== undefined && <span className="t-num ml-2 text-[14px] text-mute">{count}</span>}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

export function TableState({ status, error, onRetry, empty, colSpan }: { status: string; error?: string | null; onRetry?: () => void; empty?: boolean; colSpan: number }) {
  if (status === 'loading') return <tr><td colSpan={colSpan} className="px-5 py-12 text-center text-[14px] text-mute-hi"><Loader2 size={18} className="mx-auto mb-2 animate-spin text-spark" />Loading…</td></tr>
  if (status === 'error') return <tr><td colSpan={colSpan} className="px-5 py-12 text-center text-[14px] text-ember">{error} {onRetry && <button type="button" onClick={onRetry} className="ml-2 underline">Retry</button>}</td></tr>
  if (empty) return <tr><td colSpan={colSpan} className="px-5 py-12 text-center text-[14px] text-mute-hi">Nothing here yet.</td></tr>
  return null
}
