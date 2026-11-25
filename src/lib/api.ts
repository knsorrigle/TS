import { getSupabase, isSupabaseConfigured as isSupabaseConfiguredFlag } from './supabase'
import { demoAnnouncements, demoEvents, demoPastEvents, demoTeam, demoSite, demoStoredRegs, saveDemoStoredRegs } from './demo'

/** Dev without keys → fixtures. Production without keys → the designed error states. */
export const isDemo = import.meta.env.DEV && !isSupabaseConfiguredFlag
const wait = <T,>(v: T, ms = 700) => new Promise<T>((r) => setTimeout(() => r(v), ms))

/* ───────── DB rows (snake_case) ───────── */
export interface EventRow {
  id: string; title: string; slug: string; description: string | null; full_description: string | null
  date: string | null; time: string | null; location: string | null; category: string | null; status: string | null
  published: boolean; capacity: number | null; registered_count: number | null; speaker: string | null
  image: string | null; tags: string[] | null; featured: boolean; created_at: string
  end_time?: string | null; registration_mode?: string | null; registration_url?: string | null; registration_deadline?: string | null; gallery?: string[] | null
  registration_kind?: string | null; team_min?: number | null; team_max?: number | null
  payment_required?: boolean | null; entry_fee?: number | null; upi_id?: string | null; upi_name?: string | null; payment_qr?: string | null; payment_note?: string | null
}
export interface AnnouncementRow {
  id: string; title: string; summary: string | null; content: string | null; date: string | null; category: string | null
  priority: string | null; author: string | null; pinned: boolean; published: boolean; related_event_slug: string | null; created_at: string
  link_url?: string | null; link_label?: string | null
}
export interface PastEventRow {
  id: string; title: string; date: string | null; participants: number | null; category: string | null
  description: string | null; image: string | null; highlight: string | null; published: boolean; created_at: string
  gallery?: string[] | null; link_url?: string | null
}
export interface RegistrationRow {
  id: string; event_id: string; event_title: string; student_name: string; student_email: string; student_roll: string
  department: string; year: string; status: 'Confirmed' | 'Waitlisted'; created_at: string
  team_name?: string | null; team_members?: TeamMemberInput[] | null
  payment_utr?: string | null; payment_amount?: number | null; payment_verified?: boolean | null
}

export interface TeamRow { id: string; name: string; role: string | null; photo: string | null; photo_fun: string | null; sort_order: number | null; published: boolean; created_at: string }

/* ───────── App models (camelCase) ───────── */
export interface TeamMember { id: string; name: string; role: string; photo: string; photoFun: string; sortOrder: number; published: boolean; createdAt: string }
export interface TSEvent {
  id: string; title: string; slug: string; description: string; fullDescription: string
  date: string | null; time: string; location: string; category: string; status: string
  published: boolean; capacity: number; registeredCount: number; speaker: string
  image: string; tags: string[]; featured: boolean; createdAt: string
  endTime: string; registrationMode: 'form' | 'external' | 'closed'; registrationUrl: string; registrationDeadline: string | null; gallery: string[]
  registrationKind: 'individual' | 'team'; teamMin: number; teamMax: number
  /** UPI payment before registering: entryFee is per registration (per team for team events) */
  paymentRequired: boolean; entryFee: number; upiId: string; upiName: string; paymentQr: string; paymentNote: string
}
export interface Announcement {
  id: string; title: string; summary: string; content: string; date: string | null; category: string
  priority: string; author: string; pinned: boolean; published: boolean; relatedEventSlug: string | null; createdAt: string
  linkUrl: string; linkLabel: string
}
export interface PastEvent {
  id: string; title: string; date: string | null; participants: number; category: string
  description: string; image: string; highlight: string; published: boolean; createdAt: string
  gallery: string[]; linkUrl: string
}
export interface Registration {
  id: string; eventId: string; eventTitle: string; studentName: string; studentEmail: string; studentRoll: string
  department: string; year: string; status: 'Confirmed' | 'Waitlisted'; createdAt: string
  teamName: string; teamMembers: TeamMemberInput[]
  paymentUtr: string; paymentAmount: number | null; paymentVerified: boolean
}
export interface TeamMemberInput { name: string; roll: string; email?: string; department?: string; year?: string }

export const toEvent = (r: EventRow): TSEvent => ({
  id: r.id, title: r.title, slug: r.slug, description: r.description ?? '', fullDescription: r.full_description ?? r.description ?? '',
  date: r.date, time: r.time ?? '', location: r.location ?? '', category: r.category ?? 'Technical', status: r.status ?? 'Open',
  published: r.published, capacity: r.capacity ?? 0, registeredCount: r.registered_count ?? 0, speaker: r.speaker ?? '',
  image: r.image ?? '', tags: r.tags ?? [], featured: r.featured, createdAt: r.created_at,
  endTime: r.end_time ?? '', registrationMode: (['form', 'external', 'closed'].includes(r.registration_mode ?? '') ? r.registration_mode : 'form') as TSEvent['registrationMode'],
  registrationUrl: r.registration_url ?? '', registrationDeadline: r.registration_deadline ?? null, gallery: r.gallery ?? [],
  registrationKind: r.registration_kind === 'team' ? 'team' : 'individual', teamMin: r.team_min ?? 2, teamMax: r.team_max ?? 4,
  paymentRequired: !!r.payment_required, entryFee: r.entry_fee ?? 0, upiId: r.upi_id ?? '', upiName: r.upi_name ?? '',
  paymentQr: r.payment_qr ?? '', paymentNote: r.payment_note ?? '',
})
/** True when registering needs a UPI payment + UTR first. */
export const isPaid = (e: Pick<TSEvent, 'paymentRequired' | 'entryFee'>) => e.paymentRequired && e.entryFee > 0
export const fromEvent = (e: Partial<TSEvent>): Partial<EventRow> => strip({
  title: e.title, slug: e.slug, description: e.description, full_description: e.fullDescription, date: e.date, time: e.time,
  location: e.location, category: e.category, status: e.status, published: e.published, capacity: e.capacity,
  registered_count: e.registeredCount, speaker: e.speaker, image: e.image, tags: e.tags, featured: e.featured,
  end_time: e.endTime, registration_mode: e.registrationMode, registration_url: e.registrationUrl,
  registration_deadline: e.registrationDeadline || null, gallery: e.gallery,
  registration_kind: e.registrationKind, team_min: e.teamMin, team_max: e.teamMax,
  payment_required: e.paymentRequired, entry_fee: e.entryFee, upi_id: e.upiId === undefined ? undefined : e.upiId.trim() || null,
  upi_name: e.upiName === undefined ? undefined : e.upiName.trim() || null, payment_qr: e.paymentQr === undefined ? undefined : e.paymentQr || null,
  payment_note: e.paymentNote === undefined ? undefined : e.paymentNote.trim() || null,
})
export const toAnnouncement = (r: AnnouncementRow): Announcement => ({
  id: r.id, title: r.title, summary: r.summary ?? '', content: r.content ?? '', date: r.date, category: r.category ?? 'General',
  priority: r.priority ?? 'Normal', author: r.author ?? '', pinned: r.pinned, published: r.published,
  relatedEventSlug: r.related_event_slug, createdAt: r.created_at, linkUrl: r.link_url ?? '', linkLabel: r.link_label ?? '',
})
export const fromAnnouncement = (a: Partial<Announcement>): Partial<AnnouncementRow> => strip({
  title: a.title, summary: a.summary, content: a.content, date: a.date, category: a.category, priority: a.priority,
  author: a.author, pinned: a.pinned, published: a.published, related_event_slug: a.relatedEventSlug,
  link_url: a.linkUrl, link_label: a.linkLabel,
})
export const toPastEvent = (r: PastEventRow): PastEvent => ({
  id: r.id, title: r.title, date: r.date, participants: r.participants ?? 0, category: r.category ?? 'Technical',
  description: r.description ?? '', image: r.image ?? '', highlight: r.highlight ?? '', published: r.published, createdAt: r.created_at,
  gallery: r.gallery ?? [], linkUrl: r.link_url ?? '',
})
export const fromPastEvent = (p: Partial<PastEvent>): Partial<PastEventRow> => strip({
  title: p.title, date: p.date, participants: p.participants, category: p.category, description: p.description,
  image: p.image, highlight: p.highlight, published: p.published, gallery: p.gallery, link_url: p.linkUrl,
})
export const toRegistration = (r: RegistrationRow): Registration => ({
  id: r.id, eventId: r.event_id, eventTitle: r.event_title, studentName: r.student_name, studentEmail: r.student_email,
  studentRoll: r.student_roll, department: r.department, year: r.year, status: r.status, createdAt: r.created_at,
  teamName: r.team_name ?? '', teamMembers: r.team_members ?? [],
  paymentUtr: r.payment_utr ?? '', paymentAmount: r.payment_amount ?? null, paymentVerified: !!r.payment_verified,
})

export const toTeam = (r: TeamRow): TeamMember => ({
  id: r.id, name: r.name, role: r.role ?? '', photo: r.photo ?? '', photoFun: r.photo_fun ?? '', sortOrder: r.sort_order ?? 0, published: r.published, createdAt: r.created_at,
})
export const fromTeam = (t: Partial<TeamMember>): Partial<TeamRow> => strip({
  name: t.name, role: t.role, photo: t.photo, photo_fun: t.photoFun, sort_order: t.sortOrder, published: t.published,
})

function strip<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

export class ApiError extends Error {}
async function client() {
  const c = await getSupabase()
  if (!c) throw new ApiError('Supabase is not configured')
  return c
}

/* ───────── Public reads ───────── */
export async function fetchEvents(): Promise<TSEvent[]> {
  if (isDemo) return wait(demoEvents)
  const { data, error } = await (await client()).from('techspark_events').select('*').eq('published', true)
    .order('date', { ascending: true, nullsFirst: false })
  if (error) throw new ApiError(error.message)
  return (data as EventRow[]).map(toEvent)
}
export async function fetchEventBySlug(slug: string): Promise<TSEvent | null> {
  if (isDemo) return wait(demoEvents.find((e) => e.slug === slug) ?? null, 400)
  const { data, error } = await (await client()).from('techspark_events').select('*').eq('slug', slug).eq('published', true).maybeSingle()
  if (error) throw new ApiError(error.message)
  return data ? toEvent(data as EventRow) : null
}
export async function fetchAnnouncements(): Promise<Announcement[]> {
  if (isDemo) return wait(demoAnnouncements, 900)
  const { data, error } = await (await client()).from('techspark_announcements').select('*').eq('published', true)
    .order('pinned', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw new ApiError(error.message)
  return (data as AnnouncementRow[]).map(toAnnouncement)
}
export async function fetchPastEvents(): Promise<PastEvent[]> {
  if (isDemo) return wait(demoPastEvents, 1000)
  const { data, error } = await (await client()).from('techspark_past_events').select('*').eq('published', true)
    .order('created_at', { ascending: false })
  if (error) throw new ApiError(error.message)
  return (data as PastEventRow[]).map(toPastEvent)
}

export async function fetchTeam(): Promise<TeamMember[]> {
  if (isDemo) return wait(demoTeam, 600)
  const { data, error } = await (await client()).from('techspark_team').select('*').eq('published', true).order('sort_order', { ascending: true })
  if (error) throw new ApiError(error.message)
  return (data as TeamRow[]).map(toTeam)
}

/* ───────── Site content ───────── */
export async function fetchSiteContent(): Promise<Record<string, unknown> | null> {
  if (isDemo) return wait(demoSite.value, 150)
  const { data, error } = await (await client()).from('techspark_settings').select('value').eq('key', 'site').maybeSingle()
  if (error) throw new ApiError(error.message)
  return (data?.value as Record<string, unknown>) ?? null
}

/* ───────── Registration ───────── */
export interface RegisterInput {
  eventId: string; name: string; email: string; roll: string; department: string; year: string
  teamName?: string; members?: TeamMemberInput[]
  /** paid events: the 12-digit UTR. Leave it out to check every other detail before the student pays. */
  utr?: string
}
export interface RegisterResult {
  success: boolean; id?: string; status?: 'Confirmed' | 'Waitlisted'; message?: string; error?: string
  /** paid event, every other detail is fine: show the pay step */
  needs_payment?: boolean; amount?: number
  /** the event filled up (paid events have no waitlist) */
  full?: boolean
}
export const UTR_RE = /^\d{12}$/
export const cleanUtr = (s: string) => s.replace(/\s/g, '')

export async function registerForEvent(i: RegisterInput): Promise<RegisterResult> {
  if (isDemo) {
    const ev = demoEvents.find((e) => e.id === i.eventId)
    const stored = demoStoredRegs()
    const key = (r: string) => r.trim().toUpperCase()
    const taken = new Set(stored.filter((r) => r.eventId === i.eventId).flatMap((r) => [r.studentRoll, ...r.teamMembers.map((m) => m.roll)].map(key)))
    const rolls = [i.roll, ...(i.members ?? []).map((m) => m.roll)].map(key)
    if (rolls.some((k) => taken.has(k))) return wait({ success: false, error: i.teamName !== undefined ? 'Someone on this team (or this email) is already registered for this event.' : 'You have already registered for this event with this roll number.' }, 1200)
    const full = ev ? ev.capacity > 0 && ev.registeredCount >= ev.capacity : false
    const paid = !!ev && isPaid(ev)
    let utr: string | undefined
    if (paid) {
      if (full) return wait({ success: false, full: true, error: i.utr ? 'This event filled up while you were paying, so your registration couldn’t be saved. Contact the club with your UTR for a refund.' : 'This event just filled up — please don’t pay.' }, 600)
      if (i.utr === undefined) return wait({ success: false, needs_payment: true, amount: ev.entryFee, error: 'Pay the entry fee, then enter the 12-digit UTR from your payment.' }, 600)
      utr = cleanUtr(i.utr)
      if (!UTR_RE.test(utr)) return wait({ success: false, error: 'A UTR is exactly 12 digits — check your UPI app’s payment details.' }, 600)
      if (stored.some((r) => r.paymentUtr === utr)) return wait({ success: false, error: 'That UTR has already been used for a registration. Check the number, or contact the club.' }, 900)
    }
    if (ev && !full) ev.registeredCount += 1
    const id = crypto.randomUUID()
    const status = full ? 'Waitlisted' : 'Confirmed'
    saveDemoStoredRegs([{
      id, eventId: i.eventId, eventTitle: ev?.title ?? '', studentName: i.name.trim(), studentEmail: i.email.trim().toLowerCase(),
      studentRoll: key(i.roll), department: i.department, year: i.year, status, createdAt: new Date().toISOString(),
      teamName: i.teamName?.trim() ?? '', teamMembers: (i.members ?? []).map((m) => ({ ...m, roll: key(m.roll) })),
      paymentUtr: utr ?? '', paymentAmount: paid && ev ? ev.entryFee : null, paymentVerified: false,
    }, ...stored])
    return wait({ success: true, id, status, message: full ? 'Added to waitlist' : 'Registered' }, 1400)
  }
  const { data, error } = await (await client()).rpc('register_for_event', {
    p_event_id: i.eventId, p_student_name: i.name.trim(), p_student_email: i.email.trim().toLowerCase(),
    p_student_roll: i.roll.trim().toUpperCase(), p_department: i.department, p_year: i.year,
    ...(i.teamName !== undefined || i.utr !== undefined ? { p_team_name: i.teamName?.trim() ?? null, p_members: i.members ?? [] } : {}),
    ...(i.utr !== undefined ? { p_utr: cleanUtr(i.utr) } : {}),
  })
  if (error) return { success: false, error: error.message }
  return data as RegisterResult
}

/** Is this device's registration still on the books? 'Removed' once an admin deletes it. null = couldn't check. */
export async function checkRegistration(id: string): Promise<'Confirmed' | 'Waitlisted' | 'Removed' | null> {
  if (isDemo) return wait(demoStoredRegs().find((r) => r.id === id)?.status ?? 'Removed', 300)
  try {
    const { data, error } = await (await client()).rpc('registration_status', { p_id: id })
    if (error) return null
    return data === 'Confirmed' || data === 'Waitlisted' ? data : data === 'Removed' ? 'Removed' : null
  } catch { return null }
}
