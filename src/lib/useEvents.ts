import { useEffect, useMemo, useState } from 'react'
import { fetchEvents, type TSEvent } from './api'
import { useAsync } from './useAsync'
import { eventStart } from './time'

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

