/**
 * Vercel Routing Middleware — per-event share previews.
 *
 * WhatsApp, Instagram and friends don't run JavaScript, so /events/:slug needs its own
 * <title>, description and og:image in the HTML itself. We fetch the built index.html,
 * look the event up through Supabase's REST API with the public anon key (RLS only
 * exposes published rows), and inject the tags. On any failure we return nothing,
 * and the request continues to the normal SPA rewrite.
 */
export const config = { matcher: '/events/:slug*', runtime: 'nodejs' }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

interface Row { title: string; description: string | null; image: string | null; date: string | null; time: string | null; location: string | null }

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url)
  const slug = decodeURIComponent(url.pathname.split('/')[2] ?? '').replace(/[^a-z0-9-]/gi, '')
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!slug || !base || !key) return undefined

  try {
    const api = `${base}/rest/v1/techspark_events?slug=eq.${slug}&published=eq.true&select=title,description,image,date,time,location&limit=1`
    const [pageRes, rowRes] = await Promise.all([
      fetch(new URL('/index.html', url), { headers: { accept: 'text/html' } }),
      fetch(api, { headers: { apikey: key, authorization: `Bearer ${key}` } }),
    ])
    if (!pageRes.ok || !rowRes.ok) return undefined
    const [html, rows] = await Promise.all([pageRes.text(), rowRes.json() as Promise<Row[]>])
    const ev = rows[0]
    if (!ev) return undefined

    const when = [ev.date && new Date(`${ev.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), ev.time, ev.location].filter(Boolean).join(' · ')
    const title = `${ev.title} — TECHSPARK`
    const desc = [when, ev.description].filter(Boolean).join(' — ').slice(0, 200)
    const image = ev.image && /^https?:\/\//.test(ev.image) ? ev.image : `${url.origin}/og.jpg`
    const canonical = `${url.origin}/events/${slug}`

    const out = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}" />`)
      .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`)
      .replace(/<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}" />`)
      .replace(/<meta property="og:image" [^>]*>/, `<meta property="og:image" content="${esc(image)}" />\n    <meta property="og:url" content="${esc(canonical)}" />\n    <link rel="canonical" href="${esc(canonical)}" />`)

    return new Response(out, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
      },
    })
  } catch {
    return undefined
  }
}
