import { useEffect, useMemo, useState } from 'react'
import { useNextEvent, useCountdown } from '../lib/useEvents'
import { eventStart, formatCountdown } from '../lib/time'
import { openRegister, useRegisterTarget } from '../lib/registerStore'
import { useLocalReg } from '../lib/useLocalReg'
import { seatState } from '../lib/status'

/** Phones: the next event, a live countdown and one-tap register, docked to the bottom once past the hero. */
export function MobileRegisterBar() {
  const ev = useNextEvent()
  const start = useMemo(() => (ev ? eventStart(ev.date, ev.time) : null), [ev])
  const ms = useCountdown(start)
  const reg = useLocalReg(ev?.id)
  const modalOpen = !!useRegisterTarget()
  const [show, setShow] = useState(false)

  useEffect(() => {
    let eventsVisible = false, pastHero = false
    const update = () => setShow(pastHero && !eventsVisible)
    const events = document.getElementById('events')
    const io = events ? new IntersectionObserver(([e]) => { eventsVisible = e.isIntersecting; update() }) : null
    if (events) io!.observe(events)
    const onScroll = () => { pastHero = scrollY > innerHeight * 1.2; update() }
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => { removeEventListener('scroll', onScroll); io?.disconnect() }
  }, [])

  if (!ev || reg || !seatState(ev).canRegister) return null
  const visible = show && !modalOpen
  return (
    <div
      className={`fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[90] transition-[transform,opacity] duration-700 ease-[var(--ease-expo)] md:hidden ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[140%] opacity-0'}`}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3 rounded-full border border-line-strong bg-ink-2/90 py-2 pl-5 pr-2 shadow-[0_20px_60px_-10px_rgb(0_0_0/0.9)] backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-[560] text-frost">{ev.title}</p>
          <p className="t-num text-[11.5px] font-[600] text-spark">{ms > 0 ? `in ${formatCountdown(ms)}` : 'Starting now'}</p>
        </div>
        <button type="button" tabIndex={visible ? 0 : -1} onClick={() => openRegister(ev)} className="pill pill--spark pill--sm !h-11 shrink-0">Register</button>
      </div>
    </div>
  )
}
