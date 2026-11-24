import { useEffect, useRef, type ReactElement, cloneElement } from 'react'
import { finePointer, gsap, reducedMotion } from '../lib/motion'

/** Wrap a single interactive element: it leans ≤ `strength`px toward the pointer and settles back with weight. */
export function Magnetic({ children, strength = 8 }: { children: ReactElement<{ ref?: unknown }>; strength?: number }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !finePointer() || reducedMotion()) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power4.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power4.out' })
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      xTo(dx * strength)
      yTo(dy * strength * 0.6)
    }
    const leave = () => { xTo(0); yTo(0) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
  }, [strength])
  return cloneElement(children, { ref })
}
