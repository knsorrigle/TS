import { useLayoutEffect, useRef } from 'react'
import { gsap, reducedMotion, scrollToTarget } from '../lib/motion'
import { useReveals } from '../lib/reveal'
import { Magnetic } from '../components/Magnetic'

const WORDS = ['Technology.', 'Creativity.', 'Community.']

/** Three words sit unlit in the dark; a line of light passes down each and lights it. */
export function Intro() {
  const root = useRef<HTMLElement>(null)
  useReveals(root)

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
    <section ref={root} id="intro" aria-labelledby="intro-title" data-spark="0.36 0.1 0.8 0.35" className="relative overflow-hidden bg-void px-[var(--gutter)] pb-[var(--section-pad)] pt-[calc(var(--section-pad)*0.7)]">
      {/* the hero's line arrives here */}
      <div aria-hidden className="absolute left-1/2 top-0 h-[22vh] w-px -translate-x-1/2 bg-gradient-to-b from-frost via-spark/70 to-transparent shadow-[0_0_14px_rgb(26_159_232/0.8)]" />

      <div className="mx-auto max-w-[1440px]">
        <p className="t-label flex items-center justify-center gap-3 text-center" data-reveal="up">
          <span className="text-mute-hi">Campus community</span><span className="h-3 w-px bg-line-strong" aria-hidden /><span>Welcome to Techspark</span>
        </p>

        <h2 id="intro-title" className="sr-only">Technology. Creativity. Community.</h2>
        <div aria-hidden className="mt-[clamp(48px,8vh,96px)] flex flex-col items-center">
          {WORDS.map((w, i) => (
            <div key={w} data-word className="relative">
              <span className="t-serif block text-[clamp(72px,18vw,320px)] leading-[0.86] text-[#0d1526]">{w}</span>
              <span
                data-lit
                className="t-serif absolute inset-0 block text-[clamp(72px,18vw,320px)] leading-[0.86] text-white [text-shadow:0_0_40px_rgb(26_159_232/0.55),0_0_2px_rgb(232_241_255/0.6)]"
                style={{ clipPath: 'inset(0 0 100% 0)' }}
              >
                {w}
              </span>
              <span data-front className="pointer-events-none absolute -inset-x-[6vw] h-px bg-gradient-to-r from-transparent via-frost to-transparent opacity-0 shadow-[0_0_18px_3px_rgb(26_159_232/0.9)]" />
              <span className="t-num absolute -left-2 top-[12%] -translate-x-full text-[12px] font-[650] text-mute-hi max-md:hidden">{`0${i + 1}`}</span>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-[clamp(56px,9vh,112px)] grid max-w-[1100px] items-end gap-10 md:grid-cols-[1.3fr_1fr]">
          <p className="t-body max-w-[52ch] text-[clamp(17px,1.5vw,21px)] leading-[1.5] text-frost/80" data-reveal="lines">
            A student-led college club hosting technical, non-technical, and fun events. Explore technology, participate in events, and build your skills alongside fellow students.
          </p>
          <div className="flex flex-wrap gap-3 md:justify-end" data-reveal="up" data-delay="0.15">
            <Magnetic><button type="button" onClick={() => scrollToTarget('events', { offset: -40 })} className="pill pill--solid" data-cursor="VIEW">Explore events <span aria-hidden>→</span></button></Magnetic>
            <Magnetic><button type="button" onClick={() => scrollToTarget('about')} className="pill">Discover Techspark</button></Magnetic>
          </div>
        </div>
      </div>
    </section>
  )
}
