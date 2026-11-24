/** Tiny pub/sub for "the spark has ignited" so nav/hero chrome can reveal in sync with the shader. */
type Fn = () => void
let done = false
const subs = new Set<Fn>()

export const IGNITED_KEY = 'ts_ignited'
export const hasIgnitedThisSession = () => {
  try { return sessionStorage.getItem(IGNITED_KEY) === '1' } catch { return false }
}
export function markIntroDone() {
  if (done) return
  done = true
  try { sessionStorage.setItem(IGNITED_KEY, '1') } catch { /* private mode */ }
  subs.forEach((f) => f())
  subs.clear()
}
export function onIntroDone(f: Fn) {
  if (done) { f(); return () => {} }
  subs.add(f)
  return () => { subs.delete(f) }
}
export const isIntroDone = () => done
