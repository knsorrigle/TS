import { useEffect, useRef, useState } from 'react'
import { createGradient, type GradientGL } from '../gl/createGradient'
import { reducedMotion } from '../lib/motion'

const FALLBACK = [
  'radial-gradient(60% 50% at 50% 50%, #1A9FE8, #0057FF 55%, #03060D 100%)',
  'radial-gradient(60% 50% at 45% 55%, #2CF0D2, #00A7E1 45%, #03060D 100%)',
  'radial-gradient(60% 50% at 50% 35%, #FFC46B, #FF5A3C 50%, #2a0a08 100%)',
  'linear-gradient(0deg, #E8F1FF 0%, #1A9FE8 30%, #0057FF 55%, #03060D 100%)',
]

/** Lazily-created WebGL gradient. Mounts its context only near the viewport and pauses off-screen. */
export function GradientCanvas({ mode, active = 1, pillar = false, className = '' }: { mode: 0 | 1 | 2 | 3; active?: number; pillar?: boolean; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const gl = useRef<GradientGL | null>(null)
  const activeRef = useRef(active)
  const [failed, setFailed] = useState(false)
  activeRef.current = active

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    let created = false
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !created) {
        created = true
        try {
          gl.current = createGradient(canvas.current!, { mode, pillar, reduced: reducedMotion(), active: activeRef.current })
        } catch { setFailed(true); return }
      }
      gl.current?.setVisible(e.isIntersecting)
    }, { rootMargin: '200px 0px' })
    io.observe(el)
    return () => { io.disconnect(); gl.current?.destroy(); gl.current = null }
  }, [mode, pillar])

  useEffect(() => { gl.current?.setActive(active) }, [active])

  return (
    <div ref={wrap} aria-hidden className={`absolute inset-0 overflow-hidden ${className}`}>
      {failed
        ? <div className="absolute inset-0" style={{ background: FALLBACK[mode], opacity: 0.35 + active * 0.65 }} />
        : <canvas ref={canvas} className="absolute inset-0 h-full w-full" />}
    </div>
  )
}
