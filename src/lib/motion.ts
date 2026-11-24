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
}

export { gsap, ScrollTrigger }
