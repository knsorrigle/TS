import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, X, CalendarPlus, Share2, ChevronDown, Loader2, AlertCircle } from 'lucide-react'
import { registerForEvent, type TSEvent } from '../lib/api'
import { closeRegister, useRegisterTarget } from '../lib/registerStore'
import { setLocalReg, getLocalReg } from '../lib/registrations'
import { gsap, lockScroll, reducedMotion } from '../lib/motion'
import { downloadIcs, googleCalendarUrl, shareEvent } from '../lib/calendar'
import { formatDateShort } from '../lib/time'
import { CATEGORY_META, categoryKey } from '../lib/site'
import { notifyDataUpdated } from '../lib/supabase'
import { toast } from '../lib/toast'
import { flareSpark } from '../three/sparkState'

const DEPARTMENTS = ['Computer Science & Engineering', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical', 'Other']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

type Field = 'name' | 'email' | 'roll' | 'department' | 'year'
type Values = Record<Field, string>
const EMPTY: Values = { name: '', email: '', roll: '', department: '', year: '' }

/* Roll numbers: short college IDs (24CS014) or VTU USNs (4NK24CS014). */
const ROLL_RE = /^(\d{2}[A-Z]{2,4}\d{2,4}|\d[A-Z]{2}\d{2}[A-Z]{2,3}\d{3})$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {}
  if (v.name.trim().length < 2) e.name = 'Your full name, as on your ID'
  else if (!/^[\p{L} .'-]+$/u.test(v.name.trim())) e.name = 'Letters, spaces, dots and hyphens only'
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'That doesn’t look like an email yet'
  if (!ROLL_RE.test(v.roll.trim().toUpperCase())) e.roll = 'Use your roll number, e.g. 24CS014 or 4NK24CS014'
  if (!v.department) e.department = 'Pick your department'
  if (!v.year) e.year = 'Pick your year'
  return e
}

type Phase =
  | { kind: 'form' }
  | { kind: 'submitting' }
  | { kind: 'done'; status: 'Confirmed' | 'Waitlisted'; name: string }
  | { kind: 'duplicate' }

export function RegisterModal() {
  const event = useRegisterTarget()
  return event ? <Sheet key={event.id} event={event} /> : null
}

function Sheet({ event }: { event: TSEvent }) {
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const firstInput = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement)
  const [values, setValues] = useState<Values>(() => {
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem('ts_last_student') || '{}') } } catch { return EMPTY }
  })
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [phase, setPhase] = useState<Phase>(() => (getLocalReg(event.id) ? { kind: 'duplicate' } : { kind: 'form' }))
  const [serverError, setServerError] = useState('')
  const errors = useMemo(() => validate(values), [values])
  const meta = CATEGORY_META[categoryKey(event.category)]
  const closing = useRef(false)

  const close = () => {
    if (closing.current || phase.kind === 'submitting') return
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
    const t = setTimeout(() => (firstInput.current ?? panel.current)?.focus({ preventScroll: true }), 120)
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
    setTouched({ name: true, email: true, roll: true, department: true, year: true })
    if (Object.keys(errors).length) {
      const firstBad = (['name', 'email', 'roll', 'department', 'year'] as Field[]).find((k) => errors[k])
      panel.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus()
      return
    }
    setPhase({ kind: 'submitting' })
    setServerError('')
    try {
      const res = await registerForEvent({ eventId: event.id, ...values })
      if (res.success && res.status) {
        setLocalReg(event.id, { status: res.status, at: Date.now(), name: values.name.trim() })
        try { localStorage.setItem('ts_last_student', JSON.stringify(values)) } catch { /* ignore */ }
        notifyDataUpdated()
        if (res.status === 'Confirmed') flareSpark(1)
        setPhase({ kind: 'done', status: res.status, name: values.name.trim().split(' ')[0] })
        return
      }
      const msg = res.error || res.message || 'Registration failed. Please try again.'
      if (/already|duplicate|exists/i.test(msg)) {
        setLocalReg(event.id, { status: 'Confirmed', at: Date.now(), name: values.name.trim() })
        setPhase({ kind: 'duplicate' })
        return
      }
      setServerError(msg)
      setPhase({ kind: 'form' })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Network error. Check your connection and try again.')
      setPhase({ kind: 'form' })
      toast.error('Couldn’t reach the server. Your details are still here.')
    }
  }

  const busy = phase.kind === 'submitting'

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

        <div className="overflow-y-auto overscroll-contain px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-8">
          {(phase.kind === 'form' || phase.kind === 'submitting') && (
            <form noValidate onSubmit={submit} className="space-y-3">
              <TextField ref={firstInput} name="name" label="Full name" placeholder="e.g. Rahul Sharma" autoComplete="name" value={values.name} onChange={update('name')} onBlur={blur('name')} error={show('name')} ok={!errors.name} disabled={busy} />
              <TextField name="email" type="email" label="Email (personal or college)" placeholder="name@gmail.com or student@college.edu" autoComplete="email" inputMode="email" value={values.email} onChange={update('email')} onBlur={blur('email')} error={show('email')} ok={!errors.email} disabled={busy} />
              <TextField name="roll" label="Roll / Student ID" placeholder="24CS014" autoComplete="off" autoCapitalize="characters" value={values.roll} onChange={update('roll')} onBlur={blur('roll')} error={show('roll')} ok={!errors.roll} disabled={busy} />
              <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                <SelectField name="department" label="Department" options={DEPARTMENTS} value={values.department} onChange={update('department')} onBlur={blur('department')} error={show('department')} disabled={busy} />
                <SelectField name="year" label="Academic year" options={YEARS} value={values.year} onChange={update('year')} onBlur={blur('year')} error={show('year')} disabled={busy} />
              </div>

              {serverError && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-[14px] text-frost">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-ember" /> {serverError}
                </p>
              )}

              <button type="submit" disabled={busy} aria-busy={busy} className="pill pill--solid relative mt-3 !h-[54px] w-full !text-[15px] disabled:!opacity-100">
                {busy ? <><Loader2 size={16} className="animate-spin" /> Reserving your seat…</> : 'Reserve my seat'}
                {busy && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] origin-left animate-[progress_1.6s_var(--ease-quart)_infinite] bg-black/50" />}
              </button>
              <p className="pt-1 text-center text-[12.5px] text-mute">One registration per student. Bring your student ID.</p>
            </form>
          )}

          {phase.kind === 'done' && <Success event={event} status={phase.status} name={phase.name} onClose={close} />}
          {phase.kind === 'duplicate' && <Duplicate event={event} onClose={close} onAgain={() => { setValues(EMPTY); setTouched({}); setPhase({ kind: 'form' }) }} />}
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
function Success({ event, status, name, onClose }: { event: TSEvent; status: 'Confirmed' | 'Waitlisted'; name: string; onClose: () => void }) {
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
      <p data-unfold className="t-meta mt-6">{confirmed ? 'Seat reserved' : 'On the waitlist'}</p>
      <h3 data-unfold className="t-h1 mt-3 text-[clamp(34px,4.8vw,50px)]">{confirmed ? `You’re in, ${name}.` : `Hang tight, ${name}.`}</h3>
      <p data-unfold className="t-body mx-auto mt-3 max-w-[40ch]">
        {confirmed
          ? 'Your seat has been reserved. Check in at the entrance with your student ID.'
          : 'Event capacity is currently reached. If a seat opens up, you will be notified in order of registration.'}
      </p>

      <dl data-unfold className="mx-auto mt-7 grid max-w-[400px] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-left">
        {[['Date', formatDateShort(event.date)], ['Time', event.time || 'TBA'], ['Venue', event.location || 'TBA'], ['Status', status]].map(([k, v]) => (
          <div key={k} className="bg-ink px-4 py-3"><dt className="t-meta">{k}</dt><dd className="mt-1 text-[14px] text-frost">{v}</dd></div>
        ))}
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
