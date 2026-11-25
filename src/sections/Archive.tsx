import { useLayoutEffect, useRef, useState } from 'react'
import { Users, RotateCw } from 'lucide-react'
import { fetchPastEvents, type PastEvent } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useReveals } from '../lib/reveal'
import { useContent } from '../lib/content'
import { gsap, getLenis } from '../lib/motion'
import { useDesktop, useReducedMotion } from '../lib/useMedia'
import { CATEGORY_META, categoryKey } from '../lib/site'
import { Duotone } from '../components/Duotone'
import { Lightbox } from '../components/Gallery'
import { countLabel, isVideo } from '../lib/media'
import { Skeleton } from '../components/Skeleton'
import { StateCard } from './Events'

export function Archive() {
  const c = useContent()
  const root = useRef<HTMLElement>(null)
  const list = useAsync('past', fetchPastEvents)
  const desktop = useDesktop()
  const reduced = useReducedMotion()
  const pinned = desktop && !reduced && list.status === 'success' && list.data.length > 2
  useReveals(root, [list.status])

  return (
    <section ref={root} id="archive" aria-labelledby="archive-title" data-spark="-0.45 0.2 0.4 2.0" className="relative bg-void">
      <div className="mx-auto max-w-[1440px] px-[var(--gutter)] pt-[var(--section-pad)]">
        <h2 id="archive-title" className="t-h1 above-spark text-[clamp(72px,12vw,200px)]" data-reveal="lines">{c.sections.archive}</h2>
        <p className="t-body above-spark mt-4 max-w-[52ch]" data-reveal="lines" data-delay="0.1">{c.sections.archiveSub}</p>
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
  const [view, setView] = useState(false)
  const photos = [p.image, ...p.gallery].filter(Boolean)
  const cover = p.image || p.gallery.find((u) => !isVideo(u)) || ''
  const meta = CATEGORY_META[categoryKey(p.category)]
  const d = p.date ? new Date(`${p.date}T00:00:00`) : null
  const when = d ? d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : ''
  return (
    <article className="above-spark group relative flex w-[min(80vw,440px)] shrink-0 snap-start flex-col">
      <p className="t-meta mb-3 flex justify-between"><span>{when}</span><span>{meta.short}</span></p>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
        <Duotone src={cover} alt={p.title} category={p.category} className="absolute inset-0" blank={<span className="t-serif absolute bottom-5 left-6 text-[clamp(72px,8vw,120px)] leading-none text-white/90">{String(i + 1).padStart(2, '0')}</span>} />
        {photos.length > 0 && (
          <button type="button" onClick={() => setView(true)} className="absolute inset-0 z-[5]" aria-label={`View ${countLabel(photos)} from ${p.title}`} />
        )}
        {photos.length > 1 && <span className="t-num absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1.5 text-[12px] text-white backdrop-blur">{countLabel(photos)}</span>}
        {p.participants > 0 && (
          <span className="t-num absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-void/65 px-3 py-1.5 text-[12px] font-[600] text-frost backdrop-blur">
            <Users size={13} aria-hidden /> {p.participants} participants
          </span>
        )}
      </div>
      <h3 className="t-h1 mt-5 text-[clamp(30px,2.6vw,40px)]">{p.title}</h3>
      <p className="t-body mt-2">{p.description}</p>
      {p.highlight && <p className="mt-3 text-[14.5px] text-spark">{p.highlight}</p>}
      {p.linkUrl && <a href={p.linkUrl} target="_blank" rel="noopener noreferrer" className="link-u mt-3 self-start text-[14px]">Results & photos <span aria-hidden>↗</span></a>}
      {view && <Lightbox images={photos} start={0} title={p.title} onClose={() => setView(false)} />}
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
    // a press only becomes a drag after ~6px of movement, so taps and clicks on frames still work
    let startX = 0, startY = 0, down = false, dragging = false, justDragged = false
    const onDown = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; dragging = false; startX = e.clientX; startY = scrollY }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      if (!dragging) {
        if (Math.abs(e.clientX - startX) < 6) return
        dragging = true
        el.setPointerCapture(e.pointerId)
        el.style.cursor = 'grabbing'
      }
      const target = startY - (e.clientX - startX) * 1.4
      const l = getLenis()
      if (l) l.scrollTo(target, { immediate: true })
      else scrollTo(0, target)
    }
    const onUp = () => { if (dragging) { justDragged = true; setTimeout(() => { justDragged = false }, 0) } down = false; dragging = false; el.style.cursor = '' }
    const onClick = (e: MouseEvent) => { if (justDragged) { e.preventDefault(); e.stopPropagation() } }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('click', onClick, true)
    return () => {
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('click', onClick, true)
    }
  }, [])

  return (
    <div ref={stage} className="relative flex h-[100svh] select-none items-center overflow-hidden">
      <div ref={track} className="flex gap-[clamp(20px,3vw,48px)] px-[var(--gutter)] pt-[var(--nav-h)] will-change-transform">
        {items.map((p, i) => <Frame key={p.id} p={p} i={i} />)}
        <div className="flex w-[30vw] shrink-0 items-center">
          <p className="t-meta">{items.length} sessions so far</p>
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
