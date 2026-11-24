import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'

const SparkStage = lazy(() => import('../three/SparkStage'))

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

/** If three.js or the GPU fails, quietly show the still crystal instead of breaking the page. */
class Guard extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

const Still = () => (
  <img aria-hidden src="/spark-still.png" alt="" className="pointer-events-none fixed left-1/2 top-[44%] z-30 w-[min(22vw,180px)] -translate-x-1/2 -translate-y-1/2 opacity-90" />
)

/** One persistent crystal across routes; loaded after first paint so it never blocks the hero. */
export function SparkLayer() {
  const { pathname } = useLocation()
  const [ready, setReady] = useState(false)
  const [gl] = useState(hasWebGL)
  useEffect(() => {
    // after the page has loaded and the main thread is idle: never competes with the hero's first paint
    let id = 0
    const go = () => setReady(true)
    const schedule = () => { id = 'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1200 }) : (setTimeout(go, 300) as unknown as number) }
    if (document.readyState === 'complete') schedule()
    else addEventListener('load', schedule, { once: true })
    return () => { removeEventListener('load', schedule); 'cancelIdleCallback' in window ? cancelIdleCallback(id) : clearTimeout(id) }
  }, [])
  if (pathname.startsWith('/admin')) return null
  if (!gl) return pathname === '/' ? <Still /> : null
  if (!ready) return null
  return (
    <Guard fallback={pathname === '/' ? <Still /> : null}>
      <Suspense fallback={null}><SparkStage /></Suspense>
    </Guard>
  )
}
