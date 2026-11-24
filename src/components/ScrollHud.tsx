import { useEffect, useState } from 'react'

const IDS = ['top', 'about', 'events', 'activities', 'announcements', 'archive']

/** Section counter in the right gutter:  02 / 06 */
export function ScrollHud() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const els = IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setI(IDS.indexOf((e.target as HTMLElement).id)) })
    }, { rootMargin: '-50% 0px -50% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return (
    <div aria-hidden className={`pointer-events-none fixed right-[calc(var(--gutter)*0.5)] top-1/2 z-[60] hidden -translate-y-1/2 flex-col items-center gap-3 transition-opacity duration-700 xl:flex ${i === 0 ? 'opacity-0' : 'opacity-100'}`}>
      <span className="t-num text-[11px] font-[650] text-frost [writing-mode:vertical-rl]">{String(i + 1).padStart(2, '0')}</span>
      <span className="relative h-16 w-px bg-line"><span className="absolute inset-x-0 top-0 bg-spark transition-[height] duration-700 ease-[var(--ease-expo)]" style={{ height: `${((i + 1) / IDS.length) * 100}%` }} /></span>
      <span className="t-num text-[11px] font-[650] text-mute [writing-mode:vertical-rl]">06</span>
    </div>
  )
}
