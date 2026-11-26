import { useCallback, useState } from 'react'
import { Plus, Pencil, Pin, Eye, EyeOff, Loader2 } from 'lucide-react'
import { deleteAnnouncement, listAnnouncements, saveAnnouncement } from './adminApi'
import type { Announcement } from '../lib/api'
import { useList } from './useList'
import { Badge, DeleteButton, Drawer, Field, Input, Panel, Select, TableState, Textarea, Toggle } from './ui'
import { IconBtn } from './EventsTab'
import { formatDateShort } from '../lib/time'
import { toast } from '../lib/toast'

const blank = (): Partial<Announcement> => ({ title: '', summary: '', content: '', date: new Date().toISOString().slice(0, 10), category: 'General', priority: 'Normal', author: 'Club Leads', pinned: false, published: false, relatedEventSlug: '' })

export function BulletinsTab() {
  const list = useList(useCallback(listAnnouncements, []))
  const [edit, setEdit] = useState<{ id?: string; v: Partial<Announcement> } | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = <K extends keyof Announcement>(k: K, val: Announcement[K]) => setEdit((s) => (s ? { ...s, v: { ...s.v, [k]: val } } : s))

  const quick = async (a: Announcement, patch: Partial<Announcement>, msg: string) => {
    try { await saveAnnouncement({ ...a, ...patch }, a.id); toast.success(msg); list.reload() } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed') }
  }
  const save = async () => {
    if (!edit) return
    if (!edit.v.title?.trim()) { setErr('Required'); return }
    setSaving(true)
    try {
      await saveAnnouncement({ ...edit.v, title: edit.v.title.trim(), relatedEventSlug: edit.v.relatedEventSlug?.trim() || null }, edit.id)
      toast.success(edit.id ? 'Bulletin updated' : 'Bulletin created'); setEdit(null); list.reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed') } finally { setSaving(false) }
  }

  return (
    <Panel title="Bulletins & news" count={list.data.length} action={<button type="button" onClick={() => { setErr(''); setEdit({ v: blank() }) }} className="pill pill--spark pill--sm"><Plus size={14} /> New bulletin</button>}>
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[720px] text-left text-[14px]">
          <thead className="border-b border-line text-[11.5px] font-[600] uppercase tracking-[0.06em] text-mute-hi">
            <tr><th className="px-5 py-3">Title</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">State</th><th className="px-5 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            <TableState status={list.status} error={list.error} onRetry={list.reload} empty={list.status === 'success' && !list.data.length} colSpan={4} />
            {list.status === 'success' && list.data.map((a) => (
              <tr key={a.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3.5"><p className="font-[560] text-frost">{a.title}</p><p className="line-clamp-1 text-[12.5px] text-mute">{a.category} · {a.summary}</p></td>
                <td className="t-num px-3 py-3.5 text-frost/85">{formatDateShort(a.date)}</td>
                <td className="px-3 py-3.5"><div className="flex flex-wrap gap-1.5"><Badge on={a.published}>{a.published ? 'Published' : 'Draft'}</Badge>{a.pinned && <Badge on>Pinned</Badge>}{a.priority !== 'Normal' && <Badge>{a.priority}</Badge>}</div></td>
                <td className="px-5 py-3.5"><div className="flex items-center justify-end gap-1">
                  <IconBtn quick label={a.published ? 'Unpublish' : 'Publish'} onClick={() => quick(a, { published: !a.published }, a.published ? 'Unpublished' : 'Published')}>{a.published ? <EyeOff size={14} /> : <Eye size={14} />}</IconBtn>
                  <IconBtn quick label={a.pinned ? 'Unpin' : 'Pin'} onClick={() => quick(a, { pinned: !a.pinned }, a.pinned ? 'Unpinned' : 'Pinned')}><Pin size={14} className={a.pinned ? 'fill-spark text-spark' : ''} /></IconBtn>
                  <IconBtn label="Edit" onClick={() => { setErr(''); setEdit({ id: a.id, v: { ...a, relatedEventSlug: a.relatedEventSlug ?? '' } }) }}><Pencil size={14} /></IconBtn>
                  <DeleteButton onConfirm={async () => { try { await deleteAnnouncement(a.id); toast.success('Bulletin deleted'); list.reload() } catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed') } }} />
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer title={edit?.id ? 'Edit bulletin' : 'New bulletin'} open={!!edit} onClose={() => setEdit(null)} busy={saving}
        footer={<><button type="button" onClick={() => setEdit(null)} disabled={saving} className="pill pill--sm">Cancel</button><button type="button" onClick={save} disabled={saving} className="pill pill--spark pill--sm">{saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save bulletin'}</button></>}>
        {edit && (<>
          <Field label="Title" error={err}><Input value={edit.v.title ?? ''} invalid={!!err} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Summary" hint="One line on the list"><Input value={edit.v.summary ?? ''} onChange={(e) => set('summary', e.target.value)} /></Field>
          <Field label="Content" hint="Shown when expanded"><Textarea value={edit.v.content ?? ''} onChange={(e) => set('content', e.target.value)} className="!min-h-[160px]" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date"><Input type="date" value={edit.v.date ?? ''} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Category"><Input value={edit.v.category ?? ''} onChange={(e) => set('category', e.target.value)} placeholder="General" /></Field>
            <Field label="Priority"><Select options={['Low', 'Normal', 'High', 'Urgent']} value={edit.v.priority} onChange={(e) => set('priority', e.target.value)} /></Field>
            <Field label="Author"><Input value={edit.v.author ?? ''} onChange={(e) => set('author', e.target.value)} /></Field>
          </div>
          <Field label="Related event slug" hint="optional, e.g. spark-hack-24"><Input value={edit.v.relatedEventSlug ?? ''} onChange={(e) => set('relatedEventSlug', e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Link" hint="optional: form, PDF, results…"><Input value={edit.v.linkUrl ?? ''} onChange={(e) => set('linkUrl', e.target.value)} placeholder="https://…" /></Field>
            <Field label="Link label"><Input value={edit.v.linkLabel ?? ''} onChange={(e) => set('linkLabel', e.target.value)} placeholder="Apply" /></Field>
          </div>
          <div className="flex flex-wrap gap-6"><Toggle checked={!!edit.v.published} onChange={(v) => set('published', v)} label="Published" /><Toggle checked={!!edit.v.pinned} onChange={(v) => set('pinned', v)} label="Pinned" /></div>
        </>)}
      </Drawer>
    </Panel>
  )
}
