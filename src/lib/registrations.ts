/** Remembers this device's registrations so cards can say "You're registered". */
export interface LocalReg { status: 'Confirmed' | 'Waitlisted'; at: number; name: string }
const KEY = 'ts_registrations'
const EVT = 'ts_registrations_changed'

function read(): Record<string, LocalReg> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
export function getLocalReg(eventId: string): LocalReg | null { return read()[eventId] ?? null }
export function setLocalReg(eventId: string, reg: LocalReg) {
  const all = read()
  all[eventId] = reg
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* storage full / private */ }
  window.dispatchEvent(new CustomEvent(EVT))
}
export function onLocalRegChange(fn: () => void) {
  window.addEventListener(EVT, fn)
  window.addEventListener('storage', fn)
  return () => { window.removeEventListener(EVT, fn); window.removeEventListener('storage', fn) }
}
