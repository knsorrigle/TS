import { useLayoutEffect, useRef } from 'react'
import { Users, RotateCw } from 'lucide-react'
import { fetchPastEvents, type PastEvent } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useReveals } from '../lib/reveal'
import { gsap, getLenis } from '../lib/motion'
import { useDesktop, useReducedMotion } from '../lib/useMedia'
import { CATEGORY_META, categoryKey } from '../lib/site'
import { Duotone } from '../components/Duotone'
import { Skeleton } from '../components/Skeleton'
import { StateCard } from './Events'

export function Archive() {
  const root = useRef<HTMLElement>(null)
  const list = useAsync('past', fetchPastEvents)
  const desktop = useDesktop()
  const reduced = useReducedMotion()
  const pinned = desktop && !reduced && list.status === 'success' && list.data.length > 2
  useReveals(root, [list.status])

  return (
    <section ref={root} id="archive" aria-labelledby="archive-title" data-spark="-0.42 0.12 0.55 2.0" className="relative bg-void">
      <div className="mx-auto max-w-[1440px] px-[var(--gutter)] pt-[var(--section-pad)]">
        <h2 id="archive-title" className="t-h1 above-spark text-[clamp(72px,12vw,200px)]" data-reveal="lines">Archive</h2>
        <p className="t-body above-spark mt-4 max-w-[52ch]" data-reveal="lines" data-delay="0.1">Past events & achievements — student collaboration sessions held across previous campus semesters.</p>
      </div>

      <div className={pinned ? '' : 'px-[var(--gutter)] pb-[var(--section-pad)] pt-12'}>
        {list.status === 'loading' && (
          <div className="mx-auto flex max-w-[1440px] gap-4 overflow-hidden" aria-busy="true" aria-label="Loading archive">
            {[0, 1, 2].map((i) => <div key={i} className="w-[min(78vw,420px)] shrink-0 space-y-3"><Skeleton className="aspect-[4/5]" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>)}
          </div>
        )}
        {list.status === 'error' && (
          <div className="mx-auto max-w-[1440px]"><StateCard title="Unable to load the archive right now." body="Please check back soon." action={<button type="button" onClick={list.reload} className="pill pill--sm"><RotateCw size={13} /> Try again</button>} /></div>
        )}
        {list.status === 'success' && list.data.length === 0 && (
          <div className="mx-auto max-w-[1440px]"><StateCard title="Event outcomes will be published upon conclusion of campus rounds." body="Photos, results and highlights from every session land here." /></div>
        )}
        {list.status === 'success' && list.data.length > 0 && (pinned ? <PinnedStrip items={list.data} /> : <SnapStrip items={list.data} />)}
      </div>
    </section>
  )
}

function Frame({ p, i }: { p: PastEvent; i: number }) {
  const meta = CATEGORY_META[categoryKey(p.category)]
  const d = p.date ? new Date(`${p.date}T00:00:00`) : null
  const edge = `TS_06 · ${String(i + 1).padStart(4, '0')} · ${d ? d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase() : '—'}`
  return (
    <article className="above-spark group relative flex w-[min(80vw,440px)] shrink-0 snap-start flex-col">
      <p className="t-meta mb-3 flex justify-between"><span>{edge}</span><span style={{ color: meta.to }}>{meta.short}</span></p>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
        <Duotone src={p.image} alt={p.title} category={p.category} className="absolute inset-0" />
        {p.participants > 0 && (
          <span className="t-num absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-void/65 px-3 py-1.5 text-[12px] font-[600] text-frost backdrop-blur">
            <Users size={13} aria-hidden /> {p.participants} participants
          </span>
        )}
      </div>
      <h3 className="t-h1 mt-5 text-[clamp(30px,2.6vw,40px)]">{p.title}</h3>
      <p className="t-body mt-2">{p.description}</p>
      {p.highlight && <p className="mt-3 text-[14.5px] font-[560] text-spark">★ {p.highlight}</p>}
    </article>
  )
}

/** Desktop: the strip is pinned and scrubbed sideways by vertical scroll. Dragging also moves it. */
function PinnedStrip({ items }: { items: PastEvent[] }) {
  const stage = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const dist = () => Math.max(0, track.current!.scrollWidth - innerWidth)
      gsap.to(track.current, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: { trigger: stage.current, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.7, invalidateOnRefresh: true },
      })
    }, stage)
    return () => ctx.revert()
  }, [items.length])

  // drag → convert horizontal drag distance into vertical scroll
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    let startX = 0, startY = 0, dragging = false
    const down = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; dragging = true; startX = e.clientX; startY = scrollY; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing' }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const target = startY - (e.clientX - startX) * 1.4
      const l = getLenis()
      if (l) l.scrollTo(target, { immediate: true })
      else scrollTo(0, target)
    }
    const up = () => { dragging = false; el.style.cursor = '' }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up) }
  }, [])

  return (
    <div ref={stage} className="relative flex h-[100svh] select-none items-center overflow-hidden" data-cursor="DRAG">
      <div ref={track} className="flex gap-[clamp(20px,3vw,48px)] px-[var(--gutter)] pt-[var(--nav-h)] will-change-transform">
        {items.map((p, i) => <Frame key={p.id} p={p} i={i} />)}
        <div className="flex w-[30vw] shrink-0 items-center">
          <p className="t-meta">End of reel <span className="sep" /> {items.length} sessions</p>
        </div>
      </div>
    </div>
  )
}

function SnapStrip({ items }: { items: PastEvent[] }) {
  return (
    <div className="no-scrollbar -mx-[var(--gutter)] flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-[var(--gutter)] px-[var(--gutter)] pb-2" tabIndex={0} aria-label="Past events, scroll sideways">
      {items.map((p, i) => <Frame key={p.id} p={p} i={i} />)}
    </div>
  )
}
