import { Link } from 'react-router'
import { Mail, ArrowUp, Copy } from 'lucide-react'
import { GithubIcon, InstagramIcon } from '../components/BrandIcons'
import { CLUB_GITHUB_URL, SECTIONS, SITE } from '../lib/site'
import { copyText } from '../lib/calendar'
import { getLenis, scrollToTarget } from '../lib/motion'

export function Footer() {
  const top = () => { const l = getLenis(); l ? l.scrollTo(0, { duration: 2 }) : scrollTo({ top: 0, behavior: 'smooth' }) }
  return (
    <footer className="relative overflow-hidden border-t border-line bg-void px-[var(--gutter)] pt-[clamp(64px,10vh,120px)]">
      <div className="mx-auto grid max-w-[1440px] gap-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" viewTransition className="inline-flex items-center gap-3" aria-label="TECHSPARK — home">
            <img src="/logo-128.webp" alt="" width={44} height={44} loading="lazy" className="h-11 w-11" />
            <span className="text-[14px] font-[680] uppercase tracking-[0.05em] text-frost">Techspark</span>
          </Link>
          <p className="t-body mt-6 max-w-[38ch]">A student-led college club hosting engaging technical, non-technical, and fun events across campus.</p>
          <p className="t-meta mt-6 leading-relaxed">{SITE.dept}<br />{SITE.college}, {SITE.city}</p>
        </div>

        <nav aria-label="Footer">
          <p className="t-label text-mute-hi">Directory</p>
          <ol className="mt-5 space-y-2.5">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`/#${s.id}`} onClick={(e) => { if (location.pathname === '/') { e.preventDefault(); scrollToTarget(s.id) } }} className="group inline-flex items-baseline gap-3 text-[15px] text-frost/85 transition-colors hover:text-frost">
                  <span className="t-num text-[12px] font-[620] text-spark">0{i + 1}</span>
                  <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 ease-[var(--ease-expo)] group-hover:bg-[length:100%_1px]">{s.long}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div>
          <p className="t-label text-mute-hi">Channels & connect</p>
          <ul className="mt-5 space-y-3">
            <li>
              <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-[15px] text-frost/85 transition-colors hover:text-frost">
                <InstagramIcon /> @techspark.navkis <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li className="flex items-center gap-2">
              <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-3 text-[15px] text-frost/85 transition-colors hover:text-frost"><Mail size={17} aria-hidden /> {SITE.email}</a>
              <button type="button" onClick={() => copyText(SITE.email, 'Email copied')} aria-label="Copy email address" className="grid h-8 w-8 place-items-center rounded-full text-mute-hi transition-colors hover:bg-white/5 hover:text-frost"><Copy size={14} /></button>
            </li>
            {CLUB_GITHUB_URL && (
              <li><a href={CLUB_GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-[15px] text-frost/85 transition-colors hover:text-frost"><GithubIcon /> GitHub</a></li>
            )}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-[1440px] flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <p className="t-meta">© 2026 TECHSPARK Student Club. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link to="/admin" viewTransition className="t-meta transition-colors hover:text-frost">Admin login</Link>
          <button type="button" onClick={top} className="t-meta inline-flex items-center gap-2 transition-colors hover:text-frost">Back to top <ArrowUp size={13} /></button>
        </div>
      </div>

      {/* the giant wordmark, cropped by the page edge and lit from beneath */}
      <div aria-hidden className="relative mt-10 select-none">
        <p className="footer-mark t-poster translate-y-[22%] text-center text-[clamp(96px,24.5vw,440px)] leading-[0.8]">Techspark</p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-spark to-transparent shadow-[0_0_30px_6px_rgb(26_159_232/0.75)]" />
      </div>
    </footer>
  )
}
