import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, CalendarPlus, Clock, MapPin, Mic2, Share2, RotateCw } from 'lucide-react'
import { fetchEventBySlug } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useReveals } from '../lib/reveal'
import { CATEGORY_META, categoryKey } from '../lib/site'
import { eventStart, formatCountdown } from '../lib/time'
import { googleCalendarUrl, shareEvent } from '../lib/calendar'
import { Duotone } from '../components/Duotone'
import { RegisterButton, SeatLine } from '../components/EventCard'
import { useCountdown } from '../lib/useEvents'
import { Skeleton } from '../components/Skeleton'
import { StateCard } from '../sections/Events'
import { Footer } from '../sections/Footer'
import { NotFound } from './NotFound'

export function EventDetail() {
  const { slug = '' } = useParams()
  const ev = useAsync(`event:${slug}`, () => fetchEventBySlug(slug))
  const root = useRef<HTMLElement>(null)
  useReveals(root, [ev.status])

  const e = ev.status === 'success' ? ev.data : null
  useEffect(() => {
    const prev = document.title
    if (e) document.title = `${e.title} — TECHSPARK`
    return () => { document.title = prev }
  }, [e])
  const start = e ? eventStart(e.date, e.time) : null
  const ms = useCountdown(start)

  if (ev.status === 'success' && !e) return <NotFound what="event" />

  return (
    <>
      <article ref={root} className="relative bg-void">
        <header data-spark="0.36 0.12 0.75 0.4" className="relative min-h-[78svh] overflow-hidden">
          {e ? (
            <Duotone src={e.image} alt={e.title} category={e.category} eager className="absolute inset-0" />
          ) : <Skeleton className="absolute inset-0" />}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-void/30" />
          <div className="above-spark mx-auto flex min-h-[78svh] max-w-[1440px] flex-col justify-end px-[var(--gutter)] pb-14 pt-[calc(var(--nav-h)+32px)]">
            <Link to="/#events" viewTransition className="t-meta absolute top-[calc(var(--nav-h)+24px)] inline-flex items-center gap-2 transition-colors hover:text-frost"><ArrowLeft size={14} /> All events</Link>
            {e ? (
              <>
                <p className="t-meta" style={{ color: CATEGORY_META[categoryKey(e.category)].to }}>{CATEGORY_META[categoryKey(e.category)].label}</p>
                <h1 className="t-h1 mt-4 max-w-[16ch] text-[clamp(52px,8.6vw,150px)]" style={{ viewTransitionName: `title-${e.slug}` }}>{e.title}</h1>
              </>
            ) : ev.status === 'loading' ? (
              <div className="space-y-4"><Skeleton className="h-3 w-40" /><Skeleton className="h-16 w-3/4" /></div>
            ) : null}
          </div>
        </header>

        {ev.status === 'error' && (
          <div className="mx-auto max-w-[1440px] px-[var(--gutter)] py-16">
            <StateCard title="Unable to load this session right now." body="Please check back soon or contact the club leads." action={<button type="button" onClick={ev.reload} className="pill pill--sm"><RotateCw size={13} /> Try again</button>} />
          </div>
        )}

        {e && (
          <div data-spark="-0.44 0 0.45 1.2" className="above-spark mx-auto grid max-w-[1440px] gap-12 px-[var(--gutter)] pb-[var(--section-pad)] pt-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-20">
            <div>
              <p className="max-w-[40ch] text-[clamp(19px,1.7vw,24px)] leading-[1.45] text-frost/90" data-reveal="lines">{e.description}</p>
              <div className="t-body mt-10 max-w-[64ch] space-y-5 whitespace-pre-line text-[16.5px]" data-reveal="up">{e.fullDescription}</div>
              {e.tags.length > 0 && <p className="mt-10 text-[14px] text-mute-hi" data-reveal="up">{e.tags.map((t) => `#${t}`).join('   ')}</p>}
            </div>

            <aside className="lg:sticky lg:top-[calc(var(--nav-h)+24px)] lg:self-start" aria-label="Registration">
              <div className="border border-line bg-ink p-6 sm:p-7">
                <dl className="space-y-4 text-[15px]">
                  <div className="flex gap-3"><dt className="sr-only">Date and time</dt><Clock size={17} className="mt-0.5 shrink-0 text-mute-hi" aria-hidden />
                    <dd className="text-frost">{start ? start.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Date TBA'}{e.time ? ` · ${e.time}` : ''}</dd></div>
                  {e.location && <div className="flex gap-3"><dt className="sr-only">Venue</dt><MapPin size={17} className="mt-0.5 shrink-0 text-mute-hi" aria-hidden /><dd className="text-frost">{e.location}</dd></div>}
                  {e.speaker && <div className="flex gap-3"><dt className="sr-only">Speaker</dt><Mic2 size={17} className="mt-0.5 shrink-0 text-mute-hi" aria-hidden /><dd className="text-frost">{e.speaker}</dd></div>}
                </dl>
                {start && ms > 0 && (
                  <p className="mt-6 border-t border-line pt-5"><span className="t-meta block">Starts in</span><span className="t-num mt-1 block text-[26px] font-[500] tracking-[-0.02em] text-white">{formatCountdown(ms)}</span></p>
                )}
                <div className="mt-6 border-t border-line pt-5"><SeatLine e={e} /></div>
                <div className="mt-6"><RegisterButton e={e} size="md" full /></div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={googleCalendarUrl(e)} target="_blank" rel="noopener noreferrer" className="pill pill--sm"><CalendarPlus size={14} /> Calendar</a>
                  <button type="button" onClick={() => shareEvent(e)} className="pill pill--sm"><Share2 size={14} /> Share</button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </article>
      <Footer />
    </>
  )
}
