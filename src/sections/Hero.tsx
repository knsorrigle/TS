import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createHero, type HeroGL } from '../gl/createHero'
import { gsap, lockScroll, reducedMotion, scrollToTarget } from '../lib/motion'
import { hasIgnitedThisSession, markIntroDone } from '../lib/intro'
import { TicketStub } from '../components/TicketStub'


export function Hero() {
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const gl = useRef<HeroGL | null>(null)
  const [noGL, setNoGL] = useState(false)
  const [covered, setCovered] = useState(true) // black cover until the first GL frame exists

  // ── WebGL lifetime + ignition (this IS the preloader)
  useEffect(() => {
    const reduced = reducedMotion()
    const skip = hasIgnitedThisSession()
    let hero: HeroGL
    try {
      hero = createHero(canvas.current!, { reduced })
    } catch {
      setNoGL(true)
      setCovered(false)
      markIntroDone()
      return
    }
    gl.current = hero
    if (!skip && !reduced) lockScroll(true)
    requestAnimationFrame(() => setCovered(false))
    hero.ignite({
      skip, reduced,
      onDone: () => { if (!skip && !reduced) lockScroll(false) },
    })
    // chrome (text, nav) arrives while the aperture is still opening: one gesture, not two
    const t = setTimeout(markIntroDone, skip || reduced ? 0 : 1050)

    const io = new IntersectionObserver(([e]) => hero.setVisible(e.isIntersecting), { threshold: 0 })
    io.observe(canvas.current!)

    const move = (e: PointerEvent) => {
      hero.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1))
    }
    // phones: a gentle tilt-free idle drift instead of pointer
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      clearTimeout(t)
      lockScroll(false)
      window.removeEventListener('pointermove', move)
      io.disconnect()
      hero.destroy()
      gl.current = null
    }
  }, [])

  // ── text reveal, synced to ignition
  useLayoutEffect(() => {
    const root = content.current
    if (!root) return
    const letters = root.querySelectorAll('[data-letter]')
    const lines = root.querySelectorAll('[data-line]')
    const reduced = reducedMotion()
    const ctx = gsap.context(() => {
      gsap.set(letters, { yPercent: 105 })
      gsap.set(lines, { yPercent: 110 })
      const delay = hasIgnitedThisSession() || reduced ? 0.15 : 1.1
      if (reduced) {
        gsap.set([letters, lines], { yPercent: 0 })
        gsap.from(root, { autoAlpha: 0, duration: 0.3 })
        return
      }
      const tl = gsap.timeline({ delay })
      tl.to(letters, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: { each: 0.045, from: 'end' } })
        .to(lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, '-=1.1')
    }, root)
    return () => ctx.revert()
  }, [])

  // ── scroll: pin, open the aperture, flood, collapse to a line
  useLayoutEffect(() => {
    if (reducedMotion() || !section.current) return
    const ctx = gsap.context(() => {
      // one pinned, scrubbed timeline drives both the shader and the type (0 → 1 over the pin)
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: '+=110%',
          pin: true,
          scrub: true,
          onUpdate: (st) => gl.current?.setScroll(st.progress),
        },
      })
      tl.to('[data-hero-text]', { yPercent: -60, autoAlpha: 0, duration: 0.35 }, 0)
        .to('[data-hero-chrome]', { autoAlpha: 0, duration: 0.15 }, 0)
        .set({}, {}, 1) // pad the timeline to the full pin length
    }, section)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={section}
      id="top"
      aria-label="TECHSPARK — Inspire. Innovate. Integrate."
      data-spark="0 0 1.25 0"
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-void"
    >
      <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />
      {noGL && <StaticAperture />}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-10 bg-void transition-opacity duration-300 ${covered ? 'opacity-100' : 'opacity-0'}`}
      />

      <div ref={content} className="pointer-events-none absolute inset-0 px-[var(--gutter)]">
        {/* Tech / Spark — the seam of light runs between the two lines; the crystal sits in it,
            in front of "Spark" and behind "Tech" */}
        <h1 data-hero-text className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-white">
          <span className="sr-only">TECHSPARK</span>
          <span aria-hidden className="t-serif above-spark block overflow-hidden pb-[0.04em] text-[clamp(112px,23vw,400px)] leading-[0.78]">
            {[...'Tech'].map((c, i) => <span key={i} data-letter className="inline-block will-change-transform">{c}</span>)}
          </span>
          <span aria-hidden className="t-serif relative z-20 mt-[clamp(10px,2.2vw,34px)] block overflow-hidden pb-[0.06em] text-[clamp(112px,23vw,400px)] leading-[0.78]">
            {[...'Spark'].map((c, i) => <span key={i} data-letter className="inline-block will-change-transform">{c}</span>)}
          </span>
        </h1>

        {/* bottom-left: the ticket stub */}
        <div data-hero-chrome className="pointer-events-auto absolute bottom-6 left-[var(--gutter)] z-50">
          <div className="overflow-hidden"><div data-line><TicketStub /></div></div>
        </div>

        {/* bottom-right: tagline */}
        <div data-hero-chrome className="above-spark absolute bottom-6 right-[var(--gutter)] hidden max-w-[300px] text-right md:block">
          <p className="overflow-hidden"><span data-line className="block text-[12.5px] font-[650] uppercase tracking-[0.12em] text-white">
            Inspire<span className="text-spark">.</span> Innovate<span className="text-spark">.</span> Integrate<span className="text-spark">.</span>
          </span></p>
          <p className="mt-2 overflow-hidden"><span data-line className="block text-[14px] leading-snug text-mute-hi">A student-led college club hosting technical, non-technical, and fun events.</span></p>
        </div>

        {/* mobile tagline */}
        <p data-hero-chrome className="absolute inset-x-0 top-[calc(var(--nav-h)+20px)] overflow-hidden text-center md:hidden">
          <span data-line className="block text-[11.5px] font-[650] uppercase tracking-[0.12em] text-white">Inspire<span className="text-spark">.</span> Innovate<span className="text-spark">.</span> Integrate<span className="text-spark">.</span></span>
        </p>

        {/* scroll cue */}
        <button type="button" data-hero-chrome data-cursor="ENTER" onClick={() => scrollToTarget('intro')} aria-label="Scroll to content"
          className="pointer-events-auto absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 p-2 md:flex">
          <span className="relative block h-10 w-px overflow-hidden bg-white/15" aria-hidden>
            <span className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-spark to-white [animation:bead_2.4s_var(--ease-quart)_infinite]" />
          </span>
        </button>
      </div>
    </section>
  )
}

/** No-WebGL fallback: a static grainy approximation of the aperture. */
function StaticAperture() {
  // a still frame exported from the shader itself, so no-WebGL visitors see the same light
  return <img aria-hidden src="/hero-still.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
}
