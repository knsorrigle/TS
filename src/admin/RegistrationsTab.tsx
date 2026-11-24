import { useCallback, useMemo, useState } from 'react'
import { Download, Search, Loader2 } from 'lucide-react'
import { deleteRegistration, listRegistrations } from './adminApi'
import { useList } from './useList'
import { Badge, DeleteButton, Input, Panel, Select, TableState } from './ui'
import { toast } from '../lib/toast'

export function RegistrationsTab() {
  const list = useList(useCallback(listRegistrations, []))
  const [event, setEvent] = useState('All events')
  const [status, setStatus] = useState('All statuses')
  const [dept, setDept] = useState('All departments')
  const [q, setQ] = useState('')
  const [exporting, setExporting] = useState(false)

  const events = useMemo(() => ['All events', ...new Set(list.data.map((r) => r.eventTitle))], [list.data])
  const depts = useMemo(() => ['All departments', ...new Set(list.data.map((r) => r.department))], [list.data])
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    return list.data.filter((r) =>
      (event === 'All events' || r.eventTitle === event) &&
      (status === 'All statuses' || r.status === status) &&
      (dept === 'All departments' || r.department === dept) &&
      (!n || [r.studentName, r.studentEmail, r.studentRoll].join(' ').toLowerCase().includes(n)))
  }, [list.data, event, status, dept, q])

  const exportXlsx = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx') // loaded only when someone exports
      const sheet = XLSX.utils.json_to_sheet(rows.map((r, i) => ({
        '#': i + 1, Event: r.eventTitle, Name: r.studentName, Email: r.studentEmail, Roll: r.studentRoll,
        Department: r.department, Year: r.year, Status: r.status, 'Registered at': new Date(r.createdAt).toLocaleString('en-IN'),
      })))
      sheet['!cols'] = [{ wch: 4 }, { wch: 34 }, { wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 22 }]
      const book = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(book, sheet, 'Registrations')
      const tag = event === 'All events' ? 'all-events' : event.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
      XLSX.writeFile(book, `techspark-registrations-${tag}-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success(`Exported ${rows.length} registration${rows.length === 1 ? '' : 's'}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Export failed') } finally { setExporting(false) }
  }

  return (
    <Panel title="Student registrations" count={rows.length}
      action={<button type="button" onClick={exportXlsx} disabled={!rows.length || exporting} className="pill pill--sm">{exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export .xlsx</button>}>
      <div className="grid gap-3 border-b border-line px-5 py-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <label className="relative"><span className="sr-only">Search students</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or roll" className="pl-9" /></label>
        <label><span className="sr-only">Event</span><Select options={events} value={event} onChange={(e) => setEvent(e.target.value)} /></label>
        <label><span className="sr-only">Status</span><Select options={['All statuses', 'Confirmed', 'Waitlisted']} value={status} onChange={(e) => setStatus(e.target.value)} /></label>
        <label><span className="sr-only">Department</span><Select options={depts} value={dept} onChange={(e) => setDept(e.target.value)} /></label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[14px]">
          <thead className="border-b border-line text-[11.5px] font-[600] uppercase tracking-[0.06em] text-mute-hi">
            <tr><th className="px-5 py-3">Student</th><th className="px-3 py-3">Roll</th><th className="px-3 py-3">Event</th><th className="px-3 py-3">Dept · Year</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right">When</th><th className="px-3 py-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            <TableState status={list.status} error={list.error} onRetry={list.reload} empty={list.status === 'success' && !rows.length} colSpan={7} />
            {list.status === 'success' && rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3"><p className="font-[560] text-frost">{r.studentName}</p><p className="text-[12.5px] text-mute">{r.studentEmail}</p></td>
                <td className="t-num px-3 py-3 text-frost/85">{r.studentRoll}</td>
                <td className="max-w-[220px] truncate px-3 py-3 text-frost/85">{r.eventTitle}</td>
                <td className="px-3 py-3 text-[13px] text-mute-hi">{r.department}<br />{r.year}</td>
                <td className="px-3 py-3"><Badge on={r.status === 'Confirmed'}>{r.status}</Badge></td>
                <td className="t-num px-5 py-3 text-right text-[13px] text-mute-hi">{new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-3 py-3"><DeleteButton label="Remove" onConfirm={async () => { try { await deleteRegistration(r.id); toast.success('Registration removed. Waitlist promoted if anyone was waiting.'); list.reload() } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') } }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
