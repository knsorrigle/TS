import { useEffect, useRef } from 'react'

/** Hairline of light across the very top that fills with page progress. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight
        const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
        if (bar.current) bar.current.style.transform = `scaleX(${p})`
      })
    }
    on()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [])
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-px">
      <div ref={bar} className="h-full origin-left bg-gradient-to-r from-cobalt via-spark to-frost shadow-[0_0_8px_rgb(26_159_232/0.9)]" style={{ transform: 'scaleX(0)' }} />
    </div>
  )
}
