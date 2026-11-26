import { useCallback, useMemo, useState } from 'react'
import { Download, Search, Loader2, Plus, ArrowUpDown, ChevronDown, Check, Mail } from 'lucide-react'
import { useContent } from '../lib/content'
import { addRegistration, deleteRegistration, listEvents, listRegistrations, sendPaymentEmail, setPaymentVerified, setRegistrationStatus } from './adminApi'
import { useList } from './useList'
import { Badge, DeleteButton, Drawer, Field, Input, Panel, Select, TableState } from './ui'
import { cleanUtr, isPaid, UTR_RE, type Registration, type TSEvent } from '../lib/api'
import { toast } from '../lib/toast'

export function RegistrationsTab() {
  const list = useList(useCallback(listRegistrations, []))
  const [event, setEvent] = useState('All events')
  const [status, setStatus] = useState('All statuses')
  const [dept, setDept] = useState('All departments')
  const [pay, setPay] = useState('All payments')
  const [q, setQ] = useState('')
  const [exporting, setExporting] = useState(false)
  const events = useList(useCallback(listEvents, []))
  const [adding, setAdding] = useState(false)

  const eventNames = useMemo(() => ['All events', ...new Set(list.data.map((r) => r.eventTitle))], [list.data])
  const depts = useMemo(() => ['All departments', ...new Set(list.data.map((r) => r.department))], [list.data])
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    return list.data.filter((r) =>
      (event === 'All events' || r.eventTitle === event) &&
      (status === 'All statuses' || r.status === status) &&
      (dept === 'All departments' || r.department === dept) &&
      (pay === 'All payments' || (pay === 'UTR not checked' ? !!r.paymentUtr && !r.paymentVerified : pay === 'UTR checked' ? !!r.paymentUtr && r.paymentVerified : !r.paymentUtr)) &&
      (!n || [r.studentName, r.studentEmail, r.studentRoll, r.teamName, r.paymentUtr, ...r.teamMembers.flatMap((m) => [m.name, m.roll])].join(' ').toLowerCase().includes(n)))
  }, [list.data, event, status, dept, pay, q])
  const unchecked = useMemo(() => list.data.filter((r) => r.paymentUtr && !r.paymentVerified).length, [list.data])
  const [mailing, setMailing] = useState<string | null>(null)
  /** Email the student; on "Mark checked" this runs right after, and the Send/Resend button calls it directly. */
  const email = async (r: Registration, resend: boolean, checkedFirst = false) => {
    setMailing(r.id)
    const res = await sendPaymentEmail(r.id, resend)
    setMailing(null)
    if (res.sent) toast.success(`${checkedFirst ? 'Payment checked — ' : ''}confirmation emailed to ${res.to ?? r.studentEmail}`)
    else if (res.code === 'already_sent') toast.success(checkedFirst ? 'Payment checked (they were already emailed)' : 'Already emailed')
    else toast.error(checkedFirst ? `Payment checked, but the email wasn’t sent: ${res.error}` : res.error || 'Email failed')
    list.reload()
  }
  const verify = async (r: Registration) => {
    const wasChecked = r.paymentVerified, wasEmailed = !!r.confirmationSentAt // read before the update changes anything
    try { await setPaymentVerified(r.id, !wasChecked) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); return }
    if (wasChecked) { toast.success('Marked as not checked'); list.reload(); return }
    if (wasEmailed) { toast.success('Payment marked as checked'); list.reload(); return }
    await email(r, false, true)
  }

  const exportXlsx = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx') // loaded only when someone exports
      // one row per person: team members get their own rows, grouped under their team
      let n = 0
      const people = rows.flatMap((r) => {
        const base = { Event: r.eventTitle, Team: r.teamName || '—', Status: r.status, 'Registered at': new Date(r.createdAt).toLocaleString('en-IN'),
          Paid: r.paymentAmount != null ? r.paymentAmount : '', UTR: r.paymentUtr, 'UTR checked': r.paymentUtr ? (r.paymentVerified ? (r.confirmationSentAt ? 'Yes · emailed' : 'Yes') : 'No') : '' }
        const lead = { '#': ++n, ...base, Role: r.teamName ? 'Leader' : 'Individual', Name: r.studentName, Email: r.studentEmail, Roll: r.studentRoll, Department: r.department, Year: r.year }
        return [lead, ...r.teamMembers.map((m) => ({ '#': ++n, ...base, Role: 'Member', Name: m.name, Email: m.email || '', Roll: m.roll, Department: m.department || '', Year: m.year || '' }))]
      })
      const anyPaid = rows.some((r) => r.paymentUtr)
      const sheet = XLSX.utils.json_to_sheet(people.map(({ '#': num, Event, Team, Role, Name, Email, Roll, Department, Year, Status, 'Registered at': at, Paid, UTR, 'UTR checked': checked }) => ({
        '#': num, Event, Team, Role, Name, Email, Roll, Department, Year, Status, ...(anyPaid ? { 'Paid (₹)': Paid, UTR, 'UTR checked': checked } : {}), 'Registered at': at })))
      sheet['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 20 }, { wch: 11 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, ...(anyPaid ? [{ wch: 9 }, { wch: 15 }, { wch: 12 }] : []), { wch: 20 }]
      const book = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(book, sheet, 'Registrations')
      const tag = event === 'All events' ? 'all-events' : event.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
      XLSX.writeFile(book, `techspark-registrations-${tag}-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success(`Exported ${people.length} ${people.length === 1 ? 'person' : 'people'} from ${rows.length} registration${rows.length === 1 ? '' : 's'}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Export failed') } finally { setExporting(false) }
  }

  return (
    <Panel title="Student registrations" count={rows.length}
      action={<div className="flex gap-2">
        <button type="button" onClick={() => setAdding(true)} className="pill pill--sm"><Plus size={14} /> Add</button>
        <button type="button" onClick={exportXlsx} disabled={!rows.length || exporting} className="pill pill--sm">{exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export .xlsx</button>
      </div>}>
      {unchecked > 0 && pay !== 'UTR not checked' && (
        <button type="button" onClick={() => setPay('UTR not checked')} className="flex w-full items-center justify-between gap-3 border-b border-line bg-spark/[0.07] px-5 py-3 text-left text-[13.5px] text-frost hover:bg-spark/[0.11]">
          <span>{unchecked} payment{unchecked === 1 ? '' : 's'} waiting to be checked against the UPI account</span><span className="text-spark">Show them →</span>
        </button>
      )}
      <div className="grid gap-3 border-b border-line px-5 py-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <label className="relative"><span className="sr-only">Search students</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or roll" className="pl-9" /></label>
        <label><span className="sr-only">Event</span><Select options={eventNames} value={event} onChange={(e) => setEvent(e.target.value)} /></label>
        <label><span className="sr-only">Status</span><Select options={['All statuses', 'Confirmed', 'Waitlisted']} value={status} onChange={(e) => setStatus(e.target.value)} /></label>
        <label><span className="sr-only">Department</span><Select options={depts} value={dept} onChange={(e) => setDept(e.target.value)} /></label>
        <label><span className="sr-only">Payment</span><Select options={['All payments', 'UTR not checked', 'UTR checked', 'No payment']} value={pay} onChange={(e) => setPay(e.target.value)} /></label>
      </div>
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[1020px] text-left text-[14px]">
          <thead className="border-b border-line text-[11.5px] font-[600] uppercase tracking-[0.06em] text-mute-hi">
            <tr><th className="px-5 py-3">Student / team</th><th className="px-3 py-3">Roll</th><th className="px-3 py-3">Event</th><th className="px-3 py-3">Dept · Year</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Payment</th><th className="px-5 py-3 text-right">When</th><th className="px-3 py-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            <TableState status={list.status} error={list.error} onRetry={list.reload} empty={list.status === 'success' && !rows.length} colSpan={8} />
            {list.status === 'success' && rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3">
                  {r.teamName && <p className="mb-0.5 text-[12px] font-[600] text-spark">{r.teamName} · {r.teamMembers.length + 1} people</p>}
                  <p className="font-[560] text-frost">{r.studentName}{r.teamName && <span className="ml-1.5 text-[12px] font-[400] text-mute">(leader)</span>}</p>
                  <p className="text-[12.5px] text-mute">{r.studentEmail}</p>
                  {r.teamMembers.length > 0 && (
                    <details className="mt-1.5 text-[13px]">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-mute-hi hover:text-frost">Members <ChevronDown size={12} /></summary>
                      <ul className="mt-1.5 space-y-0.5 text-mute-hi">
                        {r.teamMembers.map((m) => <li key={m.roll}><span className="text-frost/90">{m.name}</span> · {m.roll}{m.department ? ` · ${m.department}` : ''}{m.year ? ` · ${m.year}` : ''}</li>)}
                      </ul>
                    </details>
                  )}
                </td>
                <td className="t-num px-3 py-3 text-frost/85">{r.studentRoll}</td>
                <td className="max-w-[220px] truncate px-3 py-3 text-frost/85">{r.eventTitle}</td>
                <td className="px-3 py-3 text-[13px] text-mute-hi">{r.department}<br />{r.year}</td>
                <td className="px-3 py-3">
                  <button type="button" title={r.status === 'Confirmed' ? 'Move to waitlist' : 'Confirm seat'} className="inline-flex items-center gap-1.5"
                    onClick={async () => { try { await setRegistrationStatus(r.id, r.status === 'Confirmed' ? 'Waitlisted' : 'Confirmed'); toast.success(r.status === 'Confirmed' ? 'Moved to waitlist' : 'Seat confirmed'); list.reload() } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') } }}>
                    <Badge on={r.status === 'Confirmed'}>{r.status}</Badge><ArrowUpDown size={12} className="text-mute" aria-hidden />
                  </button>
                </td>
                <td className="px-3 py-3">
                  {r.paymentUtr ? (
                    <div className="space-y-1">
                      <p className="text-[13px] text-frost">₹{r.paymentAmount ?? '—'}</p>
                      <p className="t-num select-all text-[12.5px] tracking-[0.03em] text-mute-hi" title="UTR — match it in the UPI app's history">{r.paymentUtr}</p>
                      <button type="button" onClick={() => verify(r)} aria-pressed={r.paymentVerified} disabled={mailing === r.id}
                        title={r.paymentVerified ? 'Click to mark as not checked' : 'Matches the UPI account? Mark it checked — this emails the student a confirmation'}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-[560] transition-colors disabled:opacity-60 ${r.paymentVerified ? 'border-spark/50 bg-spark/15 text-spark' : 'border-line-strong text-mute-hi hover:border-white/40 hover:text-frost'}`}>
                        {mailing === r.id ? <><Loader2 size={11} className="animate-spin" /> Emailing…</> : r.paymentVerified ? <><Check size={11} /> Checked</> : 'Mark checked'}
                      </button>
                      {r.paymentVerified && mailing !== r.id && (
                        <p className="flex items-center gap-1.5 text-[11.5px] text-mute-hi">
                          {r.confirmationSentAt
                            ? <><Mail size={11} aria-hidden /> <span title={new Date(r.confirmationSentAt).toLocaleString('en-IN')}>Emailed {new Date(r.confirmationSentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span> · <button type="button" onClick={() => email(r, true)} className="underline decoration-line-strong underline-offset-2 hover:text-frost">Resend</button></>
                            : <><span className="text-amber">Not emailed</span> · <button type="button" onClick={() => email(r, false)} className="underline decoration-line-strong underline-offset-2 hover:text-frost">Send email</button></>}
                        </p>
                      )}
                    </div>
                  ) : <span className="text-[13px] text-mute">—</span>}
                </td>
                <td className="t-num px-5 py-3 text-right text-[13px] text-mute-hi">{new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-3 py-3"><DeleteButton label="Remove" onConfirm={async () => { try { await deleteRegistration(r.id); toast.success('Registration removed — their phone shows Register again. Waitlist promoted if anyone was waiting.'); list.reload() } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') } }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddRegistration open={adding} events={events.data} onClose={() => setAdding(false)} onDone={() => { setAdding(false); list.reload() }} />
    </Panel>
  )
}


function AddRegistration({ open, events, onClose, onDone }: { open: boolean; events: TSEvent[]; onClose: () => void; onDone: () => void }) {
  const { registration: { departments: DEPTS, years: YEARS } } = useContent()
  const [v, setV] = useState({ eventId: '', studentName: '', studentEmail: '', studentRoll: '', department: DEPTS[0], year: YEARS[0], status: 'Confirmed' as 'Confirmed' | 'Waitlisted', teamName: '', utr: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }))
  const save = async () => {
    const ev = events.find((e) => e.id === v.eventId)
    if (!ev || !v.studentName.trim() || !/@/.test(v.studentEmail) || !v.studentRoll.trim()) { setErr('Pick an event and fill name, email and roll.'); return }
    const utr = cleanUtr(v.utr)
    if (utr && !UTR_RE.test(utr)) { setErr('A UTR is exactly 12 digits (or leave it empty).'); return }
    setBusy(true); setErr('')
    const { utr: _u, ...rest } = v; void _u
    try {
      await addRegistration({ ...rest, eventTitle: ev.title, teamMembers: [], paymentUtr: utr, paymentAmount: utr ? ev.entryFee || null : null, paymentVerified: false, confirmationSentAt: null })
      toast.success('Registration added'); onDone()
    }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) }
  }
  return (
    <Drawer title="Add a registration" open={open} onClose={onClose} busy={busy}
      footer={<><button type="button" onClick={onClose} disabled={busy} className="pill pill--sm">Cancel</button><button type="button" onClick={save} disabled={busy} className="pill pill--solid pill--sm">{busy ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Add registration'}</button></>}>
      <Field label="Event">
        <select value={v.eventId} onChange={set('eventId')} className="h-11 w-full cursor-pointer rounded-xl border border-line-strong bg-void/60 px-3.5 text-[15px] text-frost outline-none focus:border-spark/70">
          <option value="" className="bg-ink">Choose an event…</option>
          {events.map((e) => <option key={e.id} value={e.id} className="bg-ink">{e.title}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input value={v.studentName} onChange={set('studentName')} /></Field>
        <Field label="Roll / Student ID"><Input value={v.studentRoll} onChange={set('studentRoll')} /></Field>
      </div>
      <Field label="Email"><Input type="email" value={v.studentEmail} onChange={set('studentEmail')} /></Field>
      {events.find((e) => e.id === v.eventId)?.registrationKind === 'team' && (
        <Field label="Team name" hint="adds this student as a one-person team entry; add teammates by registering through the site"><Input value={v.teamName} onChange={set('teamName')} /></Field>
      )}
      {(() => { const ev = events.find((e) => e.id === v.eventId); return ev && isPaid(ev) ? (
        <Field label="UTR" hint={`optional · ₹${ev.entryFee} event`}><Input value={v.utr} onChange={set('utr')} inputMode="numeric" placeholder="12-digit UPI reference" /></Field>
      ) : null })()}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Department"><Select options={DEPTS} value={v.department} onChange={set('department')} /></Field>
        <Field label="Year"><Select options={YEARS} value={v.year} onChange={set('year')} /></Field>
        <Field label="Status"><Select options={['Confirmed', 'Waitlisted']} value={v.status} onChange={set('status')} /></Field>
      </div>
      {err && <p role="alert" className="text-[13.5px] text-ember">{err}</p>}
    </Drawer>
  )
}
