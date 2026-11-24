import { useRef } from 'react'
import { useReveals } from '../lib/reveal'
import { scrollToTarget } from '../lib/motion'
import { SITE } from '../lib/site'
import { GradientCanvas } from '../components/GradientCanvas'
import { Magnetic } from '../components/Magnetic'

/** Daybreak: light rising from a low horizon, with the type sitting on it in ink. */
export function ClosingCta() {
  const root = useRef<HTMLElement>(null)
  useReveals(root)
  return (
    <section ref={root} aria-labelledby="cta-title" data-spark="0 -0.05 1.05 2.6" className="relative overflow-hidden bg-void">
      <div className="relative min-h-[100svh]">
        <GradientCanvas mode={3} />
        <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-void to-transparent" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-[1440px] flex-col justify-end px-[var(--gutter)] pb-[clamp(56px,12vh,140px)] pt-[30vh]">
          <p className="t-label above-spark !text-void/75" data-reveal="up">Student-led campus community</p>
          <h2 id="cta-title" className="t-serif above-spark mt-5 text-[clamp(64px,12vw,210px)] leading-[0.86] text-void" data-reveal="lines">
            Experience campus<br />beyond limits.
          </h2>
          <div className="above-spark mt-10 grid items-end gap-8 md:grid-cols-[1fr_auto]">
            <p className="max-w-[46ch] text-[clamp(16px,1.35vw,19px)] leading-[1.55] text-void/80" data-reveal="lines">
              Discover upcoming events and participate in technical, non-technical, and fun activities with fellow students.
            </p>
            <div className="flex flex-wrap gap-3" data-reveal="up" data-delay="0.15">
              <Magnetic><button type="button" onClick={() => scrollToTarget('events', { offset: -40 })} className="pill !bg-void !text-frost hover:!shadow-[0_0_40px_-6px_rgb(0_0_0/0.6)]" data-cursor="VIEW">Explore events <span aria-hidden>→</span></button></Magnetic>
              <Magnetic><a href={`mailto:${SITE.email}`} className="pill !text-void before:!border-void/40 hover:before:!border-void">Contact the club</a></Magnetic>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
