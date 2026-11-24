import { supabase, isSupabaseConfigured } from './supabase'

/* ───────── DB rows (snake_case) ───────── */
export interface EventRow {
  id: string; title: string; slug: string; description: string | null; full_description: string | null
  date: string | null; time: string | null; location: string | null; category: string | null; status: string | null
  published: boolean; capacity: number | null; registered_count: number | null; speaker: string | null
  image: string | null; tags: string[] | null; featured: boolean; created_at: string
}
export interface AnnouncementRow {
  id: string; title: string; summary: string | null; content: string | null; date: string | null; category: string | null
  priority: string | null; author: string | null; pinned: boolean; published: boolean; related_event_slug: string | null; created_at: string
}
export interface PastEventRow {
  id: string; title: string; date: string | null; participants: number | null; category: string | null
  description: string | null; image: string | null; highlight: string | null; published: boolean; created_at: string
}
export interface RegistrationRow {
  id: string; event_id: string; event_title: string; student_name: string; student_email: string; student_roll: string
  department: string; year: string; status: 'Confirmed' | 'Waitlisted'; created_at: string
}

/* ───────── App models (camelCase) ───────── */
export interface TSEvent {
  id: string; title: string; slug: string; description: string; fullDescription: string
  date: string | null; time: string; location: string; category: string; status: string
  published: boolean; capacity: number; registeredCount: number; speaker: string
  image: string; tags: string[]; featured: boolean; createdAt: string
}
export interface Announcement {
  id: string; title: string; summary: string; content: string; date: string | null; category: string
  priority: string; author: string; pinned: boolean; published: boolean; relatedEventSlug: string | null; createdAt: string
}
export interface PastEvent {
  id: string; title: string; date: string | null; participants: number; category: string
  description: string; image: string; highlight: string; published: boolean; createdAt: string
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
})
export const fromEvent = (e: Partial<TSEvent>): Partial<EventRow> => strip({
  title: e.title, slug: e.slug, description: e.description, full_description: e.fullDescription, date: e.date, time: e.time,
  location: e.location, category: e.category, status: e.status, published: e.published, capacity: e.capacity,
  registered_count: e.registeredCount, speaker: e.speaker, image: e.image, tags: e.tags, featured: e.featured,
})
export const toAnnouncement = (r: AnnouncementRow): Announcement => ({
  id: r.id, title: r.title, summary: r.summary ?? '', content: r.content ?? '', date: r.date, category: r.category ?? 'General',
  priority: r.priority ?? 'Normal', author: r.author ?? '', pinned: r.pinned, published: r.published,
  relatedEventSlug: r.related_event_slug, createdAt: r.created_at,
})
export const fromAnnouncement = (a: Partial<Announcement>): Partial<AnnouncementRow> => strip({
  title: a.title, summary: a.summary, content: a.content, date: a.date, category: a.category, priority: a.priority,
  author: a.author, pinned: a.pinned, published: a.published, related_event_slug: a.relatedEventSlug,
})
export const toPastEvent = (r: PastEventRow): PastEvent => ({
  id: r.id, title: r.title, date: r.date, participants: r.participants ?? 0, category: r.category ?? 'Technical',
  description: r.description ?? '', image: r.image ?? '', highlight: r.highlight ?? '', published: r.published, createdAt: r.created_at,
})
export const fromPastEvent = (p: Partial<PastEvent>): Partial<PastEventRow> => strip({
  title: p.title, date: p.date, participants: p.participants, category: p.category, description: p.description,
  image: p.image, highlight: p.highlight, published: p.published,
})
export const toRegistration = (r: RegistrationRow): Registration => ({
  id: r.id, eventId: r.event_id, eventTitle: r.event_title, studentName: r.student_name, studentEmail: r.student_email,
  studentRoll: r.student_roll, department: r.department, year: r.year, status: r.status, createdAt: r.created_at,
})

function strip<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

export class ApiError extends Error {}
function client() {
  if (!supabase || !isSupabaseConfigured) throw new ApiError('Supabase is not configured')
  return supabase
}

/* ───────── Public reads ───────── */
export async function fetchEvents(): Promise<TSEvent[]> {
  const { data, error } = await client().from('techspark_events').select('*').eq('published', true)
    .order('date', { ascending: true, nullsFirst: false })
  if (error) throw new ApiError(error.message)
  return (data as EventRow[]).map(toEvent)
}
export async function fetchEventBySlug(slug: string): Promise<TSEvent | null> {
  const { data, error } = await client().from('techspark_events').select('*').eq('slug', slug).eq('published', true).maybeSingle()
  if (error) throw new ApiError(error.message)
  return data ? toEvent(data as EventRow) : null
}
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await client().from('techspark_announcements').select('*').eq('published', true)
    .order('pinned', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw new ApiError(error.message)
  return (data as AnnouncementRow[]).map(toAnnouncement)
}
export async function fetchPastEvents(): Promise<PastEvent[]> {
  const { data, error } = await client().from('techspark_past_events').select('*').eq('published', true)
    .order('created_at', { ascending: false })
  if (error) throw new ApiError(error.message)
  return (data as PastEventRow[]).map(toPastEvent)
}

/* ───────── RSVP ───────── */
export interface RegisterInput {
  eventId: string; name: string; email: string; roll: string; department: string; year: string
}
export interface RegisterResult { success: boolean; status?: 'Confirmed' | 'Waitlisted'; message?: string; error?: string }

export async function registerForEvent(i: RegisterInput): Promise<RegisterResult> {
  const { data, error } = await client().rpc('register_for_event', {
    p_event_id: i.eventId, p_student_name: i.name.trim(), p_student_email: i.email.trim().toLowerCase(),
    p_student_roll: i.roll.trim().toUpperCase(), p_department: i.department, p_year: i.year,
  })
  if (error) return { success: false, error: error.message }
  return data as RegisterResult
}
