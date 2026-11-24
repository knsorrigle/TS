import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createHero, type HeroGL } from '../gl/createHero'
import { gsap, lockScroll, reducedMotion, scrollToTarget } from '../lib/motion'
import { hasIgnitedThisSession, markIntroDone } from '../lib/intro'
import { NextEventSpotlight } from '../components/NextEventSpotlight'

const WORD = 'TECHSPARK'

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
          end: '+=150%',
          pin: true,
          scrub: true,
          onUpdate: (st) => gl.current?.setScroll(st.progress),
        },
      })
      tl.to('[data-hero-text]', { yPercent: -22, autoAlpha: 0, duration: 0.3 }, 0)
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
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-void"
    >
      <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />
      {noGL && <StaticAperture />}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-10 bg-void transition-opacity duration-300 ${covered ? 'opacity-100' : 'opacity-0'}`}
      />

      <div ref={content} className="pointer-events-none absolute inset-0 z-20 px-[var(--gutter)]">
        {/* Title card: right-aligned on wide screens, below the vertical seam on phones */}
        <div
          data-hero-text
          className="absolute inset-x-[var(--gutter)] bottom-[19svh] flex flex-col items-start text-left md:bottom-auto md:left-auto md:top-[56%] md:items-end md:text-right"
        >
          <h1 className="leading-none text-frost">
            <span className="sr-only">TECHSPARK</span>
            <span
              aria-hidden
              className="flex overflow-hidden pb-[0.02em] text-[clamp(76px,15.5vw,244px)] font-[280] uppercase leading-[0.8] tracking-[-0.012em] [font-stretch:75%]"
            >
              {[...WORD].map((c, i) => (
                <span key={i} data-letter className="inline-block will-change-transform">{c}</span>
              ))}
            </span>
          </h1>
          <p className="mt-4 overflow-hidden md:mt-5">
            <span data-line className="block text-[12px] font-[600] uppercase tracking-[0.16em] text-frost/90 md:text-[13px]">
              Inspire<span className="text-spark">.</span> Innovate<span className="text-spark">.</span> Integrate<span className="text-spark">.</span>
            </span>
          </p>
        </div>

        {/* Bottom-left meta */}
        <div data-hero-chrome className="absolute bottom-7 left-[var(--gutter)] hidden md:block">
          <p className="overflow-hidden"><span data-line className="t-meta block">Campus chapter <span className="sep" /> Est. 2026</span></p>
          <p className="mt-1.5 overflow-hidden"><span data-line className="t-meta block">Navkis College of Engineering, Hassan</span></p>
        </div>

        {/* Bottom-centre scroll cue */}
        <button
          type="button"
          data-hero-chrome
          data-cursor="ENTER"
          onClick={() => scrollToTarget('intro')}
          className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 p-2"
        >
          <span className="overflow-hidden"><span data-line className="t-meta block">Scroll to enter</span></span>
          <span className="relative block h-12 w-px overflow-hidden bg-frost/15" aria-hidden>
            <span className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-spark to-frost [animation:bead_2.4s_var(--ease-quart)_infinite]" />
          </span>
        </button>

        <div data-hero-chrome className="pointer-events-auto">
          <NextEventSpotlight />
        </div>
      </div>
    </section>
  )
}

/** No-WebGL fallback: a static grainy approximation of the aperture. */
function StaticAperture() {
  // a still frame exported from the shader itself, so no-WebGL visitors see the same light
  return <img aria-hidden src="/hero-still.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
}
