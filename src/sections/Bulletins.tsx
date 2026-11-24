import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Plus, RotateCw } from 'lucide-react'
import { fetchAnnouncements, type Announcement } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useReveals } from '../lib/reveal'
import { formatDateShort } from '../lib/time'
import { Skeleton } from '../components/Skeleton'
import { StateCard } from './Events'

export function Bulletins() {
  const root = useRef<HTMLElement>(null)
  const list = useAsync('announcements', fetchAnnouncements)
  useReveals(root, [list.status])
  return (
    <section ref={root} id="announcements" aria-labelledby="bulletins-title" data-spark="0.42 -0.1 0.6 1.7" className="relative bg-void px-[var(--gutter)] py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1440px]">
        <h2 id="bulletins-title" className="t-h1 above-spark text-[clamp(72px,12vw,200px)]" data-reveal="lines">Bulletins</h2>
        <p className="t-label mt-4 text-mute-hi" data-reveal="up">Official updates & notices</p>

        <div className="mt-12">
          {list.status === 'loading' && (
            <div aria-busy="true" aria-label="Loading announcements" className="divide-y divide-line border-y border-line">
              {[0, 1, 2].map((i) => <div key={i} className="grid gap-3 py-7 md:grid-cols-[110px_130px_1fr]"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-20" /><div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>)}
            </div>
          )}
          {list.status === 'error' && (
            <StateCard title="Unable to load campus announcements at this time." body="Check back later or view official campus notices."
              action={<button type="button" onClick={list.reload} className="pill pill--sm"><RotateCw size={13} /> Try again</button>} />
          )}
          {list.status === 'success' && list.data.length === 0 && (
            <StateCard title="No announcements right now." body="Official updates and notices from the club will appear here." />
          )}
          {list.status === 'success' && list.data.length > 0 && (
            <ul className="above-spark border-t border-white/15">
              {list.data.map((a) => <Row key={a.id} a={a} />)}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function Row({ a }: { a: Announcement }) {
  const [open, setOpen] = useState(false)
  const id = `bulletin-${a.id}`
  const prio = a.priority.toLowerCase()
  return (
    <li className="group relative border-b border-white/15" data-reveal="up">
      {a.pinned && <span aria-hidden className="absolute -left-[var(--gutter)] top-0 bottom-0 w-px bg-spark shadow-[0_0_12px_rgb(26_159_232/0.9)] sm:left-0" />}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="bulletin-row relative grid w-full gap-x-6 gap-y-2 overflow-hidden py-7 text-left sm:pl-6 md:grid-cols-[96px_140px_minmax(0,1fr)_auto] md:items-baseline"
      >
        <span className="t-num text-[13px] font-[600] text-frost/80">{formatDateShort(a.date ?? a.createdAt.slice(0, 10))}</span>
        <span className="flex items-center gap-2">
          <span className="t-meta">{a.category}</span>
          {a.pinned && <span className="t-meta !text-spark">· Pinned</span>}
        </span>
        <span className="min-w-0">
          <span className="t-serif block text-[clamp(28px,2.8vw,42px)] leading-[1.02] text-white">{a.pinned && <span aria-label="Pinned" className="mr-3 inline-block h-2 w-2 -translate-y-[0.35em] rounded-full bg-spark shadow-[0_0_10px_rgb(26_159_232)]" />}{a.title}</span>
          {a.summary && <span className="t-body mt-1.5 block">{a.summary}</span>}
        </span>
        <span className="flex items-center gap-4 md:justify-end">
          {prio !== 'normal' && (
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-[620] uppercase tracking-[0.06em] ${prio === 'high' || prio === 'urgent' ? 'border-amber/40 text-amber' : 'border-line-strong text-mute-hi'}`}>{a.priority}</span>
          )}
          <span aria-hidden className={`grid h-9 w-9 place-items-center rounded-full border border-line-strong text-frost transition-transform duration-700 ease-[var(--ease-expo)] ${open ? 'rotate-45' : ''}`}><Plus size={15} /></span>
        </span>
      </button>
      <div id={id} role="region" aria-label={a.title} className={`grid transition-[grid-template-rows] duration-700 ease-[var(--ease-expo)] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="pb-8 sm:pl-6 md:pl-[calc(96px+140px+48px+24px)]">
            <p className="t-body max-w-[68ch] whitespace-pre-line text-frost/80">{a.content || a.summary}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {a.author && <span className="t-meta">— {a.author}</span>}
              {a.relatedEventSlug && (
                <Link to={`/events/${a.relatedEventSlug}`} viewTransition className="pill pill--sm" tabIndex={open ? 0 : -1}>Related event <span aria-hidden>→</span></Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
