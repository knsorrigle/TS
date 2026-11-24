import { Check, X, Info } from 'lucide-react'
import { dismiss, useToasts } from '../lib/toast'

export function Toaster() {
  const toasts = useToasts()
  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-[180] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className="toast pointer-events-auto flex max-w-[min(92vw,440px)] items-center gap-3 rounded-full border border-line-strong bg-ink-2/90 py-2.5 pl-3 pr-2 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl"
        >
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${t.kind === 'error' ? 'bg-ember/15 text-ember' : 'bg-spark/15 text-spark'}`}>
            {t.kind === 'success' ? <Check size={13} strokeWidth={2.5} /> : t.kind === 'error' ? <X size={13} strokeWidth={2.5} /> : <Info size={13} strokeWidth={2.5} />}
          </span>
          <p className="text-[14px] leading-snug text-frost">{t.message}</p>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-mute-hi transition-colors hover:bg-white/5 hover:text-frost">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
