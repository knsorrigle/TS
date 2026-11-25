import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { SECTIONS } from '../lib/site'
import { getLenis, gsap, lockScroll, reducedMotion, scrollToTarget } from '../lib/motion'
import { isIntroDone, onIntroDone } from '../lib/intro'


export function Nav() {
  const nav = useRef<HTMLElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(isIntroDone())
  const location = useLocation()
  const navigate = useNavigate()
  const onHome = location.pathname === '/'

  useEffect(() => onIntroDone(() => setReady(true)), [])

  // reveal with the hero
  useLayoutEffect(() => {
    if (!nav.current) return
    if (!ready) { gsap.set(nav.current, { autoAlpha: 0, y: -12 }); return }
    gsap.to(nav.current, { autoAlpha: 1, y: 0, duration: reducedMotion() ? 0.2 : 1.2, ease: 'expo.out', delay: 0.15 })
  }, [ready])

  // transparent → blurred black; hide on scroll down, reveal on scroll up
  useEffect(() => {
    let last = window.scrollY
    const on = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 240)
        last = y
      }
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  // active section
  useEffect(() => {
    if (!onHome) { setActive(null); return }
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (vis) setActive(vis.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.01] },
    )
    els.forEach((el) => io.observe(el))
    const top = () => { if (window.scrollY < window.innerHeight * 0.6) setActive(null) }
    window.addEventListener('scroll', top, { passive: true })
    return () => { io.disconnect(); window.removeEventListener('scroll', top) }
  }, [onHome, location.key])

  // mobile overlay
  useEffect(() => {
    const el = overlay.current
    if (!el) return
    lockScroll(open)
    const items = el.querySelectorAll('[data-stagger]')
    if (open) {
      gsap.set(el, { display: 'flex' })
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'expo.inOut' })
      gsap.fromTo(items, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.06, duration: 1, delay: 0.35 })
      el.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true })
      const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
      window.addEventListener('keydown', esc)
      return () => window.removeEventListener('keydown', esc)
    }
    gsap.to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.7, ease: 'expo.inOut', onComplete: () => { gsap.set(el, { display: 'none' }) } })
  }, [open])

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    if (onHome) {
      // let the overlay close before travelling
      setTimeout(() => scrollToTarget(id, { offset: id === 'events' ? -40 : 0 }), open ? 380 : 0)
    } else {
      navigate(`/#${id}`, { viewTransition: true })
    }
  }

  const solid = scrolled || open || !onHome

  return (
    <>
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-4 z-[120] rounded-full bg-frost px-4 py-2 text-[12px] font-[600] uppercase tracking-[0.06em] text-void"
      >
        Skip to content
      </a>
      <header
        ref={nav}
        className={[
          'fixed inset-x-0 top-0 z-[100] transition-[transform,background-color,backdrop-filter,border-color] duration-700 ease-[var(--ease-expo)]',
          hidden && !open ? '-translate-y-full' : 'translate-y-0',
          solid ? 'nav-scrim' : '',
        ].join(' ')}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-[var(--nav-h)] items-center justify-between px-[var(--gutter)]"
        >
          <Link
            to="/"
            viewTransition
            onClick={(e) => { if (onHome) { e.preventDefault(); setOpen(false); getLenis() ? getLenis()!.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0, behavior: 'smooth' }) } }}
            className="tap-44 group flex items-center gap-3"
            aria-label="TECHSPARK — home"
          >
            <img
              src="/logo-128.webp"
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 transition-[filter] duration-700 group-hover:drop-shadow-[0_0_10px_rgb(26_159_232/0.7)] md:h-10 md:w-10"
            />
            <span className="text-[13px] font-[680] uppercase tracking-[0.05em] text-frost [font-stretch:115%]">Techspark</span>
          </Link>

          <ul ref={list} className="relative hidden items-center gap-1.5 lg:flex">
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <a
                  href={`/#${sec.id}`}
                  data-id={sec.id}
                  onClick={go(sec.id)}
                  aria-current={active === sec.id ? 'true' : undefined}
                  className={`group nav-pill ${active === sec.id ? 'is-active' : ''}`}
                >
                  {sec.label}
                </a>
              </li>
            ))}
          </ul>

          <a href="#contact" onClick={go('contact')} className="nav-pill hidden lg:inline-flex">Get in touch</a>

          <button
            type="button"
            className="pill pill--sm !h-9 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span>{open ? 'Close' : 'Menu'}</span>
          </button>
        </nav>
      </header>

      <div
        id="mobile-menu"
        data-lenis-prevent
        ref={overlay}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="fixed inset-0 z-[95] hidden flex-col justify-between bg-void/80 px-[var(--gutter)] pb-10 pt-[calc(var(--nav-h)+40px)] backdrop-blur-[2px]"
        style={{ clipPath: 'inset(0 0 100% 0)' }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[45vh] opacity-60"
          style={{ background: 'radial-gradient(70% 60% at 50% 120%, rgb(0 87 255 / 0.55), rgb(26 159 232 / 0.12) 45%, transparent 70%)' }} />
        <ol className="relative flex flex-col gap-1">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="overflow-hidden border-b border-line">
              <a
                href={`/#${s.id}`}
                onClick={go(s.id)}
                data-stagger
                className="flex items-baseline gap-5 py-4 active:opacity-70"
              >
                <span className="t-num text-[12px] font-[600] text-spark">{String(i + 1).padStart(2, '0')}</span>
                <span className="t-h1 text-[clamp(52px,16vw,88px)]">{s.label}</span>
              </a>
            </li>
          ))}
        </ol>
        <div className="relative flex items-end justify-between" data-stagger>
          <a href="#contact" onClick={go('contact')} className="pill">Get in touch</a>
          <span className="t-meta text-right">Navkis College<br />of Engineering, Hassan</span>
        </div>
      </div>
    </>
  )
}

