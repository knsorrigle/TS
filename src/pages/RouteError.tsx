import { useEffect } from 'react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

const RELOAD_KEY = 'ts_chunk_reload'

/** Any route crash lands here. A stale/missing code chunk (after a deploy, or a dev server that went away)
 *  gets one automatic reload; anything else gets an on-brand message with a way out. */
export function RouteError() {
  const err = useRouteError()
  const message = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : String(err)
  const chunk = /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically/i.test(message)

  useEffect(() => {
    if (!chunk) return
    try {
      // at most one automatic reload every 30s, so a genuinely broken page shows this message instead of looping
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
      if (Date.now() - last < 30_000) return
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      location.reload()
    } catch { /* storage blocked */ }
  }, [chunk])

  return (
    <section className="grid min-h-[100svh] place-items-center bg-void px-[var(--gutter)] text-center">
      <div>
        <p className="t-meta">{chunk ? 'Couldn’t load this page' : 'Something went wrong'}</p>
        <h1 className="t-h1 mt-5 text-[clamp(40px,7vw,96px)]">This spark flickered.</h1>
        <p className="t-body mx-auto mt-4 max-w-[46ch]">
          {chunk ? 'The site may have just been updated, or the connection dropped. A reload usually fixes it.' : 'An unexpected error stopped this page from loading.'}
        </p>
        <div className="mt-9 flex justify-center gap-3">
          <button type="button" onClick={() => { try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* noop */ } location.reload() }} className="pill pill--solid">Reload</button>
          <Link to="/" className="pill">Home</Link>
        </div>
        {import.meta.env.DEV && <p className="mx-auto mt-10 max-w-[70ch] break-words font-[ui-monospace,monospace] text-[12px] text-mute">{message}</p>}
      </div>
    </section>
  )
}
