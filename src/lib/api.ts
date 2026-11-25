import { getSupabase, isSupabaseConfigured as isSupabaseConfiguredFlag } from './supabase'
import { demoAnnouncements, demoEvents, demoPastEvents, demoTeam, demoSite } from './demo'

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
}

export const toEvent = (r: EventRow): TSEvent => ({
  id: r.id, title: r.title, slug: r.slug, description: r.description ?? '', fullDescription: r.full_description ?? r.description ?? '',
  date: r.date, time: r.time ?? '', location: r.location ?? '', category: r.category ?? 'Technical', status: r.status ?? 'Open',
  published: r.published, capacity: r.capacity ?? 0, registeredCount: r.registered_count ?? 0, speaker: r.speaker ?? '',
  image: r.image ?? '', tags: r.tags ?? [], featured: r.featured, createdAt: r.created_at,
  endTime: r.end_time ?? '', registrationMode: (['form', 'external', 'closed'].includes(r.registration_mode ?? '') ? r.registration_mode : 'form') as TSEvent['registrationMode'],
  registrationUrl: r.registration_url ?? '', registrationDeadline: r.registration_deadline ?? null, gallery: r.gallery ?? [],
})
export const fromEvent = (e: Partial<TSEvent>): Partial<EventRow> => strip({
  title: e.title, slug: e.slug, description: e.description, full_description: e.fullDescription, date: e.date, time: e.time,
  location: e.location, category: e.category, status: e.status, published: e.published, capacity: e.capacity,
  registered_count: e.registeredCount, speaker: e.speaker, image: e.image, tags: e.tags, featured: e.featured,
  end_time: e.endTime, registration_mode: e.registrationMode, registration_url: e.registrationUrl,
  registration_deadline: e.registrationDeadline || null, gallery: e.gallery,
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
}
export interface RegisterResult { success: boolean; status?: 'Confirmed' | 'Waitlisted'; message?: string; error?: string }

const demoSeen = new Set<string>()
export async function registerForEvent(i: RegisterInput): Promise<RegisterResult> {
  if (isDemo) {
    const key = `${i.eventId}:${i.roll.trim().toUpperCase()}`
    if (demoSeen.has(key)) return wait({ success: false, error: 'You have already registered for this event with this roll number.' }, 1200)
    demoSeen.add(key)
    const ev = demoEvents.find((e) => e.id === i.eventId)
    const full = ev ? ev.capacity > 0 && ev.registeredCount >= ev.capacity : false
    if (ev && !full) ev.registeredCount += 1
    return wait({ success: true, status: full ? 'Waitlisted' : 'Confirmed', message: full ? 'Added to waitlist' : 'Registered' }, 1400)
  }
  const { data, error } = await (await client()).rpc('register_for_event', {
    p_event_id: i.eventId, p_student_name: i.name.trim(), p_student_email: i.email.trim().toLowerCase(),
    p_student_roll: i.roll.trim().toUpperCase(), p_department: i.department, p_year: i.year,
  })
  if (error) return { success: false, error: error.message }
  return data as RegisterResult
}
