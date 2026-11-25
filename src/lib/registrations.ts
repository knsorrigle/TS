import { checkRegistration } from './api'

/**
 * Remembers this device's registrations so cards can say "You're registered".
 * `id` is the private receipt the server hands back; with it the device re-checks the database,
 * so a registration an admin removes turns back into a Register button.
 */
export interface LocalReg { status: 'Confirmed' | 'Waitlisted'; at: number; name: string; id?: string }
const KEY = 'ts_registrations'
const EVT = 'ts_registrations_changed'

function read(): Record<string, LocalReg> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function write(all: Record<string, LocalReg>) {
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* storage full / private */ }
  window.dispatchEvent(new CustomEvent(EVT))
}
export function getLocalReg(eventId: string): LocalReg | null { return read()[eventId] ?? null }
export function setLocalReg(eventId: string, reg: LocalReg) {
  write({ ...read(), [eventId]: reg })
}
export function removeLocalReg(eventId: string) {
  const all = read()
  if (!(eventId in all)) return
  delete all[eventId]
  write(all)
}
export function onLocalRegChange(fn: () => void) {
  window.addEventListener(EVT, fn)
  window.addEventListener('storage', fn)
  return () => { window.removeEventListener(EVT, fn); window.removeEventListener('storage', fn) }
}

/* ───────── keep the device in step with the database ───────── */
const NIL = '00000000-0000-0000-0000-000000000000'
let running: Promise<void> | null = null
let lastRun = 0

/**
 * Asks the database about every registration this device remembers.
 * Removed by an admin → forgotten (the Register button returns). Status changed → updated.
 * Can't reach the server → left alone. Old entries saved before receipts existed can't be checked,
 * so they're cleared once the server can answer.
 */
export function syncLocalRegs(force = false): Promise<void> {
  if (running) return running
  if (!force && Date.now() - lastRun < 15_000) return Promise.resolve()
  const entries = Object.entries(read())
  if (!entries.length) return Promise.resolve()
  lastRun = Date.now()
  running = (async () => {
    const results = await Promise.all(entries.map(async ([eventId, reg]) => [eventId, await checkRegistration(reg.id ?? NIL)] as const))
    const all = read()
    let changed = false
    for (const [eventId, status] of results) {
      const reg = all[eventId]
      if (!reg || status === null) continue
      if (status === 'Removed') { delete all[eventId]; changed = true }
      else if (reg.id && reg.status !== status) { all[eventId] = { ...reg, status }; changed = true }
    }
    if (changed) write(all)
  })().finally(() => { running = null })
  return running
}

let watching = false
/** Check on load, and again whenever the student comes back to the tab. */
export function watchLocalRegs() {
  if (watching) return
  watching = true
  syncLocalRegs(true)
  const again = () => { if (document.visibilityState === 'visible') syncLocalRegs() }
  document.addEventListener('visibilitychange', again)
  window.addEventListener('focus', again)
  window.addEventListener('pageshow', (e) => { if (e.persisted) syncLocalRegs(true) })
}
