import { useCallback, useState } from 'react'
import { Plus, Pencil, Eye, EyeOff, Loader2 } from 'lucide-react'
import { deletePast, listPast, savePast } from './adminApi'
import type { PastEvent } from '../lib/api'
import { useList } from './useList'
import { Badge, DeleteButton, Drawer, Field, GalleryField, ImageField, Input, Panel, Select, TableState, Textarea, Toggle } from './ui'
import { IconBtn } from './EventsTab'
import { formatDateShort } from '../lib/time'
import { toast } from '../lib/toast'

const blank = (): Partial<PastEvent> => ({ title: '', date: '', participants: 0, category: 'Technical', description: '', image: '', highlight: '', published: true, gallery: [], linkUrl: '' })

export function PastTab() {
  const list = useList(useCallback(listPast, []))
  const [edit, setEdit] = useState<{ id?: string; v: Partial<PastEvent> } | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = <K extends keyof PastEvent>(k: K, val: PastEvent[K]) => setEdit((s) => (s ? { ...s, v: { ...s.v, [k]: val } } : s))
  const save = async () => {
    if (!edit) return
    if (!edit.v.title?.trim()) { setErr('Required'); return }
    setSaving(true)
    try { await savePast({ ...edit.v, title: edit.v.title.trim(), date: edit.v.date || null, participants: Number(edit.v.participants) || 0 }, edit.id); toast.success('Saved'); setEdit(null); list.reload() }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed') } finally { setSaving(false) }
  }
  return (
    <Panel title="Past event gallery" count={list.data.length} action={<button type="button" onClick={() => { setErr(''); setEdit({ v: blank() }) }} className="pill pill--spark pill--sm"><Plus size={14} /> Add past event</button>}>
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[680px] text-left text-[14px]">
          <thead className="border-b border-line text-[11.5px] font-[600] uppercase tracking-[0.06em] text-mute-hi">
            <tr><th className="px-5 py-3">Event</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">People</th><th className="px-3 py-3">State</th><th className="px-5 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            <TableState status={list.status} error={list.error} onRetry={list.reload} empty={list.status === 'success' && !list.data.length} colSpan={5} />
            {list.status === 'success' && list.data.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3.5"><div className="flex items-center gap-3">
                  {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover grayscale" /> : <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-cobalt to-spark opacity-60" />}
                  <div><p className="font-[560] text-frost">{p.title}</p><p className="text-[12.5px] text-mute">{p.category}</p></div></div></td>
                <td className="t-num px-3 py-3.5 text-frost/85">{formatDateShort(p.date)}</td>
                <td className="t-num px-3 py-3.5 text-frost/85">{p.participants}</td>
                <td className="px-3 py-3.5"><Badge on={p.published}>{p.published ? 'Published' : 'Hidden'}</Badge></td>
                <td className="px-5 py-3.5"><div className="flex items-center justify-end gap-1">
                  <IconBtn quick label={p.published ? 'Hide' : 'Publish'} onClick={async () => { try { await savePast({ ...p, published: !p.published }, p.id); list.reload() } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') } }}>{p.published ? <EyeOff size={14} /> : <Eye size={14} />}</IconBtn>
                  <IconBtn label="Edit" onClick={() => { setErr(''); setEdit({ id: p.id, v: { ...p } }) }}><Pencil size={14} /></IconBtn>
                  <DeleteButton onConfirm={async () => { try { await deletePast(p.id); toast.success('Deleted'); list.reload() } catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed') } }} />
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer title={edit?.id ? 'Edit past event' : 'Add past event'} open={!!edit} onClose={() => setEdit(null)} busy={saving}
        footer={<><button type="button" onClick={() => setEdit(null)} disabled={saving} className="pill pill--sm">Cancel</button><button type="button" onClick={save} disabled={saving} className="pill pill--spark pill--sm">{saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save'}</button></>}>
        {edit && (<>
          <Field label="Title" error={err}><Input value={edit.v.title ?? ''} invalid={!!err} onChange={(e) => set('title', e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date"><Input type="date" value={edit.v.date ?? ''} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Participants"><Input type="number" min={0} value={edit.v.participants ?? 0} onChange={(e) => set('participants', Number(e.target.value))} /></Field>
            <Field label="Category"><Select options={['Technical', 'Non-Technical', 'Fun & Social']} value={edit.v.category} onChange={(e) => set('category', e.target.value)} /></Field>
          </div>
          <Field label="Description"><Textarea value={edit.v.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Highlight" hint="Achievement line, shown in blue"><Input value={edit.v.highlight ?? ''} onChange={(e) => set('highlight', e.target.value)} placeholder="Winning team solved 9 of 10 problems" /></Field>
          <Field label="Link" hint="optional: results, album…"><Input value={edit.v.linkUrl ?? ''} onChange={(e) => set('linkUrl', e.target.value)} placeholder="https://…" /></Field>
          <ImageField label="Cover image" value={edit.v.image ?? ''} onChange={(v) => set('image', v)} />
          <GalleryField label="Gallery — photos & videos" allowVideo value={edit.v.gallery ?? []} onChange={(v) => set('gallery', v)} />
          <Toggle checked={!!edit.v.published} onChange={(v) => set('published', v)} label="Published" />
        </>)}
      </Drawer>
    </Panel>
  )
}
