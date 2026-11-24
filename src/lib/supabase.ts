import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when both env vars are present. When false, every data call resolves to a designed "unavailable" state. */
export const isSupabaseConfigured = Boolean(url && anon && !url.includes('your-project-ref'))

/** The client is loaded on first use, keeping ~45 KB (gzip) out of the first paint. */
let client: Promise<SupabaseClient | null> | null = null
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } }))
  return client
}

export const EVENT_IMAGES_BUCKET = 'event-images'

/** Public sections listen for this and refetch after any admin write. */
export const DATA_UPDATED_EVENT = 'techspark_data_updated'
export const notifyDataUpdated = () => window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT))
