import { useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search, X, RotateCw } from 'lucide-react'
import { fetchEvents, isDemo, type TSEvent } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useReveals } from '../lib/reveal'
import { CATEGORY_META, categoryKey, type CategoryKey } from '../lib/site'
import { eventStart, formatDateShort } from '../lib/time'
import { isUpcoming, seatState } from '../lib/status'
import { leanSpark } from '../three/sparkState'
import { RegisterButton, Soon } from '../components/EventCard'
import { Duotone } from '../components/Duotone'
import { Skeleton } from '../components/Skeleton'

const FILTERS: { key: 'all' | CategoryKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'technical', label: 'Technical' },
  { key: 'non-technical', label: 'Non-Technical' },
  { key: 'fun', label: 'Fun & Social' },
]

function sortEvents(list: TSEvent[]) {
  const t = (e: TSEvent) => eventStart(e.date, e.time)?.getTime() ?? Infinity
  const up = list.filter((e) => isUpcoming(e)).sort((a, b) => Number(b.featured) - Number(a.featured) || t(a) - t(b))
  const past = list.filter((e) => !isUpcoming(e)).sort((a, b) => t(b) - t(a))
  return [...up, ...past]
}

export function Events() {
  const root = useRef<HTMLElement>(null)
  const events = useAsync('events', fetchEvents)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const cat = (params.get('cat') ?? 'all') as 'all' | CategoryKey

  const set = (k: 'q' | 'cat', v: string) => {
    const next = new URLSearchParams(params)
    if (!v || v === 'all') next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const sorted = useMemo(() => (events.status === 'success' ? sortEvents(events.data) : []), [events.status, events.data])
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return sorted.filter((e) => {
      if (cat !== 'all' && categoryKey(e.category) !== cat) return false
      if (!needle) return true
      return [e.title, e.description, e.location, e.speaker, e.category, ...e.tags].join(' ').toLowerCase().includes(needle)
    })
  }, [sorted, q, cat])

  useReveals(root, [events.status, filtered.length, cat])

  return (
    <section ref={root} id="events" aria-labelledby="events-title" data-spark="-0.4 0.05 0.65 1.3" className="relative bg-void px-[var(--gutter)] py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 id="events-title" className="t-h1 above-spark text-[clamp(72px,13vw,220px)]" data-reveal="lines">Events</h2>
          <p className="t-meta pb-4" aria-live="polite">
            {isDemo && <span className="mr-3 text-amber">Demo data · dev only</span>}
            {events.status === 'success'
              ? <>Showing <span className="text-white">{filtered.length}</span> published campus session{filtered.length === 1 ? '' : 's'}</>
              : events.status === 'loading' ? 'Loading sessions…' : ''}
          </p>
        </div>

        {/* controls: filter pills + living search */}
        <div className="above-spark mt-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="radiogroup" aria-label="Filter by category" className="no-scrollbar -mx-[var(--gutter)] flex gap-1.5 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:px-0">
            {FILTERS.map((f) => {
              const on = cat === f.key
              const meta = f.key === 'all' ? null : CATEGORY_META[f.key]
              return (
                <button key={f.key} type="button" role="radio" aria-checked={on} onClick={() => set('cat', f.key)} className={`nav-pill shrink-0 !h-10 !px-4 ${on ? 'is-active' : ''}`}>
                  {meta && <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 rounded-full" style={{ background: meta.to, boxShadow: `0 0 8px ${meta.to}` }} />}
                  {f.label}
                </button>
              )
            })}
          </div>
          <label className={`living flex h-11 w-full items-center gap-3 pl-4 pr-1.5 lg:max-w-[380px] ${q ? 'is-live' : ''}`}>
            <Search size={16} className="shrink-0 text-mute-hi" aria-hidden />
            <span className="sr-only">Search events</span>
            <input type="search" value={q} onChange={(e) => set('q', e.target.value)} placeholder="Search events, venues, speakers"
              className="h-full w-full bg-transparent text-[15px] text-white caret-spark outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden" />
            {q && <button type="button" onClick={() => set('q', '')} aria-label="Clear search" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute-hi hover:bg-white/10 hover:text-white"><X size={14} /></button>}
          </label>
        </div>

        <div className="mt-[clamp(48px,8vh,96px)]">
          {events.status === 'loading' && <LoadingState />}
          {events.status === 'error' && (
            <StateCard title="Unable to load upcoming campus sessions at this time." body="Please check back soon or contact the club leads."
              action={<button type="button" onClick={events.reload} className="pill pill--sm"><RotateCw size={13} /> Try again</button>} />
          )}
          {events.status === 'success' && sorted.length === 0 && (
            <StateCard title="No events live right now." body="Something’s sparking — check back soon." spark />
          )}
          {events.status === 'success' && sorted.length > 0 && filtered.length === 0 && (
            <StateCard title="Nothing matches that." body={`No sessions for “${q || FILTERS.find((f) => f.key === cat)?.label}”. Try another word or category.`}
              action={<button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true, preventScrollReset: true })} className="pill pill--sm">Clear filters</button>} />
          )}
          {events.status === 'success' && filtered.length > 0 && (
            <ol className="mx-auto flex max-w-[1080px] flex-col gap-[clamp(72px,12vh,140px)]">
              {filtered.map((e, i) => <Case key={e.id} e={e} first={i === 0 && !q && cat === 'all'} />)}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

/** Redis "case": a big rounded image card, then centred title + one line below. */
function Case({ e, first }: { e: TSEvent; first: boolean }) {
  const meta = CATEGORY_META[categoryKey(e.category)]
  const s = seatState(e)
  const lean = (el: HTMLElement | null) => {
    if (!el) return leanSpark(null)
    const r = el.getBoundingClientRect()
    leanSpark({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }
  return (
    <li className="group" data-reveal="up">
      <Link
        to={`/events/${e.slug}`}
        viewTransition
        data-cursor="VIEW"
        onPointerEnter={(ev) => lean(ev.currentTarget)}
        onPointerLeave={() => lean(null)}
        onFocus={(ev) => lean(ev.currentTarget)}
        onBlur={() => lean(null)}
        className="relative block aspect-[16/10] overflow-hidden rounded-[clamp(20px,2.4vw,36px)] outline-offset-4 sm:aspect-[16/9]"
        aria-label={`${e.title} — details`}
      >
        <Duotone src={e.image} alt={e.title} category={e.category} eager={first} className="absolute inset-0 transition-transform duration-[1400ms] ease-[var(--ease-expo)] group-hover:scale-[1.03]" />
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 sm:left-6 sm:top-6">
          {first && e.featured && <span className="rounded-full bg-white px-3 py-1 text-[11.5px] font-[650] uppercase tracking-[0.06em] text-black">Featured</span>}
          <Soon e={e} />
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-px opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${meta.to}, transparent)` }} />
      </Link>
      <div className="above-spark mt-7 text-center">
        <h3 className="t-h1 mx-auto max-w-[18ch] text-[clamp(34px,4.2vw,64px)]" style={{ viewTransitionName: `title-${e.slug}` }}>
          <Link to={`/events/${e.slug}`} viewTransition className="transition-opacity hover:opacity-80">{e.title}</Link>
        </h3>
        <p className="t-num mx-auto mt-3 max-w-[70ch] text-[14.5px] text-mute-hi">
          {[formatDateShort(e.date), e.time, e.location, meta.short].filter(Boolean).join(' · ')}
          <span className="mx-2 text-white/25">·</span>
          <span className={`whitespace-nowrap ${s.tone === 'low' || s.tone === 'waitlist' ? 'text-amber' : s.tone === 'open' ? 'text-white' : ''}`}>{s.label}</span>
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <RegisterButton e={e} />
          <Link to={`/events/${e.slug}`} viewTransition className="pill pill--sm">Details</Link>
        </div>
      </div>
    </li>
  )
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Loading events" className="mx-auto flex max-w-[1080px] flex-col gap-24">
      {[0, 1].map((i) => (
        <div key={i}>
          <Skeleton className="aspect-[16/9] !rounded-[32px]" />
          <div className="mt-7 flex flex-col items-center gap-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
        </div>
      ))}
    </div>
  )
}

export function StateCard({ title, body, action, spark }: { title: string; body: string; action?: React.ReactNode; spark?: boolean }) {
  return (
    <div className="above-spark relative mx-auto grid min-h-[320px] max-w-[1080px] place-items-center overflow-hidden rounded-[32px] border border-white/12 bg-ink px-6 py-16 text-center">
      <div aria-hidden className="absolute left-1/2 top-[38%] h-40 w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cobalt/10 blur-3xl" />
      <div className="relative">
        <span aria-hidden className={`mx-auto mb-8 block h-1.5 w-1.5 rounded-full bg-white ${spark ? 'animate-pulse shadow-[0_0_20px_5px_rgb(26_159_232/0.8)]' : 'opacity-40 shadow-[0_0_14px_3px_rgb(26_159_232/0.25)]'}`} />
        <p className="t-h1 mx-auto max-w-[22ch] text-[clamp(30px,3.2vw,46px)]">{title}</p>
        <p className="t-body mx-auto mt-3 max-w-[44ch]">{body}</p>
        {action && <div className="mt-8 flex justify-center">{action}</div>}
      </div>
    </div>
  )
}
