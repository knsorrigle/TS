import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { fetchEvents, type TSEvent } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { eventStart, formatCountdown, formatDateShort } from '../lib/time'
import { Magnetic } from './Magnetic'

export function useNextEvent(): TSEvent | null {
  const events = useAsync('events', fetchEvents)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return useMemo(() => {
    if (events.status !== 'success') return null
    return (
      events.data
        .map((e) => ({ e, at: eventStart(e.date, e.time)?.getTime() ?? NaN }))
        .filter(({ e, at }) => at > now && !/closed|cancel/i.test(e.status))
        .sort((a, b) => a.at - b.at)[0]?.e ?? null
    )
  }, [events.status, events.data, now])
}

export function useCountdown(target: Date | null) {
  const [ms, setMs] = useState(() => (target ? target.getTime() - Date.now() : 0))
  useEffect(() => {
    if (!target) return
    const tick = () => setMs(target.getTime() - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return ms
}

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
      <p className="t-meta">NEXT <span className="sep" /> {formatDateShort(ev.date)}{ev.time ? ` · ${ev.time.toUpperCase()}` : ''}</p>
      <p className="mt-3 font-display text-[15px] font-light uppercase leading-snug tracking-[0.12em] text-frost [text-wrap:balance]">
        {ev.title}
      </p>
      <p className="mt-3 font-mono text-[12px] tabular-nums tracking-[0.2em] text-spark" aria-live="off">
        {formatCountdown(ms)}
      </p>
      <div className="mt-4 flex justify-end">
        <Magnetic>
          <Link to={`/events/${ev.slug}`} viewTransition className="pill pill--sm" data-cursor="RSVP">
            RSVP <span aria-hidden>→</span>
          </Link>
        </Magnetic>
      </div>
    </aside>
  )
}
