import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'

const ENTRY = /\/assets\/index-[\w-]+\.js/

/** The entry script this tab is running, e.g. /assets/index-D9N8bD2w.js. Null in dev (no hashed bundle). */
function runningEntry(): string | null {
  const src = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.getAttribute('src') ?? ''
  return src.match(ENTRY)?.[0] ?? null
}

/**
 * An admin tab is often left open for hours. When a new version of the site is deployed, the open tab keeps
 * running the old code until it reloads, so this checks for a newer build whenever the tab regains focus
 * (and every few minutes) and offers a reload. It never reloads by itself: an open editor may hold unsaved work.
 */
export function UpdateNotice() {
  const [stale, setStale] = useState(false)
  useEffect(() => {
    const mine = runningEntry()
    if (!mine) return
    let last = 0
    const check = async () => {
      if (Date.now() - last < 30_000) return
      last = Date.now()
      try {
        const html = await (await fetch(`/?v=${Date.now()}`, { cache: 'no-store' })).text()
        const live = html.match(ENTRY)?.[0]
        if (live && live !== mine) setStale(true)
      } catch { /* offline: try again later */ }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    addEventListener('focus', check)
    const t = setInterval(check, 5 * 60_000)
    return () => { document.removeEventListener('visibilitychange', onVisible); removeEventListener('focus', check); clearInterval(t) }
  }, [])

  if (!stale) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[160] flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-4 rounded-full border border-spark/40 bg-ink/95 py-2 pl-5 pr-2 text-[14px] text-frost shadow-[0_10px_40px_rgb(0_0_0/0.6)] backdrop-blur">
        <span>A newer version of the admin is live.</span>
        <button type="button" onClick={() => location.reload()} className="pill pill--spark pill--sm"><RotateCw size={14} /> Reload</button>
      </div>
    </div>
  )
}
