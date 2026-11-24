import { useMemo } from 'react'
import { Link } from 'react-router'
import { useCountdown, useNextEvent } from '../lib/useEvents'
import { eventStart, formatCountdown, formatDateShort } from '../lib/time'
export { useCountdown, useNextEvent }
import { Magnetic } from './Magnetic'
import { RegisterButton } from './EventCard'

/** Top-right title-card block in the hero. Renders nothing when there's no upcoming event. */
export function NextEventSpotlight() {
  const ev = useNextEvent()
  const start = useMemo(() => (ev ? eventStart(ev.date, ev.time) : null), [ev])
  const ms = useCountdown(start)
  if (!ev || !start) return null

  return (
    <aside
      aria-label="Next event"
      className="absolute right-[var(--gutter)] top-[calc(var(--nav-h)+28px)] hidden w-[280px] text-right md:block"
    >
      <p className="t-meta">Next up <span className="sep" /> {formatDateShort(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</p>
      <Link to={`/events/${ev.slug}`} viewTransition className="t-h2 mt-2.5 block text-[19px] text-frost transition-colors [text-wrap:balance] hover:text-white" data-cursor="VIEW">
        {ev.title}
      </Link>
      <p className="t-num mt-2.5 text-[13px] font-[600] tracking-[0.04em] text-spark" aria-live="off">
        {formatCountdown(ms)}
      </p>
      <div className="mt-4 flex justify-end">
        <Magnetic><span className="inline-flex"><RegisterButton e={ev} /></span></Magnetic>
      </div>
    </aside>
  )
}
