import type { Session } from '@supabase/supabase-js'
import { getSupabase, EVENT_IMAGES_BUCKET, notifyDataUpdated } from '../lib/supabase'
import {
  isDemo, toTeam, fromTeam, type TeamMember, type TeamRow, toEvent, fromEvent, toAnnouncement, fromAnnouncement, toPastEvent, fromPastEvent, toRegistration,
  type TSEvent, type Announcement, type PastEvent, type Registration, type EventRow, type AnnouncementRow, type PastEventRow, type RegistrationRow,
} from '../lib/api'
import { demoEvents, demoAnnouncements, demoPastEvents, demoTeam, demoSite, demoStoredRegs, saveDemoStoredRegs } from '../lib/demo'
import { mergeContent, type SiteContent } from '../lib/content'

export { isDemo }

/* ───────── Slugs ───────── */
export function slugify(s: string) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'event'
}

/** Unique against techspark_events.slug: base, base-2, base-3… then a random suffix. */
export async function uniqueSlug(title: string, ignoreId?: string) {
  const base = slugify(title)
  const taken = new Set<string>()
  if (isDemo) demoEvents.filter((e) => e.id !== ignoreId).forEach((e) => taken.add(e.slug))
  else {
    const { data, error } = await (await db()).from('techspark_events').select('id, slug').like('slug', `${base}%`)
    if (error) throw new Error(error.message)
    ;(data as { id: string; slug: string }[]).filter((r) => r.id !== ignoreId).forEach((r) => taken.add(r.slug))
  }
  if (!taken.has(base)) return base
  for (let i = 2; i < 50; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

async function db() {
  const c = await getSupabase()
  if (!c) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
  return c
}
const done = <T,>(v: T) => { notifyDataUpdated(); return v }
const demoId = () => `demo-${Math.random().toString(36).slice(2, 9)}`
const now = () => new Date().toISOString()

/* ───────── Auth ─────────
 * • The session lives in sessionStorage (see lib/supabase.ts): closing the tab ends it.
 * • One device at a time: signing in claims the admin seat for *this* session (claim_admin_session);
 *   the database's is_admin() only honours the seat holder, and other devices are signed out.
 */
export type AdminState =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'denied' }
  | { kind: 'elsewhere' } // this account signed in on another device
  | { kind: 'admin'; email: string; role: string }

let demoSession: { email: string } | null = (() => {
  try { return isDemo ? JSON.parse(sessionStorage.getItem('ts_demo_admin') || 'null') : null } catch { return null }
})()
const demoSubs = new Set<(s: AdminState) => void>()

/** Live watchers, so signIn() can re-evaluate once the seat is claimed. */
const watchers = new Set<() => void>()
let claiming = false

async function evaluate(session: Session | null): Promise<AdminState> {
  if (!session) return { kind: 'signed-out' }
  const client = await db()
  const { data: ok, error } = await client.rpc('is_admin')
  if (error) throw new Error(error.message)
  if (ok) {
    const { data } = await client.from('techspark_admins').select('role').eq('id', session.user.id).maybeSingle()
    return { kind: 'admin', email: session.user.email ?? '', role: (data as { role: string } | null)?.role ?? 'admin' }
  }
  // Not the seat holder. Is it an admin account at all? (A user can always read their own row.)
  const { data: row } = await client.from('techspark_admins').select('id').eq('id', session.user.id).maybeSingle()
  await client.auth.signOut({ scope: 'local' })
  return row ? { kind: 'elsewhere' } : { kind: 'denied' }
}

export function watchAdmin(cb: (s: AdminState) => void) {
  if (isDemo) {
    demoSubs.add(cb)
    cb(demoSession ? { kind: 'admin', email: demoSession.email, role: 'admin (demo)' } : { kind: 'signed-out' })
    return () => { demoSubs.delete(cb) }
  }
  let alive = true
  let last: AdminState['kind'] = 'loading'
  let unsub = () => {}
  let timer = 0
  const run = async () => {
    if (!alive || claiming) return
    const client = await db()
    const { data } = await client.auth.getSession()
    const s = await evaluate(data.session).catch(() => ({ kind: 'signed-out' }) as AdminState)
    // keep an "elsewhere"/"denied" message on screen after the resulting SIGNED_OUT event
    if (s.kind === 'signed-out' && (last === 'elsewhere' || last === 'denied')) return
    last = s.kind
    if (alive) cb(s)
  }
  watchers.add(run)
  db().then((client) => {
    if (!alive) return
    const { data } = client.auth.onAuthStateChange(() => { setTimeout(run, 0) }) // defer out of the auth callback
    unsub = () => data.subscription.unsubscribe()
    // someone else may take the seat at any time: re-check every 20s and whenever the tab comes back
    timer = window.setInterval(() => { if (last === 'admin') run() }, 20_000)
  }).catch(() => alive && cb({ kind: 'signed-out' }))
  const onVisible = () => { if (document.visibilityState === 'visible' && last === 'admin') run() }
  document.addEventListener('visibilitychange', onVisible)
  return () => { alive = false; unsub(); clearInterval(timer); watchers.delete(run); document.removeEventListener('visibilitychange', onVisible) }
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (isDemo) {
    await new Promise((r) => setTimeout(r, 700))
    if (password.length < 4) return 'Invalid login credentials'
    demoSession = { email }
    sessionStorage.setItem('ts_demo_admin', JSON.stringify(demoSession))
    demoSubs.forEach((f) => f({ kind: 'admin', email, role: 'admin (demo)' }))
    return null
  }
  const client = await db()
  claiming = true
  try {
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return error.message
    const { data: role, error: claimErr } = await client.rpc('claim_admin_session')
    if (claimErr) {
      await client.auth.signOut({ scope: 'local' })
      return /claim_admin_session/.test(claimErr.message)
        ? 'The database needs the latest schema (one-device sign-in). Run the update from Database & Schema.'
        : claimErr.message
    }
    if (role) await client.auth.signOut({ scope: 'others' }) // revoke this account's sessions on other devices
    return null
  } finally {
    claiming = false
    watchers.forEach((w) => w())
  }
}

export async function signOut() {
  if (isDemo) { demoSession = null; sessionStorage.removeItem('ts_demo_admin'); demoSubs.forEach((f) => f({ kind: 'signed-out' })); return }
  await (await db()).auth.signOut({ scope: 'local' })
}

/* ───────── Events ───────── */
export async function listEvents(): Promise<TSEvent[]> {
  if (isDemo) return [...demoEvents]
  const { data, error } = await (await db()).from('techspark_events').select('*').order('date', { ascending: false, nullsFirst: true })
  if (error) throw new Error(error.message)
  return (data as EventRow[]).map(toEvent)
}
export async function saveEvent(e: Partial<TSEvent> & { title: string }, id?: string): Promise<TSEvent> {
  const slug = e.slug && e.slug.trim() ? await uniqueSlug(e.slug, id) : await uniqueSlug(e.title, id)
  const payload = { ...e, slug }
  if (isDemo) {
    if (id) {
      const i = demoEvents.findIndex((x) => x.id === id)
      demoEvents[i] = { ...demoEvents[i], ...payload } as TSEvent
      return done(demoEvents[i])
    }
    const created = { id: demoId(), createdAt: now(), registeredCount: 0, description: '', fullDescription: '', date: null, time: '', location: '', category: 'Technical', status: 'Open', published: false, capacity: 0, speaker: '', image: '', tags: [], featured: false, ...payload } as TSEvent
    demoEvents.unshift(created)
    return done(created)
  }
  const row = fromEvent(payload)
  const q = id ? (await db()).from('techspark_events').update(row).eq('id', id) : (await db()).from('techspark_events').insert(row)
  const { data, error } = await q.select('*').single()
  if (error) throw new Error(error.code === '23505' ? 'That slug is already taken. Try a different title or slug.' : error.message)
  return done(toEvent(data as EventRow))
}
export async function deleteEvent(id: string) {
  if (isDemo) { demoEvents.splice(demoEvents.findIndex((e) => e.id === id), 1); return done(undefined) }
  const { error } = await (await db()).from('techspark_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
  done(undefined)
}

/* ───────── Announcements ───────── */
export async function listAnnouncements(): Promise<Announcement[]> {
  if (isDemo) return [...demoAnnouncements]
  const { data, error } = await (await db()).from('techspark_announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as AnnouncementRow[]).map(toAnnouncement)
}
export async function saveAnnouncement(a: Partial<Announcement> & { title: string }, id?: string): Promise<Announcement> {
  if (isDemo) {
    if (id) { const i = demoAnnouncements.findIndex((x) => x.id === id); demoAnnouncements[i] = { ...demoAnnouncements[i], ...a } as Announcement; return done(demoAnnouncements[i]) }
    const c = { id: demoId(), createdAt: now(), summary: '', content: '', date: now().slice(0, 10), category: 'General', priority: 'Normal', author: '', pinned: false, published: false, relatedEventSlug: null, ...a } as Announcement
    demoAnnouncements.unshift(c)
    return done(c)
  }
  const row = fromAnnouncement(a)
  const q = id ? (await db()).from('techspark_announcements').update(row).eq('id', id) : (await db()).from('techspark_announcements').insert(row)
  const { data, error } = await q.select('*').single()
  if (error) throw new Error(error.message)
  return done(toAnnouncement(data as AnnouncementRow))
}
export async function deleteAnnouncement(id: string) {
  if (isDemo) { demoAnnouncements.splice(demoAnnouncements.findIndex((e) => e.id === id), 1); return done(undefined) }
  const { error } = await (await db()).from('techspark_announcements').delete().eq('id', id)
  if (error) throw new Error(error.message)
  done(undefined)
}

/* ───────── Past events ───────── */
export async function listPast(): Promise<PastEvent[]> {
  if (isDemo) return [...demoPastEvents]
  const { data, error } = await (await db()).from('techspark_past_events').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as PastEventRow[]).map(toPastEvent)
}
export async function savePast(p: Partial<PastEvent> & { title: string }, id?: string): Promise<PastEvent> {
  if (isDemo) {
    if (id) { const i = demoPastEvents.findIndex((x) => x.id === id); demoPastEvents[i] = { ...demoPastEvents[i], ...p } as PastEvent; return done(demoPastEvents[i]) }
    const c = { id: demoId(), createdAt: now(), date: null, participants: 0, category: 'Technical', description: '', image: '', highlight: '', published: true, ...p } as PastEvent
    demoPastEvents.unshift(c)
    return done(c)
  }
  const row = fromPastEvent(p)
  const q = id ? (await db()).from('techspark_past_events').update(row).eq('id', id) : (await db()).from('techspark_past_events').insert(row)
  const { data, error } = await q.select('*').single()
  if (error) throw new Error(error.message)
  return done(toPastEvent(data as PastEventRow))
}
export async function deletePast(id: string) {
  if (isDemo) { demoPastEvents.splice(demoPastEvents.findIndex((e) => e.id === id), 1); return done(undefined) }
  const { error } = await (await db()).from('techspark_past_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
  done(undefined)
}

/* ───────── Team ───────── */
export async function listTeam(): Promise<TeamMember[]> {
  if (isDemo) return [...demoTeam].sort((a, b) => a.sortOrder - b.sortOrder)
  const { data, error } = await (await db()).from('techspark_team').select('*').order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as TeamRow[]).map(toTeam)
}
export async function saveTeam(t: Partial<TeamMember> & { name: string }, id?: string): Promise<TeamMember> {
  if (isDemo) {
    if (id) { const i = demoTeam.findIndex((x) => x.id === id); demoTeam[i] = { ...demoTeam[i], ...t } as TeamMember; return done(demoTeam[i]) }
    const c = { id: demoId(), createdAt: now(), role: '', photo: '', photoFun: '', sortOrder: demoTeam.length, published: false, ...t } as TeamMember
    demoTeam.push(c)
    return done(c)
  }
  const row = fromTeam(t)
  const q = id ? (await db()).from('techspark_team').update(row).eq('id', id) : (await db()).from('techspark_team').insert(row)
  const { data, error } = await q.select('*').single()
  if (error) throw new Error(error.message)
  return done(toTeam(data as TeamRow))
}
export async function deleteTeam(id: string) {
  if (isDemo) { demoTeam.splice(demoTeam.findIndex((e) => e.id === id), 1); return done(undefined) }
  const { error } = await (await db()).from('techspark_team').delete().eq('id', id)
  if (error) throw new Error(error.message)
  done(undefined)
}
/** Swap two members' sort order. */
export async function swapTeamOrder(a: TeamMember, b: TeamMember) {
  await saveTeam({ ...a, sortOrder: b.sortOrder }, a.id)
  await saveTeam({ ...b, sortOrder: a.sortOrder }, b.id)
}

/* ───────── Site content ───────── */
export async function loadSiteContent(): Promise<SiteContent> {
  if (isDemo) return mergeContent(demoSite.value)
  const { data, error } = await (await db()).from('techspark_settings').select('value').eq('key', 'site').maybeSingle()
  if (error) throw new Error(error.message)
  return mergeContent(data?.value ?? null)
}
export async function saveSiteContent(c: SiteContent) {
  if (isDemo) { demoSite.value = structuredClone(c) as unknown as Record<string, unknown>; return done(undefined) }
  const { error } = await (await db()).from('techspark_settings').upsert({ key: 'site', value: c, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
  done(undefined)
}

/* ───────── Registrations ───────── */
const demoRegs: Registration[] = (() => {
  const names = ['Aditi Rao', 'Rahul Sharma', 'Kavya N', 'Mohammed Irfan', 'Sneha Gowda', 'Varun K', 'Priya Shetty', 'Arjun Hegde']
  const depts = ['Computer Science & Engineering', 'Information Technology', 'Electronics & Communication', 'Mechanical']
  return names.map((n, i) => ({
    id: `r${i}`, eventId: i % 2 ? 'demo-1' : 'demo-2', eventTitle: i % 2 ? 'Spark Hack: 24 Hours to Build' : 'Git Good: Version Control Workshop',
    studentName: n, studentEmail: `${n.split(' ')[0].toLowerCase()}@gmail.com`, studentRoll: `4NK2${i % 4}CS0${10 + i}`,
    department: depts[i % depts.length], year: `${(i % 4) + 1}${['st', 'nd', 'rd', 'th'][i % 4]} Year`,
    status: i === 7 ? 'Waitlisted' : 'Confirmed', createdAt: new Date(Date.now() - i * 3600_000).toISOString(),
    teamName: i % 2 ? `Team ${['Kraken', 'Orca', 'Nautilus', 'Trident'][i % 4]}` : '', teamMembers: i % 2 ? [{ name: 'Member One', roll: `4NK24CS1${i}1`, department: 'AIML', year: '2nd Year' }, { name: 'Member Two', roll: `4NK24CS1${i}2`, department: 'CSE', year: '2nd Year' }] : [],
    paymentUtr: i % 2 ? `5021${String(48213907 + i * 7919).padStart(8, '0')}` : '', paymentAmount: i % 2 ? 200 : null, paymentVerified: i === 1,
  }))
})()

export async function listRegistrations(): Promise<Registration[]> {
  if (isDemo) return [...demoStoredRegs(), ...demoRegs]
  const { data, error } = await (await db()).from('techspark_registrations').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as RegistrationRow[]).map(toRegistration)
}
export async function addRegistration(r: Omit<Registration, 'id' | 'createdAt'>): Promise<void> {
  if (isDemo) { demoRegs.unshift({ ...r, id: demoId(), createdAt: now() }); return done(undefined) }
  const { error } = await (await db()).from('techspark_registrations').insert({
    event_id: r.eventId, event_title: r.eventTitle, student_name: r.studentName.trim(), student_email: r.studentEmail.trim().toLowerCase(),
    student_roll: r.studentRoll.trim().toUpperCase(), department: r.department, year: r.year, status: r.status,
    team_name: r.teamName?.trim() || null, team_members: r.teamMembers ?? [],
    payment_utr: r.paymentUtr ? r.paymentUtr.replace(/\s/g, '') : null, payment_amount: r.paymentAmount ?? null, payment_verified: r.paymentVerified ?? false,
  })
  if (error) throw new Error(error.code === '23505'
    ? (error.message.includes('payment_utr') ? 'That UTR is already used by another registration.' : 'That student (roll or email) is already registered for this event.')
    : error.message)
  done(undefined)
}
export async function setRegistrationStatus(id: string, status: 'Confirmed' | 'Waitlisted') {
  return updateRegistration(id, { status })
}
/** Admin ticks a payment off against the bank statement (or unticks it). */
export async function setPaymentVerified(id: string, verified: boolean) {
  return updateRegistration(id, { payment_verified: verified })
}
async function updateRegistration(id: string, patch: { status?: 'Confirmed' | 'Waitlisted'; payment_verified?: boolean }) {
  if (isDemo) {
    const apply = (r: Registration) => { if (patch.status) r.status = patch.status; if (patch.payment_verified !== undefined) r.paymentVerified = patch.payment_verified }
    const stored = demoStoredRegs(); const s = stored.find((x) => x.id === id)
    if (s) { apply(s); saveDemoStoredRegs(stored) } else { const r = demoRegs.find((x) => x.id === id); if (r) apply(r) }
    return done(undefined)
  }
  const { error } = await (await db()).from('techspark_registrations').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  done(undefined)
}
export async function deleteRegistration(id: string) {
  if (isDemo) {
    const stored = demoStoredRegs()
    if (stored.some((r) => r.id === id)) saveDemoStoredRegs(stored.filter((r) => r.id !== id))
    else demoRegs.splice(demoRegs.findIndex((r) => r.id === id), 1)
    return done(undefined)
  }
  const { error } = await (await db()).from('techspark_registrations').delete().eq('id', id)
  if (error) throw new Error(error.message)
  done(undefined)
}

/* ───────── Image upload: event-images bucket ───────── */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function checkImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Only JPG, JPEG, PNG or WebP images.'
  if (file.size > MAX_IMAGE_BYTES) return `That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 5 MB.`
  return null
}

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

/** Photos ≤ 5 MB (jpg/png/webp) or videos ≤ 50 MB (mp4/webm/mov). */
export function checkMedia(file: File): string | null {
  if (VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) return `“${file.name}” is ${(file.size / 1048576).toFixed(0)} MB. Videos can be up to 50 MB — for longer clips, upload to YouTube and paste the link.`
    return null
  }
  return checkImage(file)
}

export async function uploadMedia(file: File): Promise<string> {
  if (!VIDEO_TYPES.includes(file.type)) return uploadImage(file)
  const bad = checkMedia(file)
  if (bad) throw new Error(bad)
  if (isDemo) return URL.createObjectURL(file) + '#.mp4'
  const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4'
  const path = `videos/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`
  const { error } = await (await db()).storage.from(EVENT_IMAGES_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (error) {
    if (/mime|not allowed|invalid/i.test(error.message)) throw new Error('Video uploads aren’t enabled on your storage yet — run the video snippet from Admin → Database & Schema.')
    if (/size|too large|exceed/i.test(error.message)) throw new Error('That video is over your Supabase upload limit. Upload it to YouTube and paste the link instead.')
    throw new Error(error.message)
  }
  return (await db()).storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function uploadImage(file: File): Promise<string> {
  const bad = checkImage(file)
  if (bad) throw new Error(bad)
  if (isDemo) return URL.createObjectURL(file)
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`
  const { error } = await (await db()).storage.from(EVENT_IMAGES_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (error) throw new Error(error.message)
  return (await db()).storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}
