import type { TSEvent } from './api'
import { eventStart } from './time'

export type SeatTone = 'open' | 'low' | 'waitlist' | 'full' | 'closed'

/** Plain-words availability, the way a student reads it at 11pm. */
export function seatState(e: TSEvent, now = Date.now()): { label: string; tone: SeatTone; canRegister: boolean } {
  const start = eventStart(e.date, e.time)
  const ended = start ? start.getTime() + 6 * 3600_000 < now : false
  if (/closed|cancel|complete|ended/i.test(e.status) || ended) return { label: 'Closed', tone: 'closed', canRegister: false }
  const deadlinePassed = e.registrationDeadline ? new Date(e.registrationDeadline).getTime() < now : false
  if (e.registrationMode === 'closed' || deadlinePassed) return { label: 'Registrations closed', tone: 'closed', canRegister: false }
  if (e.registrationMode === 'external') return { label: e.registrationUrl ? 'Register via link' : 'Registration opens soon', tone: 'open', canRegister: !!e.registrationUrl }
  if (/^full$/i.test(e.status.trim())) return { label: 'Full', tone: 'full', canRegister: false }
  if (!e.capacity || e.capacity <= 0) return { label: 'Open registration', tone: 'open', canRegister: true }
  const left = e.capacity - e.registeredCount
  if (left <= 0) return { label: 'Waitlist open', tone: 'waitlist', canRegister: true }
  if (left <= Math.max(5, Math.ceil(e.capacity * 0.15))) return { label: `${left} seat${left === 1 ? '' : 's'} left`, tone: 'low', canRegister: true }
  return { label: `${left} seats left`, tone: 'open', canRegister: true }
}

export const fillRatio = (e: TSEvent) => (e.capacity > 0 ? Math.min(1, e.registeredCount / e.capacity) : 0)

export function isUpcoming(e: TSEvent, now = Date.now()) {
  const s = eventStart(e.date, e.time)
  return s ? s.getTime() > now : true
}
