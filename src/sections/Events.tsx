import { useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search, X, RotateCw, MapPin, Clock, Mic2 } from 'lucide-react'
import { fetchEvents, isDemo, type TSEvent } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useReveals } from '../lib/reveal'
import { CATEGORY_META, categoryKey, type CategoryKey } from '../lib/site'
import { eventStart, formatDateShort } from '../lib/time'
import { isUpcoming } from '../lib/status'
import { SectionHead } from '../components/SectionHead'
import { EventCard, RegisterButton, SeatLine, Soon } from '../components/EventCard'
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
  const up = list.filter((e) => isUpcoming(e)).sort((a, b) => t(a) - t(b))
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
  const featured = useMemo(() => sorted.find((e) => e.featured && isUpcoming(e)) ?? sorted.find((e) => isUpcoming(e)) ?? null, [sorted])
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return sorted.filter((e) => {
      if (cat !== 'all' && categoryKey(e.category) !== cat) return false
      if (!needle) return true
      return [e.title, e.description, e.location, e.speaker, e.category, ...e.tags].join(' ').toLowerCase().includes(needle)
    })
  }, [sorted, q, cat])
  const filtering = q.trim() !== '' || cat !== 'all'
  const showFeatured = !filtering && featured
  const grid = showFeatured ? filtered.filter((e) => e.id !== featured!.id) : filtered

  useReveals(root, [events.status, grid.length, cat])

  return (
    <section ref={root} id="events" aria-labelledby="events-title" className="relative bg-void px-[var(--gutter)] py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1440px]">
        <SectionHead index="04" label="Campus schedule" aside={isDemo ? 'Demo data · dev only' : undefined} />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 id="events-title" className="t-h1 text-[clamp(44px,6.4vw,108px)] text-frost" data-reveal="lines">Upcoming events</h2>
          <p className="t-meta pb-2" aria-live="polite">
            {events.status === 'success'
              ? <>Showing <span className="text-frost">{filtered.length}</span> published campus session{filtered.length === 1 ? '' : 's'}</>
              : events.status === 'loading' ? 'Loading sessions…' : '—'}
          </p>
        </div>

        {/* controls */}
        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className={`living flex h-[52px] w-full items-center gap-3 pl-5 pr-2 lg:max-w-[420px] ${q ? 'is-live' : ''}`}>
            <Search size={17} className="shrink-0 text-mute-hi" aria-hidden />
            <span className="sr-only">Search events</span>
            <input
              type="search"
              value={q}
              onChange={(e) => set('q', e.target.value)}
              placeholder="Search events, venues, speakers"
              className="h-full w-full bg-transparent text-[15.5px] text-frost caret-spark outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button type="button" onClick={() => set('q', '')} aria-label="Clear search" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-mute-hi transition-colors hover:bg-white/5 hover:text-frost">
                <X size={15} />
              </button>
            )}
          </label>
          <div role="radiogroup" aria-label="Filter by category" className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:px-0">
            {FILTERS.map((f) => {
              const on = cat === f.key
              const meta = f.key === 'all' ? null : CATEGORY_META[f.key]
              return (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set('cat', f.key)}
                  className={`living h-11 shrink-0 px-5 text-[13.5px] font-[540] transition-colors ${on ? 'is-live text-frost' : 'text-mute-hi hover:text-frost'}`}
                  style={meta ? ({ '--lg-glow': meta.glow, '--lg-glow2': meta.glow } as React.CSSProperties) : undefined}
                >
                  {meta && <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: meta.to, boxShadow: `0 0 8px ${meta.to}` }} />}
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* states */}
        <div className="mt-12">
          {events.status === 'loading' && <LoadingState />}
          {events.status === 'error' && (
            <StateCard
              title="Unable to load upcoming campus sessions at this time."
              body="Please check back soon or contact the club leads."
              action={<button type="button" onClick={events.reload} className="pill pill--sm"><RotateCw size={13} /> Try again</button>}
            />
          )}
          {events.status === 'success' && sorted.length === 0 && (
            <StateCard title="No sessions published yet." body="Something’s sparking — check back soon." spark />
          )}
          {events.status === 'success' && sorted.length > 0 && filtered.length === 0 && (
            <StateCard
              title="Nothing matches that."
              body={`No sessions for “${q || FILTERS.find((f) => f.key === cat)?.label}”. Try another word or category.`}
              action={<button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true, preventScrollReset: true })} className="pill pill--sm">Clear filters</button>}
            />
          )}
          {events.status === 'success' && filtered.length > 0 && (
            <>
              {showFeatured && <Featured e={featured!} />}
              {grid.length > 0 && (
                <div className={`grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3 ${showFeatured ? 'mt-px' : ''}`}>
                  {grid.map((e, i) => <EventCard key={e.id} e={e} index={i} />)}
                  {/* complete the last row so the hairline grid never shows an empty grey slot */}
                  {Array.from({ length: (3 - (grid.length % 3)) % 3 }).map((_, i) => <Filler key={`x${i}`} className="hidden xl:flex" />)}
                  {Array.from({ length: grid.length % 2 }).map((_, i) => <Filler key={`s${i}`} className="hidden sm:flex xl:hidden" />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function Featured({ e }: { e: TSEvent }) {
  const meta = CATEGORY_META[categoryKey(e.category)]
  const [dd, mon] = formatDateShort(e.date).split(' ')
  return (
    <article className="group relative grid overflow-hidden bg-ink lg:grid-cols-[1.45fr_1fr]" data-reveal="up">
      <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-px" style={{ background: `linear-gradient(90deg, ${meta.from}, ${meta.to}, transparent 80%)` }} />
      <Link to={`/events/${e.slug}`} viewTransition className="relative block aspect-[16/10] lg:aspect-auto lg:min-h-[520px]" data-cursor="VIEW" aria-label={`${e.title} — details`}>
        <Duotone src={e.image} alt={e.title} category={e.category} eager className="absolute inset-0" label={e.image ? undefined : meta.short} />
        <span className="t-label absolute left-4 top-4 z-10 rounded-full bg-void/60 px-3 py-1.5 backdrop-blur">Featured</span>
      </Link>
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div className="t-num leading-[0.82] text-frost">
            <span className="block text-[clamp(72px,8vw,132px)] font-[300] tracking-[-0.04em] [font-stretch:75%]">{dd}</span>
            <span className="t-label mt-2 block text-spark">{mon}</span>
          </div>
          <Soon e={e} />
        </div>
        <p className="t-meta mt-8" style={{ color: meta.to }}>{meta.label}</p>
        <h3 className="t-h1 mt-3 text-[clamp(32px,3.2vw,52px)] text-frost" style={{ viewTransitionName: `title-${e.slug}` }}>{e.title}</h3>
        <p className="t-body mt-4">{e.description}</p>
        <ul className="mt-5 grid gap-1.5 text-[14px] text-mute-hi">
          {e.time && <li className="flex items-center gap-2"><Clock size={14} aria-hidden className="opacity-70" />{e.time}</li>}
          {e.location && <li className="flex items-center gap-2"><MapPin size={14} aria-hidden className="opacity-70" />{e.location}</li>}
          {e.speaker && <li className="flex items-center gap-2"><Mic2 size={14} aria-hidden className="opacity-70" />{e.speaker}</li>}
        </ul>
        <div className="mt-auto pt-8"><SeatLine e={e} /></div>
        <div className="mt-6 flex flex-wrap gap-3">
          <RegisterButton e={e} size="md" />
          <Link to={`/events/${e.slug}`} viewTransition className="pill">Details</Link>
        </div>
      </div>
    </article>
  )
}

function Filler({ className }: { className: string }) {
  return (
    <div aria-hidden className={`flex-col items-center justify-center gap-4 bg-ink p-8 ${className}`}>
      <span className="h-1 w-1 rounded-full bg-frost/50 shadow-[0_0_14px_3px_rgb(26_159_232/0.35)]" />
      <span className="t-meta">More sessions soon</span>
    </div>
  )
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Loading events">
      <div className="grid gap-px bg-line lg:grid-cols-[1.45fr_1fr]">
        <Skeleton className="aspect-[16/10] lg:aspect-auto lg:min-h-[520px]" />
        <div className="space-y-4 bg-ink p-10">
          <Skeleton className="h-24 w-28" /><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-px grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-4 bg-ink pb-6"><Skeleton className="aspect-[16/10]" /><div className="space-y-3 px-6"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-4/5" /><Skeleton className="h-3 w-1/2" /></div></div>
        ))}
      </div>
    </div>
  )
}

export function StateCard({ title, body, action, spark }: { title: string; body: string; action?: React.ReactNode; spark?: boolean }) {
  return (
    <div className="relative grid min-h-[320px] place-items-center overflow-hidden border border-line bg-ink px-6 py-16 text-center">
      <div aria-hidden className="absolute left-1/2 top-[38%] h-40 w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cobalt/10 blur-3xl" />
      <div className="relative">
        <span aria-hidden className={`mx-auto mb-8 block h-1.5 w-1.5 rounded-full bg-frost ${spark ? 'animate-pulse shadow-[0_0_20px_5px_rgb(26_159_232/0.8)]' : 'opacity-40 shadow-[0_0_14px_3px_rgb(26_159_232/0.25)]'}`} />
        <p className="t-h2 mx-auto max-w-[26ch] text-[clamp(22px,2.2vw,30px)] text-frost">{title}</p>
        <p className="t-body mx-auto mt-3 max-w-[44ch]">{body}</p>
        {action && <div className="mt-8 flex justify-center">{action}</div>}
      </div>
    </div>
  )
}
