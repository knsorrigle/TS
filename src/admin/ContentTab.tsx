import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, RotateCcw } from 'lucide-react'
import { loadSiteContent, saveSiteContent } from './adminApi'
import { DEFAULT_CONTENT, type Row, type SiteContent } from '../lib/content'
import { Field, Input, ListField, Panel, Textarea } from './ui'
import { toast } from '../lib/toast'

/** Every piece of public copy and every contact link, in the order it appears on the site. */
export function ContentTab() {
  const [saved, setSaved] = useState<SiteContent | null>(null)
  const [c, setC] = useState<SiteContent | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [rev, setRev] = useState(0) // remount list fields after discard/reset

  useEffect(() => {
    loadSiteContent().then((x) => { setSaved(x); setC(structuredClone(x)) }).catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }, [])
  const dirty = useMemo(() => !!c && !!saved && JSON.stringify(c) !== JSON.stringify(saved), [c, saved])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  if (err) return <Panel title="Site content"><p className="p-6 text-ember">{err}</p></Panel>
  if (!c) return <Panel title="Site content"><p className="flex items-center gap-2 p-6 text-mute-hi"><Loader2 size={16} className="animate-spin" /> Loading…</p></Panel>

  const up = <K extends keyof SiteContent>(k: K, patch: Partial<SiteContent[K]>) => setC((s) => (s ? { ...s, [k]: { ...s[k], ...patch } } : s))
  const save = async () => {
    setBusy(true)
    try { await saveSiteContent(c); setSaved(structuredClone(c)); toast.success('Site content saved — live now') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed') } finally { setBusy(false) }
  }
  const rows = c.whatWeDo.rows
  const setRow = (i: number, patch: Partial<Row>) => up('whatWeDo', { rows: rows.map((r, k) => (k === i ? { ...r, ...patch } : r)) })
  const moveRow = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= rows.length) return; const n = [...rows]; [n[i], n[j]] = [n[j], n[i]]; up('whatWeDo', { rows: n }) }

  return (
    <div className="space-y-5 pb-24" key={rev}>
      <Group title="Hero" note="The giant Tech / Spark title stays fixed — it's the brand.">
        <Field label="Tagline" hint="Full stops turn blue"><Input value={c.hero.tagline} onChange={(e) => up('hero', { tagline: e.target.value })} /></Field>
        <Field label="Short description"><Input value={c.hero.description} onChange={(e) => up('hero', { description: e.target.value })} /></Field>
        <Field label="Ticket stub text"><Input value={c.hero.ticket} onChange={(e) => up('hero', { ticket: e.target.value })} /></Field>
      </Group>

      <Group title="Welcome (lit words)">
        <ListField label="Words" hint="One per line — three works best" value={c.intro.words} onChange={(v) => up('intro', { words: v })} />
        <Field label="Paragraph"><Textarea value={c.intro.body} onChange={(e) => up('intro', { body: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary button"><Input value={c.intro.primaryCta} onChange={(e) => up('intro', { primaryCta: e.target.value })} /></Field>
          <Field label="Secondary button"><Input value={c.intro.secondaryCta} onChange={(e) => up('intro', { secondaryCta: e.target.value })} /></Field>
        </div>
      </Group>

      <Group title="About statement">
        <Field label="Heading"><Textarea rows={2} value={c.statement.heading} onChange={(e) => up('statement', { heading: e.target.value })} className="!min-h-0" /></Field>
        <Field label="Paragraph"><Textarea value={c.statement.body} onChange={(e) => up('statement', { body: e.target.value })} className="!min-h-[130px]" /></Field>
        <ListField label="Scrolling keywords" value={c.statement.marquee} onChange={(v) => up('statement', { marquee: v })} rows={5} />
      </Group>

      <Group title="What we do" note="Rows appear in this order. Category rows are the larger ones.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading"><Input value={c.whatWeDo.heading} onChange={(e) => up('whatWeDo', { heading: e.target.value })} /></Field>
          <Field label="Sub-line"><Input value={c.whatWeDo.sub} onChange={(e) => up('whatWeDo', { sub: e.target.value })} /></Field>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-[600] text-frost">Row {i + 1}</p>
              <div className="flex gap-1">
                <IconBtn label="Move up" onClick={() => moveRow(i, -1)}><ArrowUp size={14} /></IconBtn>
                <IconBtn label="Move down" onClick={() => moveRow(i, 1)}><ArrowDown size={14} /></IconBtn>
                <IconBtn label="Delete row" onClick={() => up('whatWeDo', { rows: rows.filter((_, k) => k !== i) })}><Trash2 size={14} /></IconBtn>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Title"><Input value={r.title} onChange={(e) => setRow(i, { title: e.target.value })} /></Field>
              <Field label="Muted word" hint="e.g. events"><Input value={r.muted} onChange={(e) => setRow(i, { muted: e.target.value })} /></Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ListField label="Bullet list" value={r.items} onChange={(v) => setRow(i, { items: v })} rows={4} />
              <Field label="Description"><Textarea rows={4} value={r.body} onChange={(e) => setRow(i, { body: e.target.value })} className="!min-h-0" /></Field>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => up('whatWeDo', { rows: [...rows, { title: 'New row', muted: '', items: [], body: '', category: '' }] })} className="pill pill--sm"><Plus size={14} /> Add row</button>
      </Group>

      <Group title="Section titles">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Events title"><Input value={c.sections.events} onChange={(e) => up('sections', { events: e.target.value })} /></Field>
          <Field label="No events message"><Input value={c.sections.eventsEmpty} onChange={(e) => up('sections', { eventsEmpty: e.target.value })} /></Field>
          <Field label="Bulletins title"><Input value={c.sections.bulletins} onChange={(e) => up('sections', { bulletins: e.target.value })} /></Field>
          <Field label="Bulletins sub-line"><Input value={c.sections.bulletinsSub} onChange={(e) => up('sections', { bulletinsSub: e.target.value })} /></Field>
          <Field label="Archive title"><Input value={c.sections.archive} onChange={(e) => up('sections', { archive: e.target.value })} /></Field>
          <Field label="Archive sub-line"><Input value={c.sections.archiveSub} onChange={(e) => up('sections', { archiveSub: e.target.value })} /></Field>
          <Field label="Team title"><Input value={c.sections.team} onChange={(e) => up('sections', { team: e.target.value })} /></Field>
          <Field label="Team sub-line"><Input value={c.sections.teamSub} onChange={(e) => up('sections', { teamSub: e.target.value })} /></Field>
        </div>
      </Group>

      <Group title="Closing section">
        <Field label="Heading" hint="New line = line break"><Textarea rows={2} value={c.cta.heading} onChange={(e) => up('cta', { heading: e.target.value })} className="!min-h-0" /></Field>
        <Field label="Paragraph"><Textarea rows={3} value={c.cta.body} onChange={(e) => up('cta', { body: e.target.value })} className="!min-h-0" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary button"><Input value={c.cta.primary} onChange={(e) => up('cta', { primary: e.target.value })} /></Field>
          <Field label="Secondary button" hint="opens email"><Input value={c.cta.secondary} onChange={(e) => up('cta', { secondary: e.target.value })} /></Field>
        </div>
      </Group>

      <Group title="Registration form" note="The department and year choices students pick from (one per line).">
        <div className="grid gap-4 sm:grid-cols-2">
          <ListField label="Departments" value={c.registration.departments} onChange={(v) => up('registration', { departments: v })} rows={7} />
          <ListField label="Years" value={c.registration.years} onChange={(v) => up('registration', { years: v })} rows={7} />
        </div>
      </Group>

      <Group title="Contact & links" note="Used in the footer, the closing section and calendar invites.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input type="email" value={c.contact.email} onChange={(e) => up('contact', { email: e.target.value })} /></Field>
          <Field label="Instagram URL"><Input value={c.contact.instagram} onChange={(e) => up('contact', { instagram: e.target.value })} /></Field>
          <Field label="GitHub URL" hint="leave empty to hide"><Input value={c.contact.github} onChange={(e) => up('contact', { github: e.target.value })} placeholder="https://github.com/…" /></Field>
          <Field label="Department"><Input value={c.contact.dept} onChange={(e) => up('contact', { dept: e.target.value })} /></Field>
          <Field label="College"><Input value={c.contact.college} onChange={(e) => up('contact', { college: e.target.value })} /></Field>
          <Field label="City"><Input value={c.contact.city} onChange={(e) => up('contact', { city: e.target.value })} /></Field>
        </div>
      </Group>

      {/* sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3 px-[var(--gutter)] py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <p className="flex min-w-0 items-center gap-2 text-[13.5px] text-mute-hi" aria-live="polite">
            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${dirty ? 'bg-amber shadow-[0_0_8px_rgb(255_196_107/0.8)]' : 'bg-white/25'}`} />
            <span className="truncate">{dirty ? 'Unsaved' : 'Saved'}<span className="max-sm:hidden">{dirty ? ' changes' : ' — live on the site'}</span></span>
          </p>
          <div className="flex shrink-0 gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" aria-label="View site" title="View site" className="pill pill--sm max-sm:!w-9 max-sm:!px-0"><ExternalLink size={14} /><span className="max-sm:hidden">View site</span></a>
            <button type="button" aria-label="Load default copy" title="Load the original copy (not saved until you press Save)" className="pill pill--sm max-sm:!w-9 max-sm:!px-0"
              onClick={() => { if (confirm('Replace every field with the original site copy? Nothing is saved until you press Save.')) { setC(structuredClone(DEFAULT_CONTENT)); setRev((n) => n + 1) } }}>
              <RotateCcw size={14} /><span className="max-sm:hidden">Defaults</span>
            </button>
            <button type="button" disabled={!dirty || busy} onClick={() => { setC(structuredClone(saved!)); setRev((n) => n + 1) }} className="pill pill--sm">Discard</button>
            <button type="button" disabled={!dirty || busy} onClick={save} className="pill pill--solid pill--sm">{busy ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Panel title={title}>
      <div className="space-y-4 p-5">
        {note && <p className="text-[13px] text-mute-hi">{note}</p>}
        {children}
      </div>
    </Panel>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className="grid h-8 w-8 place-items-center rounded-full text-mute-hi hover:bg-white/5 hover:text-frost">{children}</button>
}
