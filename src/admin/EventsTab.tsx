import { useCallback, useState } from 'react'
import { Plus, Pencil, Star, Eye, EyeOff, Loader2, ExternalLink } from 'lucide-react'
import { deleteEvent, listEvents, saveEvent, slugify } from './adminApi'
import type { TSEvent } from '../lib/api'
import { useList } from './useList'
import { Badge, DeleteButton, Drawer, Field, GalleryField, ImageField, Input, Panel, Select, TableState, Textarea, Toggle } from './ui'
import { formatDateShort } from '../lib/time'
import { toast } from '../lib/toast'

const CATS = ['Technical', 'Non-Technical', 'Fun & Social']
const STATUSES = ['Open', 'Full', 'Closed']
const blank = (): Partial<TSEvent> => ({ title: '', slug: '', description: '', fullDescription: '', date: '', time: '', endTime: '', location: '', category: 'Technical', status: 'Open', published: false, capacity: 60, speaker: '', image: '', tags: [], featured: false, registrationMode: 'form', registrationUrl: '', registrationDeadline: null, gallery: [] })

const MODES = [{ v: 'form', l: 'On this site (registration form)' }, { v: 'external', l: 'External link (Google Form, Unstop…)' }, { v: 'closed', l: 'Closed' }]
/** <input type=datetime-local> wants local 'YYYY-MM-DDTHH:mm' */
const toLocalInput = (iso: string | null | undefined) => { if (!iso) return ''; const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }

export function EventsTab() {
  const list = useList(useCallback(listEvents, []))
  const [edit, setEdit] = useState<{ id?: string; v: Partial<TSEvent> } | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagText, setTagText] = useState('')

  const open = (e?: TSEvent) => { setErrors({}); setTagText((e?.tags ?? []).join(', ')); setEdit({ id: e?.id, v: e ? { ...e } : blank() }) }
  const set = <K extends keyof TSEvent>(k: K, val: TSEvent[K]) => setEdit((s) => (s ? { ...s, v: { ...s.v, [k]: val } } : s))

  const quick = async (e: TSEvent, patch: Partial<TSEvent>, msg: string) => {
    try { const { registeredCount: _rc, ...rest } = e; void _rc; await saveEvent({ ...rest, ...patch }, e.id); toast.success(msg); list.reload() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Update failed') }
  }

  const save = async () => {
    if (!edit) return
    const v = edit.v
    const errs: Record<string, string> = {}
    if (!v.title?.trim()) errs.title = 'Required'
    if (!v.date) errs.date = 'Required'
    if ((v.capacity ?? 0) < 0) errs.capacity = 'Must be 0 or more'
    if (v.registrationMode === 'external' && !/^https?:\/\//.test(v.registrationUrl ?? '')) errs.registrationUrl = 'Paste a full link (https://…)'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      const tags = tagText.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
      const { registeredCount: _rc, ...rest } = v
      void _rc
      const saved = await saveEvent({ ...rest, title: v.title!.trim(), tags, capacity: Number(v.capacity) || 0 }, edit.id)
      toast.success(edit.id ? 'Event updated' : `Event created at /events/${saved.slug}`)
      setEdit(null)
      list.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Panel title="Events & sessions" count={list.data.length} action={<button type="button" onClick={() => open()} className="pill pill--spark pill--sm"><Plus size={14} /> New event</button>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[14px]">
          <thead className="border-b border-line text-[11.5px] font-[600] uppercase tracking-[0.06em] text-mute-hi">
            <tr><th className="px-5 py-3">Event</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Seats</th><th className="px-3 py-3">State</th><th className="px-5 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            <TableState status={list.status} error={list.error} onRetry={list.reload} empty={list.status === 'success' && !list.data.length} colSpan={5} />
            {list.status === 'success' && list.data.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-5 py-3.5">
                  <p className="font-[560] text-frost">{e.title}</p>
                  <p className="text-[12.5px] text-mute">/{e.slug} · {e.category}</p>
                </td>
                <td className="t-num px-3 py-3.5 text-frost/85">{formatDateShort(e.date)}{e.time && <span className="block text-[12.5px] text-mute">{e.time}</span>}</td>
                <td className="t-num px-3 py-3.5 text-frost/85">{e.registeredCount}/{e.capacity || '∞'}</td>
                <td className="px-3 py-3.5"><div className="flex flex-wrap gap-1.5"><Badge on={e.published}>{e.published ? 'Published' : 'Draft'}</Badge>{e.featured && <Badge on>Featured</Badge>}<Badge>{e.status}</Badge></div></td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn label={e.published ? 'Unpublish' : 'Publish'} onClick={() => quick(e, { published: !e.published }, e.published ? 'Unpublished' : 'Published')}>{e.published ? <EyeOff size={14} /> : <Eye size={14} />}</IconBtn>
                    <IconBtn label={e.featured ? 'Unfeature' : 'Feature'} onClick={() => quick(e, { featured: !e.featured }, e.featured ? 'No longer featured' : 'Featured')}><Star size={14} className={e.featured ? 'fill-spark text-spark' : ''} /></IconBtn>
                    {e.published && <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer" aria-label="View live" className="grid h-8 w-8 place-items-center rounded-full text-mute-hi hover:bg-white/5 hover:text-frost"><ExternalLink size={14} /></a>}
                    <IconBtn label="Edit" onClick={() => open(e)}><Pencil size={14} /></IconBtn>
                    <DeleteButton onConfirm={async () => { try { await deleteEvent(e.id); toast.success('Event deleted'); list.reload() } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed') } }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer
        title={edit?.id ? 'Edit event' : 'New event'} open={!!edit} onClose={() => setEdit(null)} busy={saving}
        footer={<><button type="button" onClick={() => setEdit(null)} disabled={saving} className="pill pill--sm">Cancel</button><button type="button" onClick={save} disabled={saving} className="pill pill--spark pill--sm">{saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save event'}</button></>}
      >
        {edit && (
          <>
            <Field label="Title" error={errors.title}><Input value={edit.v.title ?? ''} invalid={!!errors.title} onChange={(e) => set('title', e.target.value)} placeholder="Spark Hack: 24 Hours to Build" /></Field>
            <Field label="Slug" hint={`/events/${edit.v.slug || slugify(edit.v.title || '') || '…'}`}><Input value={edit.v.slug ?? ''} onChange={(e) => set('slug', slugify(e.target.value))} placeholder="auto from title" /></Field>
            <Field label="Short description"><Textarea value={edit.v.description ?? ''} onChange={(e) => set('description', e.target.value)} className="!min-h-[80px]" /></Field>
            <Field label="Full description" hint="Shown on the event page"><Textarea value={edit.v.fullDescription ?? ''} onChange={(e) => set('fullDescription', e.target.value)} className="!min-h-[160px]" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" error={errors.date}><Input type="date" value={edit.v.date ?? ''} invalid={!!errors.date} onChange={(e) => set('date', e.target.value)} /></Field>
              <Field label="Starts"><Input value={edit.v.time ?? ''} onChange={(e) => set('time', e.target.value)} placeholder="6:00 PM" /></Field>
              <Field label="Ends" hint="optional"><Input value={edit.v.endTime ?? ''} onChange={(e) => set('endTime', e.target.value)} placeholder="9:00 PM" /></Field>
              <Field label="Location"><Input value={edit.v.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="CSE Block, Lab 3" /></Field>
              <Field label="Speaker"><Input value={edit.v.speaker ?? ''} onChange={(e) => set('speaker', e.target.value)} /></Field>
              <Field label="Category"><Select options={CATS} value={edit.v.category} onChange={(e) => set('category', e.target.value)} /></Field>
              <Field label="Status"><Select options={STATUSES} value={edit.v.status} onChange={(e) => set('status', e.target.value)} /></Field>
              <Field label="Capacity" hint="0 = unlimited" error={errors.capacity}><Input type="number" min={0} value={edit.v.capacity ?? 0} onChange={(e) => set('capacity', Number(e.target.value))} /></Field>
              <Field label="Tags" hint="comma separated"><Input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Hackathon, Teams" /></Field>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="mb-3 text-[13px] font-[600] text-frost">Registration</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="How students register" className="sm:col-span-2">
                  <select value={edit.v.registrationMode ?? 'form'} onChange={(e) => set('registrationMode', e.target.value as TSEvent['registrationMode'])} className="h-11 w-full cursor-pointer rounded-xl border border-line-strong bg-void/60 px-3.5 text-[15px] text-frost outline-none focus:border-spark/70">
                    {MODES.map((m) => <option key={m.v} value={m.v} className="bg-ink">{m.l}</option>)}
                  </select>
                </Field>
                {edit.v.registrationMode === 'external' && (
                  <Field label="Registration link" error={errors.registrationUrl} className="sm:col-span-2"><Input value={edit.v.registrationUrl ?? ''} invalid={!!errors.registrationUrl} onChange={(e) => set('registrationUrl', e.target.value)} placeholder="https://forms.gle/…" /></Field>
                )}
                <Field label="Registrations close" hint="optional">
                  <Input type="datetime-local" value={toLocalInput(edit.v.registrationDeadline)} onChange={(e) => set('registrationDeadline', e.target.value ? new Date(e.target.value).toISOString() : null)} />
                </Field>
                {edit.id && <Field label="Registered so far" hint="auto-counted"><Input value={String(edit.v.registeredCount ?? 0)} disabled /></Field>}
              </div>
            </div>
            <ImageField label="Cover image" value={edit.v.image ?? ''} onChange={(v) => set('image', v)} />
            <GalleryField value={edit.v.gallery ?? []} onChange={(v) => set('gallery', v)} />
            <div className="flex flex-wrap gap-6 pt-1">
              <Toggle checked={!!edit.v.published} onChange={(v) => set('published', v)} label="Published" />
              <Toggle checked={!!edit.v.featured} onChange={(v) => set('featured', v)} label="Featured" />
            </div>
          </>
        )}
      </Drawer>
    </Panel>
  )
}

export function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className="grid h-8 w-8 place-items-center rounded-full text-mute-hi transition-colors hover:bg-white/5 hover:text-frost">{children}</button>
}
