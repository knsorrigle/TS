import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when both env vars are present. When false, every data call resolves to a designed "unavailable" state. */
export const isSupabaseConfigured = Boolean(url && anon && !url.includes('your-project-ref'))

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export const EVENT_IMAGES_BUCKET = 'event-images'

/** Public sections listen for this and refetch after any admin write. */
export const DATA_UPDATED_EVENT = 'techspark_data_updated'
export const notifyDataUpdated = () => window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT))
