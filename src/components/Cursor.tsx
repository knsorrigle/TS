import { useEffect, useRef, useState } from 'react'
import { finePointer, gsap } from '../lib/motion'

/**
 * A small point of light. Over [data-cursor="LABEL"] it grows into a ring that names the action.
 * Over inputs it disappears (native text caret takes over). Fine pointers only.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const [enabled] = useState(() => finePointer())
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('has-cursor')
    const d = dot.current!, r = ring.current!
    gsap.set([d, r], { xPercent: -50, yPercent: -50, x: innerWidth / 2, y: innerHeight / 2, autoAlpha: 0 })
    const dx = gsap.quickTo(d, 'x', { duration: 0.12, ease: 'power3.out' })
    const dy = gsap.quickTo(d, 'y', { duration: 0.12, ease: 'power3.out' })
    const rx = gsap.quickTo(r, 'x', { duration: 0.55, ease: 'power4.out' })
    const ry = gsap.quickTo(r, 'y', { duration: 0.55, ease: 'power4.out' })
    let mode: 'idle' | 'label' | 'link' | 'hidden' = 'idle'
    let shown = false

    const setMode = (m: typeof mode, text = '') => {
      if (m === mode && text === label) return
      mode = m
      setLabel(text)
      gsap.to(r, {
        scale: m === 'label' ? 1 : m === 'link' ? 0.62 : 0.28,
        autoAlpha: m === 'hidden' ? 0 : 1,
        duration: 0.6, ease: 'expo.out', overwrite: 'auto',
      })
      gsap.to(d, { autoAlpha: m === 'hidden' ? 0 : m === 'label' ? 0 : 1, scale: m === 'link' ? 0.5 : 1, duration: 0.3, overwrite: 'auto' })
    }

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (!shown) { shown = true; gsap.set([d, r], { x: e.clientX, y: e.clientY }); setMode('idle') }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY)
      const t = e.target as Element | null
      if (!t || !t.closest) return
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return setMode('hidden')
      const c = t.closest<HTMLElement>('[data-cursor]')
      if (c) return setMode('label', c.dataset.cursor ?? '')
      if (t.closest('a, button, [role="button"], label, summary')) return setMode('link')
      setMode('idle')
    }
    const leave = () => { shown = false; gsap.to([d, r], { autoAlpha: 0, duration: 0.3 }) ; mode = 'hidden' }
    const down = () => gsap.to(r, { scale: '-=0.08', duration: 0.2 })
    const up = () => setMode(mode === 'hidden' ? 'hidden' : mode, label)

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      root.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div
        ref={ring}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[200] grid h-[76px] w-[76px] place-items-center rounded-full border border-frost/40 backdrop-blur-[2px]"
        style={{ background: 'radial-gradient(circle, rgb(26 159 232 / 0.22), rgb(26 159 232 / 0.04) 60%, transparent 72%)' }}
      >
        <span className="font-mono text-[9.5px] tracking-[0.3em] text-frost">{label}</span>
      </div>
      <div
        ref={dot}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[201] h-[7px] w-[7px] rounded-full bg-frost"
        style={{ boxShadow: '0 0 12px 2px rgb(26 159 232 / 0.85), 0 0 2px #fff' }}
      />
    </>
  )
}
