import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Eye, EyeOff, Loader2, LogOut, ShieldAlert, ArrowLeft, CalendarDays, Megaphone, Images, Users, Database, UserRound, Type } from 'lucide-react'
import { isDemo, signIn, signOut, watchAdmin, type AdminState } from './adminApi'
import { isSupabaseConfigured } from '../lib/supabase'
import { EventsTab } from './EventsTab'
import { BulletinsTab } from './BulletinsTab'
import { PastTab } from './PastTab'
import { RegistrationsTab } from './RegistrationsTab'
import { TeamTab } from './TeamTab'
import { ContentTab } from './ContentTab'
import { SchemaTab } from './SchemaTab'
import { Field, Input } from './ui'

const TABS = [
  { id: 'events', label: 'Events & Sessions', icon: CalendarDays, el: EventsTab },
  { id: 'content', label: 'Site content', icon: Type, el: ContentTab },
  { id: 'bulletins', label: 'Bulletins & News', icon: Megaphone, el: BulletinsTab },
  { id: 'gallery', label: 'Past Event Gallery', icon: Images, el: PastTab },
  { id: 'team', label: 'Team', icon: UserRound, el: TeamTab },
  { id: 'registrations', label: 'Student Registrations', icon: Users, el: RegistrationsTab },
  { id: 'schema', label: 'Database & Schema', icon: Database, el: SchemaTab },
] as const

export default function AdminApp() {
  const [state, setState] = useState<AdminState>({ kind: 'loading' })
  useEffect(() => {
    document.title = 'Admin — TECHSPARK'
    if (!isSupabaseConfigured && !isDemo) { setState({ kind: 'signed-out' }); return }
    return watchAdmin(setState)
  }, [])

  return (
    <div className="min-h-[100svh] bg-void px-[var(--gutter)] pb-20 pt-[calc(var(--nav-h)+28px)]">
      {state.kind === 'loading' && <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-spark" aria-label="Checking your session" /></div>}
      {(state.kind === 'signed-out' || state.kind === 'denied' || state.kind === 'elsewhere') && <Login denied={state.kind === 'denied'} elsewhere={state.kind === 'elsewhere'} />}
      {state.kind === 'admin' && <Dashboard email={state.email} role={state.role} />}
    </div>
  )
}

function Login({ denied, elsewhere }: { denied: boolean; elsewhere: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const configured = isSupabaseConfigured || isDemo

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setBusy(true); setError('')
    const err = await signIn(email, password).catch((x: Error) => x.message)
    if (err) setError(/invalid/i.test(err) ? 'That email and password don’t match an account.' : err)
    setBusy(false)
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-[420px] content-center">
      <Link to="/" viewTransition className="t-meta mb-8 inline-flex items-center gap-2 hover:text-frost"><ArrowLeft size={14} /> Back to site</Link>
      <div className="relative overflow-hidden rounded-[24px] border border-line bg-ink p-7 sm:p-9">
        <div aria-hidden className="absolute inset-x-0 top-0 h-24 opacity-60" style={{ background: 'radial-gradient(70% 100% at 50% 0%, rgb(26 159 232 / 0.35), transparent 70%)' }} />
        <div className="relative">
          <p className="t-label text-spark">Organizer access</p>
          <h1 className="t-h1 mt-3 text-[36px] text-frost">Admin sign in</h1>
          <p className="t-body mt-2 text-[14.5px]">For club leads and organizers only. Sessions end when you close this tab, and one device can be signed in at a time.</p>

          {denied && (
            <p role="alert" className="mt-6 flex gap-3 rounded-xl border border-ember/30 bg-ember/10 p-4 text-[14px] text-frost">
              <ShieldAlert size={18} className="shrink-0 text-ember" />
              <span><b>Access denied.</b> This account isn’t on the organizer list. Ask a club lead to add you.</span>
            </p>
          )}
          {elsewhere && (
            <p role="alert" className="mt-6 flex gap-3 rounded-xl border border-amber/30 bg-amber/10 p-4 text-[14px] text-frost">
              <ShieldAlert size={18} className="shrink-0 text-amber" />
              <span><b>Signed out.</b> This account just signed in on another device — only one device can hold the admin session. Sign in again here to take it back.</span>
            </p>
          )}
          {!configured && (
            <p role="alert" className="mt-6 rounded-xl border border-amber/30 bg-amber/10 p-4 text-[14px] text-frost">
              Supabase isn’t connected yet. Add <code className="text-amber">VITE_SUPABASE_URL</code> and <code className="text-amber">VITE_SUPABASE_ANON_KEY</code>, then reload.
            </p>
          )}
          {isDemo && <p className="mt-6 rounded-xl border border-line-strong p-3 text-[13px] text-mute-hi">Dev demo mode: any email and a 4+ character password signs in. Changes stay in memory.</p>}

          <form onSubmit={submit} noValidate className="mt-7 space-y-4">
            <Field label="Email"><Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@college.edu or organizer@domain.com" disabled={busy || !configured} /></Field>
            <Field label="Password">
              <div className="relative">
                <Input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter account password" disabled={busy || !configured} className="pr-11" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-mute-hi hover:text-frost">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </Field>
            {error && <p role="alert" className="text-[13.5px] text-ember">{error}</p>}
            <button type="submit" disabled={busy || !configured} className="pill pill--spark !h-12 w-full">{busy ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign in'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ email, role }: { email: string; role: string }) {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.id === params.get('tab')) ?? TABS[0]
  const strip = useRef<HTMLDivElement>(null)
  // keep the open tab in view on phones, and fade whichever edge hides more tabs
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const fade = () => {
      el.style.setProperty('--fade-l', el.scrollLeft > 4 ? '36px' : '0px')
      el.style.setProperty('--fade-r', el.scrollLeft + el.clientWidth < el.scrollWidth - 4 ? '36px' : '0px')
    }
    const on = el.querySelector<HTMLElement>('[aria-selected="true"]')
    if (on && el.scrollWidth > el.clientWidth) el.scrollTo({ left: on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' })
    fade()
    el.addEventListener('scroll', fade, { passive: true })
    addEventListener('resize', fade)
    return () => { el.removeEventListener('scroll', fade); removeEventListener('resize', fade) }
  }, [tab.id])
  const Current = tab.el
  const [leaving, setLeaving] = useState(false)
  return (
    <div className="mx-auto max-w-[1360px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-label text-spark">Dashboard</p>
          <h1 className="t-h1 mt-2 text-[clamp(34px,4vw,52px)] text-frost">Club control room</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right"><p className="text-[14px] text-frost">{email}</p><p className="t-meta">{role}</p></div>
          <button type="button" onClick={async () => { setLeaving(true); await signOut(); setLeaving(false) }} className="pill pill--sm" disabled={leaving}>{leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Sign out</button>
        </div>
      </header>

      <div ref={strip} role="tablist" aria-label="Admin sections" className="no-scrollbar tab-fade -mx-[var(--gutter)] mt-8 flex gap-1 overflow-x-auto border-b border-line px-[var(--gutter)]">
        {TABS.map((t) => {
          const on = t.id === tab.id
          const Icon = t.icon
          return (
            <button
              key={t.id} type="button" role="tab" aria-selected={on} aria-controls="admin-panel" id={`tab-${t.id}`}
              onClick={() => setParams({ tab: t.id }, { replace: true })}
              className={`relative inline-flex shrink-0 items-center gap-2 px-4 py-3.5 text-[14px] transition-colors ${on ? 'text-frost' : 'text-mute-hi hover:text-frost'}`}
            >
              <Icon size={15} aria-hidden /> {t.label}
              <span aria-hidden className={`absolute inset-x-3 -bottom-px h-px transition-opacity ${on ? 'bg-spark opacity-100 shadow-[0_0_10px_rgb(26_159_232/0.9)]' : 'opacity-0'}`} />
            </button>
          )
        })}
      </div>
      <div id="admin-panel" role="tabpanel" aria-labelledby={`tab-${tab.id}`} className="mt-8"><Current /></div>
    </div>
  )
}
