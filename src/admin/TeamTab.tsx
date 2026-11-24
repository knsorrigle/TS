import { useCallback, useState } from 'react'
import { Plus, Pencil, Eye, EyeOff, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { deleteTeam, listTeam, saveTeam, swapTeamOrder } from './adminApi'
import type { TeamMember } from '../lib/api'
import { useList } from './useList'
import { Badge, DeleteButton, Drawer, Field, ImageField, Input, Panel, TableState, Toggle } from './ui'
import { IconBtn } from './EventsTab'
import { toast } from '../lib/toast'

export function TeamTab() {
  const list = useList(useCallback(listTeam, []))
  const [edit, setEdit] = useState<{ id?: string; v: Partial<TeamMember> } | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = <K extends keyof TeamMember>(k: K, val: TeamMember[K]) => setEdit((s) => (s ? { ...s, v: { ...s.v, [k]: val } } : s))
  const save = async () => {
    if (!edit) return
    if (!edit.v.name?.trim()) { setErr('Required'); return }
    setSaving(true)
    try { await saveTeam({ ...edit.v, name: edit.v.name.trim(), sortOrder: edit.v.sortOrder ?? list.data.length }, edit.id); toast.success('Saved'); setEdit(null); list.reload() }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed') } finally { setSaving(false) }
  }
  const move = async (i: number, dir: -1 | 1) => {
    const a = list.data[i], b = list.data[i + dir]
    if (!a || !b) return
    try { await swapTeamOrder(a, b); list.reload() } catch (e) { toast.error(e instanceof Error ? e.message : 'Reorder failed') }
  }
  return (
    <Panel title="Team" count={list.data.length} action={<button type="button" onClick={() => { setErr(''); setEdit({ v: { name: '', role: '', photo: '', photoFun: '', published: false } }) }} className="pill pill--spark pill--sm"><Plus size={14} /> Add member</button>}>
      <p className="border-b border-line px-5 py-3 text-[13px] text-mute-hi">The Team section stays hidden on the site until at least one member is published. The fun photo shows on hover.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-[14px]">
          <thead className="border-b border-line text-[11.5px] font-[600] uppercase tracking-[0.06em] text-mute-hi">
            <tr><th className="px-5 py-3">Member</th><th className="px-3 py-3">Order</th><th className="px-3 py-3">State</th><th className="px-5 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            <TableState status={list.status} error={list.error} onRetry={list.reload} empty={list.status === 'success' && !list.data.length} colSpan={4} />
            {list.status === 'success' && list.data.map((m, i) => (
              <tr key={m.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3"><div className="flex items-center gap-3">
                  {m.photo ? <img src={m.photo} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cobalt to-spark text-[13px] font-[650]">{m.name[0]}</span>}
                  <div><p className="font-[560] text-frost">{m.name}</p><p className="text-[12.5px] text-mute">{m.role}</p></div></div></td>
                <td className="px-3 py-3"><div className="flex gap-1">
                  <IconBtn label="Move up" onClick={() => move(i, -1)}><ArrowUp size={14} /></IconBtn>
                  <IconBtn label="Move down" onClick={() => move(i, 1)}><ArrowDown size={14} /></IconBtn></div></td>
                <td className="px-3 py-3"><Badge on={m.published}>{m.published ? 'Published' : 'Hidden'}</Badge></td>
                <td className="px-5 py-3"><div className="flex items-center justify-end gap-1">
                  <IconBtn label={m.published ? 'Hide' : 'Publish'} onClick={async () => { await saveTeam({ ...m, published: !m.published }, m.id); list.reload() }}>{m.published ? <EyeOff size={14} /> : <Eye size={14} />}</IconBtn>
                  <IconBtn label="Edit" onClick={() => { setErr(''); setEdit({ id: m.id, v: { ...m } }) }}><Pencil size={14} /></IconBtn>
                  <DeleteButton onConfirm={async () => { try { await deleteTeam(m.id); toast.success('Removed'); list.reload() } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') } }} />
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer title={edit?.id ? 'Edit member' : 'Add member'} open={!!edit} onClose={() => setEdit(null)} busy={saving}
        footer={<><button type="button" onClick={() => setEdit(null)} disabled={saving} className="pill pill--sm">Cancel</button><button type="button" onClick={save} disabled={saving} className="pill pill--spark pill--sm">{saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save'}</button></>}>
        {edit && (<>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={err}><Input value={edit.v.name ?? ''} invalid={!!err} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Role"><Input value={edit.v.role ?? ''} onChange={(e) => set('role', e.target.value)} placeholder="Tech Lead" /></Field>
          </div>
          <ImageField label="Photo" value={edit.v.photo ?? ''} onChange={(v) => set('photo', v)} />
          <ImageField label="Fun photo (on hover)" value={edit.v.photoFun ?? ''} onChange={(v) => set('photoFun', v)} />
          <Toggle checked={!!edit.v.published} onChange={(v) => set('published', v)} label="Published" />
        </>)}
      </Drawer>
    </Panel>
  )
}
