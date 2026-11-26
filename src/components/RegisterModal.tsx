import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, X, CalendarPlus, Share2, ChevronDown, Loader2, AlertCircle, Plus, Trash2, Copy, ArrowLeft, Download } from 'lucide-react'
import { registerForEvent, isPaid, cleanUtr, UTR_RE, normPhone, PHONE_RE, type TSEvent } from '../lib/api'
import { useContent } from '../lib/content'
import { teamRange } from '../lib/status'
import { closeRegister, useRegisterTarget } from '../lib/registerStore'
import { setLocalReg, getLocalReg } from '../lib/registrations'
import { gsap, lockScroll, reducedMotion } from '../lib/motion'
import { downloadIcs, googleCalendarUrl, shareEvent } from '../lib/calendar'
import { formatDateShort } from '../lib/time'
import { CATEGORY_META, categoryKey } from '../lib/site'
import { notifyDataUpdated } from '../lib/supabase'
import { toast } from '../lib/toast'
import { flareSpark } from '../three/sparkState'

type Field = 'name' | 'email' | 'phone' | 'roll' | 'department' | 'year'
type Values = Record<Field, string>
const EMPTY: Values = { name: '', email: '', phone: '', roll: '', department: '', year: '' }
const FIELD_ORDER: Field[] = ['name', 'email', 'phone', 'roll', 'department', 'year']

/* Roll numbers: short college IDs (24CS014) or VTU USNs (4NK24CS014). */
const ROLL_RE = /^(\d{2}[A-Z]{2,4}\d{2,4}|\d[A-Z]{2}\d{2}[A-Z]{2,3}\d{3})$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {}
  if (v.name.trim().length < 2) e.name = 'Your full name, as on your ID'
  else if (!/^[\p{L} .'-]+$/u.test(v.name.trim())) e.name = 'Letters, spaces, dots and hyphens only'
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'That doesn’t look like an email yet'
  if (!PHONE_RE.test(normPhone(v.phone))) e.phone = v.phone.trim() ? 'A 10-digit mobile number, e.g. 98450 12345' : 'Your mobile number, so the club can reach you'
  if (!ROLL_RE.test(v.roll.trim().toUpperCase())) e.roll = 'Use your roll number, e.g. 24CS014 or 4NK24CS014'
  if (!v.department) e.department = 'Pick your department'
  if (!v.year) e.year = 'Pick your year'
  return e
}

/* teammates (team events): the leader is the main form; these are everyone else */
interface Mate { name: string; roll: string; department: string; year: string; phone: string }
const EMPTY_MATE: Mate = { name: '', roll: '', department: '', year: '', phone: '' }
type MateErrors = Partial<Record<keyof Mate, string>>

function validateTeam(teamName: string, mates: Mate[], leaderRoll: string): { team?: string; mates: MateErrors[] } {
  const out: { team?: string; mates: MateErrors[] } = { mates: mates.map(() => ({})) }
  if (teamName.trim().length < 2) out.team = 'Give your team a name'
  const seen = new Set([leaderRoll.trim().toUpperCase()].filter(Boolean))
  mates.forEach((m, i) => {
    const e = out.mates[i]
    if (m.name.trim().length < 2) e.name = 'Their full name'
    else if (!/^[\p{L} .'-]+$/u.test(m.name.trim())) e.name = 'Letters, spaces, dots and hyphens only'
    const roll = m.roll.trim().toUpperCase()
    if (!ROLL_RE.test(roll)) e.roll = 'Roll number, e.g. 24CS014'
    else if (seen.has(roll)) e.roll = 'Already used in this team'
    seen.add(roll)
    if (!m.department) e.department = 'Department'
    if (!m.year) e.year = 'Year'
    if (m.phone.trim() && !PHONE_RE.test(normPhone(m.phone))) e.phone = '10-digit mobile, or leave it empty'
  })
  return out
}

type Phase =
  | { kind: 'form' }
  | { kind: 'submitting' }
  | { kind: 'pay'; amount: number }
  | { kind: 'paying'; amount: number }
  | { kind: 'done'; status: 'Confirmed' | 'Waitlisted'; name: string; team?: string; utr?: string; amount?: number }
  | { kind: 'duplicate' }

export function RegisterModal() {
  const event = useRegisterTarget()
  return event ? <Sheet key={event.id} event={event} /> : null
}

/* A student mid-payment leaves for their UPI app; if the browser reloads the page meanwhile, this brings them back to the UTR box. */
interface PayDraft { eventId: string; at: number; values: Values; teamName: string; mates: Mate[]; utr: string }
const DRAFT = 'ts_pay_draft'
function readDraft(eventId: string): PayDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || 'null') as PayDraft | null
    return d && d.eventId === eventId && Date.now() - d.at < 3 * 3600_000 ? d : null
  } catch { return null }
}
const clearDraft = () => { try { localStorage.removeItem(DRAFT) } catch { /* ignore */ } }

function Sheet({ event }: { event: TSEvent }) {
  const [draft] = useState(() => (isPaid(event) ? readDraft(event.id) : null))
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const firstInput = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement)
  const [values, setValues] = useState<Values>(() => {
    if (draft) return { ...EMPTY, ...draft.values }
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem('ts_last_student') || '{}') } } catch { return EMPTY }
  })
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [phase, setPhase] = useState<Phase>(() => (getLocalReg(event.id) ? { kind: 'duplicate' } : draft ? { kind: 'pay', amount: event.entryFee } : { kind: 'form' }))
  const [serverError, setServerError] = useState('')
  const errors = useMemo(() => validate(values), [values])
  const { registration: opts } = useContent()
  const isTeam = event.registrationKind === 'team'
  const minMates = Math.max(0, event.teamMin - 1), maxMates = Math.max(minMates, event.teamMax - 1)
  const [teamName, setTeamName] = useState(draft?.teamName ?? '')
  const [mates, setMates] = useState<Mate[]>(() => draft?.mates?.map((m) => ({ ...EMPTY_MATE, ...m })) ?? Array.from({ length: minMates }, () => ({ ...EMPTY_MATE })))
  const [mateTouched, setMateTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const teamErrors = useMemo(() => (isTeam ? validateTeam(teamName, mates, values.roll) : { mates: [] as MateErrors[] }), [isTeam, teamName, mates, values.roll])
  const mateErr = (i: number, k: keyof Mate) => ((submitted || mateTouched[`${i}.${k}`]) && teamErrors.mates[i]?.[k]) || ''
  const setMate = (i: number, k: keyof Mate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = k === 'roll' ? e.target.value.toUpperCase().replace(/\s/g, '') : e.target.value
    setMates((list) => list.map((m, j) => (j === i ? { ...m, [k]: v } : m)))
    setServerError('')
  }
  const meta = CATEGORY_META[categoryKey(event.category)]
  const closing = useRef(false)

  const [utr, setUtr] = useState(draft?.utr ?? '')
  const paid = isPaid(event)

  useEffect(() => {
    if (phase.kind !== 'pay') return
    try { localStorage.setItem(DRAFT, JSON.stringify({ eventId: event.id, at: Date.now(), values, teamName, mates, utr } satisfies PayDraft)) } catch { /* ignore */ }
  }, [phase.kind, event.id, values, teamName, mates, utr])

  const close = () => {
    if (closing.current || phase.kind === 'submitting' || phase.kind === 'paying') return
    if (phase.kind === 'pay') {
      if (!confirm('Leave without finishing? If you already paid, stay and enter the UTR — your registration isn’t saved until you do.')) return
      clearDraft()
    }
    closing.current = true
    const done = () => { closeRegister(); returnFocus.current?.focus?.({ preventScroll: true }) }
    if (reducedMotion()) return done()
    gsap.to(panel.current, { yPercent: 8, autoAlpha: 0, duration: 0.45, ease: 'power3.in' })
    gsap.to(root.current, { autoAlpha: 0, duration: 0.5, delay: 0.1, onComplete: done })
  }

  // open: lock scroll, animate in, focus, Esc + focus trap
  useLayoutEffect(() => {
    lockScroll(true)
    if (!reducedMotion()) {
      gsap.fromTo(root.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' })
      gsap.fromTo(panel.current, { yPercent: 10, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', delay: 0.08 })
    }
    const t = setTimeout(() => (panel.current?.querySelector<HTMLElement>('input') ?? panel.current)?.focus({ preventScroll: true }), 120)
    return () => { clearTimeout(t); lockScroll(false) }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close() }
      if (e.key !== 'Tab' || !panel.current) return
      const f = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const update = (k: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = k === 'roll' ? e.target.value.toUpperCase().replace(/\s/g, '') : e.target.value
    setValues((s) => ({ ...s, [k]: v }))
    setServerError('')
  }
  const blur = (k: Field) => () => setTouched((t) => ({ ...t, [k]: true }))
  const show = (k: Field) => (touched[k] && errors[k]) || ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phase.kind === 'submitting') return
    setTouched({ name: true, email: true, phone: true, roll: true, department: true, year: true })
    setSubmitted(true)
    const teamBad = isTeam && (teamErrors.team || teamErrors.mates.some((m) => Object.keys(m).length))
    if (Object.keys(errors).length || teamBad) {
      const firstBad = isTeam && teamErrors.team ? 'team' : FIELD_ORDER.find((k) => errors[k])
      const target = firstBad ? panel.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`) : panel.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
      target?.focus()
      return
    }
    // paid events: this first call checks every detail without saving, so nobody pays and then hits a problem
    await send()
  }

  /** One trip to the database. Without a UTR on a paid event it only checks; with one it registers. */
  const send = async (withUtr?: string) => {
    const back: Phase = withUtr !== undefined ? { kind: 'pay', amount: event.entryFee } : { kind: 'form' }
    setPhase(withUtr !== undefined ? { kind: 'paying', amount: event.entryFee } : { kind: 'submitting' })
    setServerError('')
    try {
      const res = await registerForEvent({
        eventId: event.id, ...values,
        ...(isTeam ? { teamName: teamName.trim(), members: mates.map((m) => ({ name: m.name.trim(), roll: m.roll.trim().toUpperCase(), department: m.department, year: m.year, ...(m.phone.trim() ? { phone: normPhone(m.phone) } : {}) })) } : {}),
        ...(withUtr !== undefined ? { utr: withUtr } : {}),
      })
      if (res.success && res.status) {
        setLocalReg(event.id, { status: res.status, at: Date.now(), name: values.name.trim(), id: res.id })
        clearDraft()
        try { localStorage.setItem('ts_last_student', JSON.stringify(values)) } catch { /* ignore */ }
        notifyDataUpdated()
        if (res.status === 'Confirmed') flareSpark(1)
        setPhase({ kind: 'done', status: res.status, name: values.name.trim().split(' ')[0], team: isTeam ? teamName.trim() : undefined,
          ...(withUtr !== undefined ? { utr: cleanUtr(withUtr), amount: event.entryFee } : {}) })
        return
      }
      if (res.needs_payment) { setPhase({ kind: 'pay', amount: res.amount ?? event.entryFee }); return }
      const msg = res.error || res.message || 'Registration failed. Please try again.'
      if (/already registered/i.test(msg)) { setPhase({ kind: 'duplicate' }); return }
      if (res.full) { notifyDataUpdated(); clearDraft() }
      setServerError(msg)
      setPhase(res.full ? { kind: 'form' } : back)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Network error. Check your connection and try again.')
      setPhase(back)
      toast.error(withUtr !== undefined ? 'Couldn’t reach the server. Your UTR is still here — try again.' : 'Couldn’t reach the server. Your details are still here.')
    }
  }

  const busy = phase.kind === 'submitting' || phase.kind === 'paying'

  return (
    <div ref={root} className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center" role="presentation">
      {/* ref-03 material behind the sheet */}
      <button type="button" aria-label="Close registration" tabIndex={-1} onClick={close} className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[94svh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-[24px] border border-white/12 bg-[#0a0a0a] outline-none sm:rounded-[24px]"
      >
        <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-6 sm:px-8 sm:pt-8">
          <div className="min-w-0">
            <p className="t-meta">{meta.short} · {formatDateShort(event.date)}{event.time ? ` · ${event.time}` : ''}</p>
            <h2 id="reg-title" className="t-h1 mt-2 text-[clamp(32px,4vw,44px)]">{event.title}</h2>
            {event.location && <p className="mt-1 text-[14px] text-mute-hi">{event.location}</p>}
          </div>
          <button type="button" onClick={close} disabled={busy} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 text-mute-hi transition-colors hover:border-white hover:text-white disabled:opacity-30">
            <X size={16} />
          </button>
        </header>

        <div data-lenis-prevent className="overflow-y-auto overscroll-contain px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-8">
          {(phase.kind === 'form' || phase.kind === 'submitting') && (
            <form noValidate onSubmit={submit} className="space-y-3">
              {isTeam && (
                <>
                  <p className="rounded-2xl border border-white/12 px-4 py-3 text-[14px] text-frost/85">Team event · teams of {teamRange(event)} including you. One person registers the whole team.</p>
                  <TextField name="team" label="Team name" placeholder="e.g. The Codebreakers" autoComplete="off" value={teamName} onChange={(e) => { setTeamName(e.target.value); setServerError('') }} onBlur={() => setMateTouched((t) => ({ ...t, team: true }))} error={((submitted || mateTouched.team) && teamErrors.team) || ''} ok={!teamErrors.team} disabled={busy} />
                  <p className="pt-3 text-[13px] font-[500] text-mute-hi">You · team leader</p>
                </>
              )}
              <TextField ref={isTeam ? undefined : firstInput} name="name" label="Full name" placeholder="e.g. Rahul Sharma" autoComplete="name" value={values.name} onChange={update('name')} onBlur={blur('name')} error={show('name')} ok={!errors.name} disabled={busy} />
              <TextField name="email" type="email" label="Email (personal or college)" placeholder="name@gmail.com or student@college.edu" autoComplete="email" inputMode="email" value={values.email} onChange={update('email')} onBlur={blur('email')} error={show('email')} ok={!errors.email} disabled={busy} />
              <TextField name="phone" type="tel" label={isTeam ? 'Your mobile number' : 'Mobile number'} placeholder="98450 12345" autoComplete="tel-national" inputMode="tel" maxLength={16} value={values.phone} onChange={update('phone')} onBlur={blur('phone')} error={show('phone')} ok={!errors.phone} disabled={busy} />
              <TextField name="roll" label="Roll / Student ID" placeholder="24CS014" autoComplete="off" autoCapitalize="characters" value={values.roll} onChange={update('roll')} onBlur={blur('roll')} error={show('roll')} ok={!errors.roll} disabled={busy} />
              <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                <SelectField name="department" label="Department" options={opts.departments} value={values.department} onChange={update('department')} onBlur={blur('department')} error={show('department')} disabled={busy} />
                <SelectField name="year" label="Academic year" options={opts.years} value={values.year} onChange={update('year')} onBlur={blur('year')} error={show('year')} disabled={busy} />
              </div>

              {isTeam && (
                <div className="space-y-4 pt-3">
                  {mates.map((m, i) => (
                    <fieldset key={i} aria-label={`Teammate ${i + 2}`} className="space-y-3 rounded-2xl border border-white/10 p-3 sm:p-4">
                      <div className="flex min-h-7 items-center justify-between px-1">
                        <span aria-hidden className="text-[13px] font-[500] text-mute-hi">Teammate {i + 2}</span>
                        {mates.length > minMates && (
                          <button type="button" onClick={() => setMates((list) => list.filter((_, j) => j !== i))} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] text-mute-hi hover:bg-white/5 hover:text-white" aria-label={`Remove teammate ${i + 2}`}>
                            <Trash2 size={13} /> Remove
                          </button>
                        )}
                      </div>
                      <TextField name={`m${i}-name`} label="Full name" placeholder="Teammate’s name" autoComplete="off" value={m.name} onChange={setMate(i, 'name')} onBlur={() => setMateTouched((t) => ({ ...t, [`${i}.name`]: true }))} error={mateErr(i, 'name')} ok={!teamErrors.mates[i]?.name} disabled={busy} />
                      <TextField name={`m${i}-roll`} label="Roll / Student ID" placeholder="24CS015" autoComplete="off" autoCapitalize="characters" value={m.roll} onChange={setMate(i, 'roll')} onBlur={() => setMateTouched((t) => ({ ...t, [`${i}.roll`]: true }))} error={mateErr(i, 'roll')} ok={!teamErrors.mates[i]?.roll} disabled={busy} />
                      <TextField name={`m${i}-phone`} type="tel" label="Mobile (optional)" placeholder="98450 12345" autoComplete="off" inputMode="tel" maxLength={16} value={m.phone} onChange={setMate(i, 'phone')} onBlur={() => setMateTouched((t) => ({ ...t, [`${i}.phone`]: true }))} error={mateErr(i, 'phone')} ok={!!m.phone.trim() && !teamErrors.mates[i]?.phone} disabled={busy} />
                      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                        <SelectField name={`m${i}-department`} label="Department" options={opts.departments} value={m.department} onChange={setMate(i, 'department')} onBlur={() => setMateTouched((t) => ({ ...t, [`${i}.department`]: true }))} error={mateErr(i, 'department')} disabled={busy} />
                        <SelectField name={`m${i}-year`} label="Year" options={opts.years} value={m.year} onChange={setMate(i, 'year')} onBlur={() => setMateTouched((t) => ({ ...t, [`${i}.year`]: true }))} error={mateErr(i, 'year')} disabled={busy} />
                      </div>
                    </fieldset>
                  ))}
                  {mates.length < maxMates && (
                    <button type="button" onClick={() => setMates((list) => [...list, { ...EMPTY_MATE }])} disabled={busy} className="pill pill--sm w-full">
                      <Plus size={14} /> Add teammate ({mates.length + 1}/{event.teamMax} people)
                    </button>
                  )}
                </div>
              )}

              {serverError && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-[14px] text-frost">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-ember" /> {serverError}
                </p>
              )}

              <button type="submit" disabled={busy} aria-busy={busy} className="pill pill--solid relative mt-3 !h-[54px] w-full !text-[15px] disabled:!opacity-100">
                {busy ? <><Loader2 size={16} className="animate-spin" /> {paid ? 'Checking your details…' : isTeam ? 'Registering your team…' : 'Reserving your seat…'}</> : paid ? `Continue to payment · ₹${event.entryFee}` : isTeam ? `Register team (${mates.length + 1})` : 'Reserve my seat'}
                {busy && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] origin-left animate-[progress_1.6s_var(--ease-quart)_infinite] bg-black/50" />}
              </button>
              <p className="pt-1 text-center text-[12.5px] text-mute">{paid ? `Entry fee ₹${event.entryFee}${isTeam ? ' per team' : ''}, paid by UPI on the next step. ` : ''}{isTeam ? 'Each student can be on one team. Everyone brings their student ID.' : 'One registration per student. Bring your student ID.'}</p>
            </form>
          )}

          {(phase.kind === 'pay' || phase.kind === 'paying') && (
            <PayStep event={event} amount={phase.amount} isTeam={isTeam} utr={utr}
              onUtr={(v) => { setUtr(v); setServerError('') }} error={serverError} busy={busy}
              onBack={() => { setServerError(''); setPhase({ kind: 'form' }) }} onSubmit={() => send(utr)} />
          )}

          {phase.kind === 'done' && <Success event={event} status={phase.status} name={phase.name} team={phase.team} utr={phase.utr} amount={phase.amount} onClose={close} />}
          {phase.kind === 'duplicate' && <Duplicate event={event} onClose={close} onAgain={() => { setValues(EMPTY); setTouched({}); setTeamName(''); setMates(Array.from({ length: minMates }, () => ({ ...EMPTY_MATE }))); setSubmitted(false); setUtr(''); setPhase({ kind: 'form' }) }} />}
        </div>
      </div>
    </div>
  )
}

interface TextProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; ok?: boolean; ref?: React.Ref<HTMLInputElement> }
function TextField({ label, error, ok, name, value, ref, ...rest }: TextProps) {
  const id = `f-${name}`
  const filled = String(value ?? '').length > 0
  return (
    <div>
      <div className={`living ${error ? 'is-invalid' : ''}`}>
        <input ref={ref} id={id} name={name} value={value} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className="field-input pr-12" {...rest} />
        <label htmlFor={id} className="field-label">{label}</label>
        {filled && ok && !error && <Check aria-hidden size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-spark" />}
      </div>
      <FieldError id={`${id}-err`} msg={error} />
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label: string; options: string[]; error?: string }
function SelectField({ label, options, error, name, value, ...rest }: SelectProps) {
  const id = `f-${name}`
  return (
    <div>
      <div className={`living ${error ? 'is-invalid' : ''}`}>
        <select id={id} name={name} value={value} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className={`field-input field-select ${value ? 'has-value' : 'text-transparent'}`} {...rest}>
          <option value="" disabled hidden></option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <label htmlFor={id} className="field-label">{label}</label>
        <ChevronDown aria-hidden size={16} className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-mute-hi" />
      </div>
      <FieldError id={`${id}-err`} msg={error} />
    </div>
  )
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return (
    <div className={`grid transition-[grid-template-rows] duration-500 ease-[var(--ease-expo)] ${msg ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <p id={id} className="overflow-hidden px-5 text-[12.5px] text-ember" aria-live="polite">
        <span className="block pt-1.5">{msg}</span>
      </p>
    </div>
  )
}

/** The gradient condenses into a single point of light, and the confirmation unfolds from it. */
function Success({ event, status, name, team, utr, amount, onClose }: { event: TSEvent; status: 'Confirmed' | 'Waitlisted'; name: string; team?: string; utr?: string; amount?: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const confirmed = status === 'Confirmed'
  useLayoutEffect(() => {
    if (reducedMotion() || !ref.current) return
    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo('[data-orb]', { scale: 9, opacity: 0.0, filter: 'blur(30px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.1, ease: 'expo.inOut' })
        .fromTo('[data-unfold]', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.07, duration: 0.9, ease: 'expo.out' }, '-=0.35')
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <div ref={ref} className="pb-2 pt-4 text-center" role="status">
      <div className="relative mx-auto grid h-20 w-20 place-items-center">
        <span data-orb aria-hidden className="absolute inset-5 rounded-full bg-white" />
        <Check aria-hidden size={18} strokeWidth={3} className="relative text-void" data-unfold />
      </div>
      <p data-unfold className="t-meta mt-6">{confirmed ? (team ? 'Team registered' : 'Seat reserved') : 'On the waitlist'}</p>
      <h3 data-unfold className="t-h1 mt-3 text-[clamp(34px,4.8vw,50px)]">{team ? (confirmed ? `${team} is in.` : `Hang tight, ${team}.`) : confirmed ? `You’re in, ${name}.` : `Hang tight, ${name}.`}</h3>
      <p data-unfold className="t-body mx-auto mt-3 max-w-[40ch]">
        {utr ? 'Your UTR is saved with your registration; the club matches every payment against its UPI account. ' : ''}
        {confirmed
          ? team ? 'Your team’s spot is reserved. Everyone checks in at the entrance with their student ID.' : 'Your seat has been reserved. Check in at the entrance with your student ID.'
          : 'Event capacity is currently reached. If a seat opens up, you will be notified in order of registration.'}
      </p>

      <dl data-unfold className="mx-auto mt-7 grid max-w-[400px] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-left">
        {[['Date', formatDateShort(event.date)], ['Time', event.time || 'TBA'], ['Venue', event.location || 'TBA'], ['Status', status]].map(([k, v]) => (
          <div key={k} className="bg-ink px-4 py-3"><dt className="t-meta">{k}</dt><dd className="mt-1 text-[14px] text-frost">{v}</dd></div>
        ))}
        {utr && (
          <div className="col-span-2 bg-ink px-4 py-3"><dt className="t-meta">Paid ₹{amount} · UTR</dt><dd className="t-num mt-1 text-[14px] tracking-[0.04em] text-frost">{utr.replace(/(\d{4})(?=\d)/g, '$1 ')}</dd></div>
        )}
      </dl>

      <div data-unfold className="mt-7 grid gap-2 sm:grid-cols-2">
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="pill pill--sm"><CalendarPlus size={14} /> Google Calendar</a>
        <button type="button" onClick={() => downloadIcs(event)} className="pill pill--sm"><CalendarPlus size={14} /> Download .ics</button>
        <button type="button" onClick={() => shareEvent(event)} className="pill pill--sm sm:col-span-2"><Share2 size={14} /> Share with friends</button>
      </div>
      <button data-unfold type="button" onClick={onClose} className="pill pill--solid mt-4 w-full">Done</button>
    </div>
  )
}

function Duplicate({ event, onClose, onAgain }: { event: TSEvent; onClose: () => void; onAgain: () => void }) {
  return (
    <div className="pb-2 pt-6 text-center" role="status">
      <h3 className="t-h1 text-[clamp(32px,4.4vw,46px)]">You’re already on the list.</h3>
      <p className="t-body mx-auto mt-3 max-w-[40ch]">This roll number or email is already registered for {event.title}. No need to do it twice — just bring your student ID.</p>
      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="pill pill--sm"><CalendarPlus size={14} /> Add to calendar</a>
        <button type="button" onClick={() => shareEvent(event)} className="pill pill--sm"><Share2 size={14} /> Share event</button>
      </div>
      <button type="button" onClick={onClose} className="pill pill--solid mt-4 w-full">Got it</button>
      <button type="button" onClick={onAgain} className="mt-4 text-[13.5px] text-mute-hi underline decoration-line-strong underline-offset-4 transition-colors hover:text-frost">Registering a friend on this phone?</button>
    </div>
  )
}

/** Step two for paid events: the QR, the UPI ID, a one-tap UPI link on phones, and the UTR box. */
function PayStep({ event, amount, isTeam, utr, onUtr, error, busy, onBack, onSubmit }: {
  event: TSEvent; amount: number; isTeam: boolean; utr: string; onUtr: (v: string) => void
  error: string; busy: boolean; onBack: () => void; onSubmit: () => void
}) {
  const [touched, setTouched] = useState(false)
  const digits = cleanUtr(utr)
  const bad = !UTR_RE.test(digits)
  const fieldErr = touched && bad ? (digits.length === 0 ? 'Paste the 12-digit UTR from your payment' : `A UTR is 12 digits — this has ${digits.length}`) : ''
  const phone = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const copy = async () => {
    try { await navigator.clipboard.writeText(event.upiId); toast.success('UPI ID copied') } catch { toast.error('Couldn’t copy — long-press the UPI ID instead') }
  }
  const steps = phone
    ? [
        event.paymentQr ? 'Save the QR below (or long-press it → Download image).' : '',
        `Open GPay, PhonePe or Paytm → ${event.paymentQr ? 'Scan → pick the QR from your gallery, or ' : ''}pay to the UPI ID. Amount ₹${amount}.`,
        'Come back to this page and paste the 12-digit UTR.',
      ].filter(Boolean)
    : [`Scan the QR with any UPI app${event.upiId ? ', or pay to the UPI ID' : ''}. Amount ₹${amount}.`, 'Paste the 12-digit UTR from the payment below.']
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!bad) onSubmit() }} className="space-y-4">
      <button type="button" onClick={onBack} disabled={busy} className="inline-flex items-center gap-1.5 text-[13.5px] text-mute-hi transition-colors hover:text-frost disabled:opacity-40">
        <ArrowLeft size={14} /> Edit details
      </button>

      <div className="rounded-2xl border border-white/12 p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="t-meta">Step 2 of 2 · Pay the entry fee</p>
          <p className="t-num text-[28px] font-[600] leading-none text-frost">₹{amount}</p>
        </div>
        <p className="mt-1.5 text-[13.5px] text-mute-hi">{isTeam ? 'One payment for the whole team.' : 'One payment per student.'} Your details are checked — your spot is saved once you enter the UTR.</p>

        <ol className="mt-4 space-y-2 text-[14px] text-frost/90">
          {steps.map((t, i) => (
            <li key={i} className="flex gap-3"><span className="t-num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[12px] text-frost">{i + 1}</span><span className="pt-0.5">{t}</span></li>
          ))}
        </ol>

        {event.paymentQr && (
          <div className="mt-4 flex flex-col items-center">
            <img src={event.paymentQr} alt={`UPI QR code to pay ₹${amount}${event.upiName ? ` to ${event.upiName}` : ''}`} className="w-full max-w-[240px] rounded-xl bg-white" />
            <a href={event.paymentQr} download={`${event.slug}-upi-qr.webp`} className={phone ? 'pill pill--spark mt-3 w-full' : 'mt-2 inline-flex items-center gap-1.5 text-[13px] text-mute-hi underline decoration-line-strong underline-offset-4 hover:text-frost'}>
              <Download size={phone ? 15 : 13} /> Save QR{phone ? ' to phone' : ' image'}
            </a>
          </div>
        )}

        {event.upiId && (
          <div className="mt-3 rounded-xl bg-white/[0.04] px-4 py-3">
            <p className="t-meta">{phone && event.paymentQr ? 'Or pay to UPI ID' : 'UPI ID'}{event.upiName ? ` · ${event.upiName}` : ''}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 sm:gap-3">
              <p className="min-w-0 select-all text-[13.5px] text-frost [overflow-wrap:anywhere] sm:text-[14px]">{event.upiId}</p>
              <button type="button" onClick={copy} aria-label="Copy UPI ID" className="pill pill--sm shrink-0 max-sm:!w-9 max-sm:!px-0"><Copy size={13} /><span className="max-sm:hidden">Copy</span></button>
            </div>
          </div>
        )}
        {event.paymentNote && <p className="mt-3 text-[13.5px] text-frost/85">{event.paymentNote}</p>}
      </div>

      <TextField name="utr" label="12-digit UTR / UPI reference no." placeholder="e.g. 4321 5678 9012" autoComplete="off" inputMode="numeric"
        value={utr} onChange={(e) => onUtr(e.target.value.replace(/[^\d\s]/g, '').slice(0, 16))} onBlur={() => setTouched(true)}
        error={fieldErr} ok={!bad} disabled={busy} />
      <p className="-mt-2 px-1 text-[12.5px] text-mute">After paying, open the payment in your UPI app’s history — it’s listed as UTR, UPI Ref No. or UPI transaction ID.</p>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-[14px] text-frost">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-ember" /> {error}
        </p>
      )}

      <button type="submit" disabled={busy} aria-busy={busy} className="pill pill--solid relative !h-[54px] w-full !text-[15px] disabled:!opacity-100">
        {busy ? <><Loader2 size={16} className="animate-spin" /> Confirming…</> : isTeam ? 'I’ve paid — register my team' : 'I’ve paid — confirm my seat'}
      </button>
    </form>
  )
}
