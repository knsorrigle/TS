import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)
gsap.defaults({ ease: 'expo.out', duration: 1.1 })

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

let lenis: Lenis | null = null
let tick: ((t: number) => void) | null = null

/** One RAF for everything: Lenis is advanced by GSAP's ticker, and ScrollTrigger listens to Lenis. */
export function startSmoothScroll() {
  if (lenis || reducedMotion()) return lenis
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    autoRaf: false,
    anchors: false,
  })
  lenis.on('scroll', ScrollTrigger.update)
  tick = (t) => lenis?.raf(t * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function stopSmoothScroll() {
  if (tick) gsap.ticker.remove(tick)
  lenis?.destroy()
  lenis = null
  tick = null
}

export const getLenis = () => lenis

/** Child effects run before the layout starts Lenis, so wait for it. Returns a canceller. */
export function whenLenis(cb: (l: Lenis) => void | (() => void)) {
  let cleanup: void | (() => void)
  let alive = true
  const tryIt = () => {
    if (!alive) return
    if (lenis) cleanup = cb(lenis)
    else if (!reducedMotion()) setTimeout(tryIt, 50)
  }
  tryIt()
  return () => { alive = false; cleanup?.() }
}

/** Scroll to an element/id, honouring Lenis when active and the fixed nav height. */
export function scrollToTarget(target: string | HTMLElement, opts: { offset?: number; immediate?: boolean } = {}) {
  const el = typeof target === 'string' ? document.getElementById(target.replace(/^#/, '')) : target
  if (!el) return
  const offset = opts.offset ?? 0
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.6, immediate: opts.immediate })
  else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset
    window.scrollTo({ top: y, behavior: reducedMotion() || opts.immediate ? 'auto' : 'smooth' })
  }
}

export function lockScroll(locked: boolean) {
  if (lenis) locked ? lenis.stop() : lenis.start()
  document.documentElement.style.overflow = locked ? 'hidden' : ''
  if (!locked) requestRefresh() // the scrollbar came back: layout width changed
}

/**
 * Keep every ScrollTrigger honest. Positions are measured once at creation; on a first visit the page keeps
 * changing height afterwards (web fonts swap in, Supabase sections arrive, the intro unlocks scrolling),
 * which leaves reveals and the lit words waiting at the wrong scroll positions. Re-measure, debounced,
 * whenever the document actually changes size, and once fonts and the window have finished loading.
 */
let refreshTimer = 0
export function requestRefresh(delay = 120) {
  if (typeof window === 'undefined') return
  clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), delay)
}

export function watchLayoutChanges() {
  if (typeof window === 'undefined') return () => {}
  let lastH = document.documentElement.scrollHeight
  let lastW = document.documentElement.clientWidth
  const ro = new ResizeObserver(() => {
    const h = document.documentElement.scrollHeight
    const w = document.documentElement.clientWidth
    // ignore sub-pixel jitter and the changes ScrollTrigger's own pin spacers make during a refresh
    if (Math.abs(h - lastH) < 4 && w === lastW) return
    lastH = h; lastW = w
    requestRefresh(180)
  })
  ro.observe(document.body)
  const onLoad = () => requestRefresh(0)
  addEventListener('load', onLoad)
  document.fonts?.ready.then(() => requestRefresh(0)).catch(() => {})
  document.fonts?.addEventListener?.('loadingdone', onLoad)
  return () => { ro.disconnect(); removeEventListener('load', onLoad); document.fonts?.removeEventListener?.('loadingdone', onLoad); clearTimeout(refreshTimer) }
}

export { gsap, ScrollTrigger }
