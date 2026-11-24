import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ArrowUp } from 'lucide-react'
import { CLUB_GITHUB_URL, SITE } from '../lib/site'
import { copyText } from '../lib/calendar'
import { getLenis, reducedMotion, whenLenis } from '../lib/motion'
import { flareSpark } from '../three/sparkState'

export function Footer({ loop = false }: { loop?: boolean }) {
  const top = () => { const l = getLenis(); l ? l.scrollTo(0, { duration: 2 }) : scrollTo({ top: 0, behavior: 'smooth' }) }
  const [user, domain] = SITE.email.split('@')
  return (
    <>
      <footer data-spark="-0.36 0.12 0.7 3.0" className="relative overflow-hidden bg-void px-[var(--gutter)] pb-10 pt-[clamp(96px,16vh,200px)]">
        <div className="mx-auto max-w-[1440px]">
          <p className="t-label text-mute-hi">Say hello</p>
          <button
            type="button"
            onClick={() => { copyText(SITE.email, 'Copied! Email us anytime.'); flareSpark(0.5) }}
            data-cursor="COPY"
            className="t-h1 above-spark group mt-6 block text-left text-[clamp(52px,9.6vw,170px)] leading-[0.88] transition-colors"
            aria-label={`Copy email address ${SITE.email}`}
          >
            <span className="block break-all sm:break-normal">{user}</span>
            <span className="block text-white/55 transition-colors duration-500 group-hover:text-white">@{domain}</span>
          </button>

          <div className="above-spark mt-[clamp(64px,10vh,120px)] grid gap-10 border-t border-white/15 pt-8 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <p className="t-label text-mute-hi">Follow us</p>
              <ul className="mt-3 space-y-1.5 text-[15px]">
                <li><a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="link-u">Instagram <span className="sr-only">(opens in a new tab)</span></a></li>
                {CLUB_GITHUB_URL && <li><a href={CLUB_GITHUB_URL} target="_blank" rel="noopener noreferrer" className="link-u">GitHub</a></li>}
                <li><a href={`mailto:${SITE.email}`} className="link-u">Email</a></li>
              </ul>
            </div>
            <div>
              <p className="t-label text-mute-hi">Find us</p>
              <p className="mt-3 text-[15px] leading-relaxed text-white/85">{SITE.dept}<br />{SITE.college}, {SITE.city}</p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Link to="/" viewTransition aria-label="TECHSPARK — home" className="flex items-center gap-2.5">
                <img src="/logo-128.webp" alt="" width={40} height={40} loading="lazy" className="h-10 w-10" />
                <span className="text-[13px] font-[680] uppercase tracking-[0.05em]">Techspark</span>
              </Link>
            </div>
          </div>

          <div className="above-spark mt-10 flex flex-wrap items-center justify-between gap-4">
            <p className="t-meta">© 2026 TECHSPARK Student Club. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/admin" viewTransition className="t-meta transition-colors hover:text-white">Admin</Link>
              <button type="button" onClick={top} className="t-meta inline-flex items-center gap-2 transition-colors hover:text-white">Back to top <ArrowUp size={13} /></button>
            </div>
          </div>
        </div>
      </footer>
      {loop && <LoopTail />}
    </>
  )
}

/**
 * The page never ends: a replica of the hero rises from below; once it fills the viewport we jump to the
 * real hero at scroll 0 (identical frame), and the crystal is already back in its hero pose.
 */
function LoopTail() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (reducedMotion()) return
    // keyboard users pressing End/PageDown expect to land on the footer, not be thrown back to the top
    let lastKey = 0
    const onKey = () => { lastKey = performance.now() }
    addEventListener('keydown', onKey)
    const stop = whenLenis((l) => {
    let armed = true
    const off = l.on('scroll', () => {
      if (!armed || performance.now() - lastKey < 1500) return
      if (l.scroll >= l.limit - 1) {
        armed = false
        l.scrollTo(0, { immediate: true, force: true })
        setTimeout(() => { armed = true }, 600)
      }
    })
    // already parked at the bottom? a further wheel/swipe down carries you over the seam
    const offV = l.on('virtual-scroll', ({ deltaY }) => {
      if (!armed || deltaY <= 0 || performance.now() - lastKey < 1500) return
      if (l.scroll >= l.limit - 2) {
        armed = false
        l.scrollTo(0, { immediate: true, force: true })
        setTimeout(() => { armed = true }, 600)
      }
    })
    return () => { off(); offV() }
    })
    return () => { stop(); removeEventListener('keydown', onKey) }
  }, [])
  if (reducedMotion()) return null
  return (
    <div ref={ref} aria-hidden data-spark="0 0 1.25 0" className="relative h-[100svh] overflow-hidden bg-void">
      <img src="/hero-still.jpg" alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-white">
        <span className="t-serif above-spark block pb-[0.04em] text-[clamp(112px,23vw,400px)] leading-[0.78]">Tech</span>
        <span className="t-serif relative z-20 mt-[clamp(10px,2.2vw,34px)] block pb-[0.06em] text-[clamp(112px,23vw,400px)] leading-[0.78]">Spark</span>
      </div>
    </div>
  )
}
