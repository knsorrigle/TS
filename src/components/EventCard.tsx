import { Link } from 'react-router'
import { MapPin, Clock, Mic2 } from 'lucide-react'
import type { TSEvent } from '../lib/api'
import { CATEGORY_META, categoryKey } from '../lib/site'
import { fillRatio, seatState } from '../lib/status'
import { eventStart, formatCountdown, formatDateShort } from '../lib/time'
import { useLocalReg } from '../lib/useLocalReg'
import { openRegister } from '../lib/registerStore'
import { Duotone } from './Duotone'
import { useCountdown } from '../lib/useEvents'

export function SeatLine({ e }: { e: TSEvent }) {
  const s = seatState(e)
  const ratio = fillRatio(e)
  const tone = s.tone === 'closed' || s.tone === 'full' ? 'text-mute-hi' : s.tone === 'low' || s.tone === 'waitlist' ? 'text-amber' : 'text-frost'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-[13.5px] font-[560] ${tone}`}>{s.label}</span>
        {e.capacity > 0 && <span className="t-num text-[12px] text-mute">{Math.min(e.registeredCount, e.capacity)}/{e.capacity}</span>}
      </div>
      {e.capacity > 0 && (
        <div className="mt-2 h-[2px] bg-line" role="meter" aria-label="Seats filled" aria-valuemin={0} aria-valuemax={e.capacity} aria-valuenow={Math.min(e.registeredCount, e.capacity)}>
          <div className="h-full origin-left bg-white transition-transform duration-[1400ms] ease-[var(--ease-expo)]" style={{ transform: `scaleX(${ratio})` }} />
        </div>
      )}
    </div>
  )
}

export function Soon({ e }: { e: TSEvent }) {
  const start = eventStart(e.date, e.time)
  const ms = useCountdown(start)
  if (!start || ms <= 0 || ms > 48 * 3600_000) return null
  return (
    <span className="t-num inline-flex items-center rounded-full bg-white px-3 py-1 text-[12.5px] font-[550] text-black">
      Starts in {formatCountdown(ms).toLowerCase()}
    </span>
  )
}

export function RegisterButton({ e, size = 'sm', full }: { e: TSEvent; size?: 'sm' | 'md'; full?: boolean }) {
  const reg = useLocalReg(e.id)
  const s = seatState(e)
  if (reg) {
    return (
      <span className={`pill ${size === 'sm' ? 'pill--sm' : ''} ${full ? 'w-full' : ''} pointer-events-none !text-spark`} aria-label={`You're registered${reg.status === 'Waitlisted' ? ' (waitlist)' : ''}`}>
        {reg.status === 'Waitlisted' ? 'On the waitlist ✓' : 'You’re registered ✓'}
      </span>
    )
  }
  if (s.canRegister && e.registrationMode === 'external') {
    return (
      <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className={`pill pill--solid ${size === 'sm' ? 'pill--sm' : ''} ${full ? 'w-full' : ''}`}>
        Register <span aria-hidden>↗</span><span className="sr-only"> (opens in a new tab)</span>
      </a>
    )
  }
  return (
    <button
      type="button"
      disabled={!s.canRegister}
      onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); openRegister(e) }}
      className={`pill ${s.tone === 'waitlist' ? '' : 'pill--spark'} ${size === 'sm' ? 'pill--sm' : ''} ${full ? 'w-full' : ''}`}
    >
      {!s.canRegister ? s.label : s.tone === 'waitlist' ? 'Join waitlist' : 'Register'}
    </button>
  )
}

export function EventCard({ e, index }: { e: TSEvent; index: number }) {
  const meta = CATEGORY_META[categoryKey(e.category)]
  return (
    <article className="group relative flex flex-col bg-ink transition-colors duration-700 hover:bg-ink-2" data-reveal="up" data-delay={String((index % 3) * 0.08)}>
      <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-px" style={{ background: `linear-gradient(90deg, ${meta.from}, ${meta.to}, transparent)` }} />
      <Link to={`/events/${e.slug}`} viewTransition className="flex flex-1 flex-col outline-offset-[-2px]">
        <div className="relative aspect-[16/10]">
          <Duotone src={e.image} alt={e.title} category={e.category} className="absolute inset-0" label={e.image ? undefined : meta.short} />
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2"><Soon e={e} /></div>
        </div>
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="t-meta" style={{ color: meta.to }}>{meta.short}</span>
            <span className="t-num text-[13px] font-[600] text-frost">{formatDateShort(e.date)}</span>
          </div>
          <h3 className="t-h2 mt-3 text-[clamp(21px,1.7vw,26px)] text-frost" style={{ viewTransitionName: `title-${e.slug}` }}>{e.title}</h3>
          <ul className="mt-4 space-y-1.5 text-[14px] text-mute-hi">
            {e.time && <li className="flex items-center gap-2"><Clock size={14} aria-hidden className="opacity-70" />{e.time}</li>}
            {e.location && <li className="flex items-center gap-2"><MapPin size={14} aria-hidden className="opacity-70" />{e.location}</li>}
            {e.speaker && <li className="flex items-center gap-2"><Mic2 size={14} aria-hidden className="opacity-70" />{e.speaker}</li>}
          </ul>
          {e.tags.length > 0 && (
            <p className="mt-4 text-[12.5px] text-mute">{e.tags.map((t) => `#${t}`).join('  ')}</p>
          )}
          <div className="mt-auto pt-6"><SeatLine e={e} /></div>
        </div>
      </Link>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6"><RegisterButton e={e} full /></div>
    </article>
  )
}

/** The quiet version for lists: a text link, not a button shouting at you. */
export function RegisterLink({ e }: { e: TSEvent }) {
  const reg = useLocalReg(e.id)
  const s = seatState(e)
  if (reg) return <span className="text-[14.5px] text-mute-hi">{reg.status === 'Waitlisted' ? 'You’re on the waitlist' : 'You’re registered'}</span>
  if (!s.canRegister) return null
  if (e.registrationMode === 'external') {
    return <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className="link-u text-[14.5px] font-[500]">Register <span aria-hidden>↗</span><span className="sr-only"> (opens in a new tab)</span></a>
  }
  return (
    <button type="button" onClick={(ev) => { ev.preventDefault(); openRegister(e) }} className="link-u text-[14.5px] font-[500]">
      {s.tone === 'waitlist' ? 'Join the waitlist' : 'Register'} <span aria-hidden>→</span>
    </button>
  )
}
