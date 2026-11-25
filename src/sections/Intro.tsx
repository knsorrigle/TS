import { useLayoutEffect, useRef } from 'react'
import { gsap, reducedMotion, scrollToTarget } from '../lib/motion'
import { useReveals } from '../lib/reveal'
import { useContent } from '../lib/content'
import { Magnetic } from '../components/Magnetic'


/** Three words sit unlit in the dark; a line of light passes down each and lights it. */
export function Intro() {
  const c = useContent()
  const WORDS = c.intro.words
  const root = useRef<HTMLElement>(null)
  useReveals(root, [WORDS.join('|')])

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    if (reducedMotion()) {
      gsap.set(el.querySelectorAll('[data-lit]'), { clipPath: 'inset(0 0 0% 0)' })
      gsap.set(el.querySelectorAll('[data-front]'), { autoAlpha: 0 })
      return
    }
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>('[data-word]').forEach((w) => {
        const lit = w.querySelector('[data-lit]')
        const front = w.querySelector('[data-front]')
        const tl = gsap.timeline({ scrollTrigger: { trigger: w, start: 'top 78%', end: 'bottom 46%', scrub: 0.6 } })
        tl.fromTo(lit, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', ease: 'none' }, 0)
          .fromTo(front, { top: '0%', autoAlpha: 0 }, { top: '100%', ease: 'none' }, 0)
          .to(front, { autoAlpha: 1, duration: 0.12, ease: 'none' }, 0)
          .to(front, { autoAlpha: 0, duration: 0.15, ease: 'none' }, 0.85)
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} id="intro" aria-labelledby="intro-title" data-spark="0.43 0.18 0.55 0.35" className="relative overflow-hidden bg-void px-[var(--gutter)] pb-[var(--section-pad)] pt-[calc(var(--section-pad)*0.7)]">
      {/* the hero's line arrives here */}
      <div aria-hidden className="absolute left-1/2 top-0 h-[22vh] w-px -translate-x-1/2 bg-gradient-to-b from-white/80 via-spark/50 to-transparent" />

      <div className="mx-auto max-w-[1440px]">

        <h2 id="intro-title" className="sr-only">{WORDS.join(' ')}</h2>
        <div aria-hidden className="flex flex-col items-center">
          {WORDS.map((w) => (
            <div key={w} data-word className="relative">
              <span className="t-serif block text-[clamp(64px,15vw,260px)] leading-[0.86] text-[#0d1526]">{w}</span>
              <span
                data-lit
                className="t-serif absolute inset-0 block text-[clamp(64px,15vw,260px)] leading-[0.86] text-white"
                style={{ clipPath: 'inset(0 0 100% 0)' }}
              >
                {w}
              </span>
              <span data-front className="pointer-events-none absolute -inset-x-[6vw] h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0" />
              
            </div>
          ))}
        </div>

        <div className="mx-auto mt-[clamp(56px,9vh,112px)] grid max-w-[1100px] items-end gap-10 md:grid-cols-[1.3fr_1fr]">
          <p className="t-body max-w-[52ch] text-[clamp(17px,1.5vw,21px)] leading-[1.5] text-frost/80" data-reveal="lines">
            {c.intro.body}
          </p>
          <div className="flex flex-wrap gap-3 md:justify-end" data-reveal="up" data-delay="0.15">
            <Magnetic><button type="button" onClick={() => scrollToTarget('events', { offset: -40 })} className="pill pill--solid">{c.intro.primaryCta} <span aria-hidden>→</span></button></Magnetic>
            <Magnetic><button type="button" onClick={() => scrollToTarget('about')} className="pill">{c.intro.secondaryCta}</button></Magnetic>
          </div>
        </div>
      </div>
    </section>
  )
}
