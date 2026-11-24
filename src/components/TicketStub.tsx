import { useMemo } from 'react'
import { useNextEvent } from '../lib/useEvents'
import { openRegister } from '../lib/registerStore'
import { scrollToTarget } from '../lib/motion'
import { formatDateShort } from '../lib/time'

/** Deterministic barcode bars from a string. */
function Barcode({ seed, className = '' }: { seed: string; className?: string }) {
  const bars = useMemo(() => {
    let h = 2166136261
    const out: { x: number; w: number }[] = []
    let x = 0
    for (let i = 0; x < 118; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i % seed.length), 16777619) >>> 0
      const w = 1 + (h % 3), gap = 1 + ((h >> 3) % 3)
      out.push({ x, w }); x += w + gap
    }
    return out
  }, [seed])
  return (
    <svg viewBox="0 0 120 22" className={className} aria-hidden preserveAspectRatio="none">
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={22} fill="currentColor" />)}
    </svg>
  )
}

/** The hero's micro-detail: an event-ticket stub. Tap → the next event's registration. */
export function TicketStub() {
  const next = useNextEvent()
  const go = () => (next ? openRegister(next) : scrollToTarget('events', { offset: -40 }))
  return (
    <button
      type="button"
      onClick={go}
      data-cursor={next ? 'REGISTER' : 'VIEW'}
      className="group relative flex items-stretch gap-0 rounded-[10px] border border-white/25 bg-void/40 text-left text-frost backdrop-blur-sm transition-[border-color,transform] duration-500 ease-[var(--ease-expo)] hover:-translate-y-0.5 hover:border-white/60"
      aria-label={next ? `Register for ${next.title}` : 'See upcoming events'}
    >
      <span className="flex flex-col justify-between px-3.5 py-2.5">
        <span className="text-[10.5px] font-[650] uppercase tracking-[0.1em]">TS—2026 · Navkis · CSE</span>
        <span className="t-num mt-1 text-[11.5px] text-mute-hi">
          {next ? <>Admit one · {formatDateShort(next.date)}</> : 'Admit one · Campus events'}
        </span>
      </span>
      <span aria-hidden className="relative w-px border-l border-dashed border-white/25">
        <span className="absolute -left-[5px] -top-[5px] h-2.5 w-2.5 rounded-full bg-void" />
        <span className="absolute -bottom-[5px] -left-[5px] h-2.5 w-2.5 rounded-full bg-void" />
      </span>
      <span className="flex items-center px-3 py-2.5"><Barcode seed={next?.slug ?? 'techspark'} className="h-[22px] w-[64px] text-frost/90 transition-colors group-hover:text-spark" /></span>
    </button>
  )
}
