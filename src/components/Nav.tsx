import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { SECTIONS } from '../lib/site'
import { getLenis, gsap, lockScroll, reducedMotion, scrollToTarget } from '../lib/motion'
import { isIntroDone, onIntroDone } from '../lib/intro'
import { Magnetic } from './Magnetic'

/** Letters stacked twice; on hover the column rolls up one line, staggered per letter. */
function SplitLabel({ text }: { text: string }) {
  return (
    <span className="relative inline-flex h-[1.2em] overflow-hidden leading-[1.2em]" aria-hidden>
      {[...text].map((ch, i) => (
        <span
          key={i}
          className="inline-flex flex-col transition-transform duration-[650ms] ease-[var(--ease-expo)] group-hover:-translate-y-1/2 group-focus-visible:-translate-y-1/2"
          style={{ transitionDelay: `${i * 18}ms` }}
        >
          <span>{ch === ' ' ? ' ' : ch}</span>
          <span className="text-spark">{ch === ' ' ? ' ' : ch}</span>
        </span>
      ))}
    </span>
  )
}

export function Nav() {
  const nav = useRef<HTMLElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
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

  // slide the indicator under the active link
  useLayoutEffect(() => {
    const ul = list.current, ind = indicator.current
    if (!ul || !ind) return
    const a = active ? ul.querySelector<HTMLElement>(`[data-id="${active}"]`) : null
    if (!a) { gsap.to(ind, { autoAlpha: 0, duration: 0.4 }); return }
    const ur = ul.getBoundingClientRect(), ar = a.getBoundingClientRect()
    gsap.to(ind, { x: ar.left - ur.left + ar.width / 2 - 2, autoAlpha: 1, duration: 0.9, ease: 'expo.out' })
  }, [active])

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
        className="sr-only-focusable fixed left-4 top-4 z-[120] rounded-full bg-frost px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-void"
      >
        Skip to content
      </a>
      <header
        ref={nav}
        className={[
          'fixed inset-x-0 top-0 z-[100] transition-[transform,background-color,backdrop-filter,border-color] duration-700 ease-[var(--ease-expo)]',
          hidden && !open ? '-translate-y-full' : 'translate-y-0',
          solid ? 'border-b border-line bg-void/55 backdrop-blur-xl backdrop-saturate-150' : 'border-b border-transparent',
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
            className="group flex items-center gap-3"
            aria-label="TECHSPARK — home"
          >
            <img
              src="/logo-128.webp"
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 transition-[filter] duration-700 group-hover:drop-shadow-[0_0_10px_rgb(26_159_232/0.7)] md:h-10 md:w-10"
            />
            <span className="font-display text-[11px] font-normal tracking-[0.42em] text-frost md:text-[12px]">TECHSPARK</span>
          </Link>

          <div className="hidden items-center gap-10 lg:flex">
            <ul ref={list} className="relative flex items-center gap-8">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`/#${s.id}`}
                    data-id={s.id}
                    onClick={go(s.id)}
                    aria-current={active === s.id ? 'true' : undefined}
                    className={[
                      'group block py-3 font-mono text-[10.5px] tracking-[0.26em] transition-colors duration-500',
                      active === s.id ? 'text-frost' : 'text-mute-hi hover:text-frost',
                    ].join(' ')}
                  >
                    <span className="sr-only">{s.label}</span>
                    <SplitLabel text={s.nav} />
                  </a>
                </li>
              ))}
              <span
                ref={indicator}
                aria-hidden
                className="pointer-events-none absolute -bottom-0.5 left-0 h-1 w-1 rounded-full bg-spark opacity-0 shadow-[0_0_10px_2px_rgb(26_159_232/0.8)]"
              />
            </ul>
            <Magnetic>
              <a href="/#events" onClick={go('events')} className="pill pill--sm" data-cursor="RSVP">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-spark opacity-70" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-spark" />
                </span>
                RSVP OPEN
              </a>
            </Magnetic>
          </div>

          <button
            type="button"
            className="group relative flex h-11 items-center gap-3 pl-4 font-mono text-[10.5px] tracking-[0.3em] text-frost lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span>{open ? 'CLOSE' : 'MENU'}</span>
            <span className="relative block h-3 w-5" aria-hidden>
              <span className={`absolute left-0 h-px w-5 bg-frost transition-transform duration-500 ease-[var(--ease-expo)] ${open ? 'top-1.5 rotate-45' : 'top-0.5'}`} />
              <span className={`absolute left-0 h-px bg-frost transition-all duration-500 ease-[var(--ease-expo)] ${open ? 'top-1.5 w-5 -rotate-45' : 'top-2.5 w-3'}`} />
            </span>
          </button>
        </nav>
      </header>

      <div
        id="mobile-menu"
        ref={overlay}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="fixed inset-0 z-[95] hidden flex-col justify-between bg-void px-[var(--gutter)] pb-10 pt-[calc(var(--nav-h)+40px)]"
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
                <span className="font-mono text-[10.5px] tracking-[0.2em] text-spark">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-display text-[clamp(26px,8vw,44px)] font-light uppercase leading-none tracking-[0.04em] text-frost">{s.label}</span>
              </a>
            </li>
          ))}
        </ol>
        <div className="relative flex items-end justify-between" data-stagger>
          <a href="/#events" onClick={go('events')} className="pill pill--spark">RSVP OPEN</a>
          <span className="t-meta text-right">NAVKIS COLLEGE<br />OF ENGINEERING</span>
        </div>
      </div>
    </>
  )
}
