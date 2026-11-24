import { useLayoutEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../lib/motion'
import { useReveals } from '../lib/reveal'
import { SectionHead } from '../components/SectionHead'

export function About() {
  const root = useRef<HTMLElement>(null)
  const pillar = useRef<HTMLDivElement>(null)
  useReveals(root)

  // the column of light brightens as the section reaches centre
  useLayoutEffect(() => {
    if (!pillar.current) return
    if (reducedMotion()) { gsap.set(pillar.current, { opacity: 0.85, scaleY: 1 }); return }
    const t = gsap.fromTo(pillar.current, { opacity: 0, scaleY: 0.35 }, {
      opacity: 1, scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: pillar.current, start: 'top 85%', end: 'center 50%', scrub: 0.8 },
    })
    return () => { t.scrollTrigger?.kill(); t.kill() }
  }, [])

  return (
    <section ref={root} id="about" aria-labelledby="about-title" className="relative bg-void px-[var(--gutter)] py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1440px]">
        <SectionHead index="02" label="About Techspark" aside={<>Student-led initiative <span className="sep" /> Campus based</>} />

        <h2 id="about-title" className="t-h1 mt-[clamp(40px,7vh,88px)] max-w-[14ch] text-[clamp(44px,7.2vw,124px)] text-frost" data-reveal="lines">
          Bringing students together through campus events.
        </h2>

        <div className="mt-[clamp(56px,10vh,120px)] grid gap-14 lg:grid-cols-[1.1fr_auto_1fr] lg:gap-[clamp(40px,5vw,96px)]">
          <div>
            <h3 className="t-h2 text-[clamp(22px,2vw,30px)] text-spark" data-reveal="lines">A Broader Campus Experience</h3>
            <p className="t-body mt-5 max-w-[56ch]" data-reveal="lines" data-delay="0.1">
              TECHSPARK is a student-led college club dedicated to bringing students together through engaging campus events. We create opportunities for students of all backgrounds to participate, collaborate, and explore new interests—spanning hands-on technical activities, creative non-technical challenges, and lively social events.
            </p>
          </div>

          <div aria-hidden className="relative hidden w-px self-stretch lg:block">
            <div
              ref={pillar}
              className="absolute -inset-x-[38px] inset-y-[-12%] origin-center"
              style={{
                background: 'radial-gradient(50% 50% at 50% 52%, rgb(232 241 255 / 0.95) 0%, rgb(123 134 232 / 0.75) 16%, rgb(26 159 232 / 0.35) 38%, transparent 70%)',
                filter: 'blur(14px)',
                maskImage: 'linear-gradient(90deg, transparent, #000 35%, #000 65%, transparent)',
              }}
            />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-frost/70 to-transparent" />
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-1">
            {[
              { k: 'A.01', t: 'How we host events', b: 'We identify ideas that excite students, organize and structure each activity, announce upcoming schedules, and open registrations so everyone has a clear path to participate.' },
              { k: 'A.02', t: 'Inclusive community', b: 'From fast-paced hackathons and technical workshops to fun team competitions and social gatherings, our events are designed to make campus life active, collaborative, and rewarding.' },
            ].map((b, i) => (
              <article key={b.k} className="border-t border-line pt-5" data-reveal="up" data-delay={String(0.1 * i)}>
                <p className="t-num text-[12px] font-[650] text-spark">{b.k}</p>
                <h3 className="t-h2 mt-3 text-[22px] text-frost">{b.t}</h3>
                <p className="t-body mt-3">{b.b}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
