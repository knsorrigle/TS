import { useRef, useState } from 'react'
import { CATEGORIES, CATEGORY_META } from '../lib/site'
import { useReveals } from '../lib/reveal'
import { openRegister } from '../lib/registerStore'
import { scrollToTarget } from '../lib/motion'
import { useNextEvent } from '../lib/useEvents'
import { GradientCanvas } from '../components/GradientCanvas'
import { Magnetic } from '../components/Magnetic'

const MORE = [
  { title: 'How we host events', items: ['Find ideas that excite students', 'Structure every activity', 'Announce schedules early', 'Open registrations for all'], body: 'We identify ideas that excite students, organize and structure each activity, announce upcoming schedules, and open registrations so everyone has a clear path to participate.' },
  { title: 'Inclusive community', items: ['Every department welcome', 'Teams and solo formats', 'Beginners to builders'], body: 'From fast-paced hackathons and technical workshops to fun team competitions and social gatherings, our events are designed to make campus life active, collaborative, and rewarding.' },
]

/** Redis "services": hairline rows, serif name left, em-dash list right. Category rows carry a living light pillar. */
export function WhatWeDo() {
  const root = useRef<HTMLElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const next = useNextEvent()
  useReveals(root)
  return (
    <section ref={root} id="activities" aria-labelledby="activities-title" data-spark="0.4 0 0.7 0.9" className="relative bg-void px-[var(--gutter)] py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1440px]">
        <h2 id="activities-title" className="t-h1 above-spark text-[clamp(64px,11vw,190px)]" data-reveal="lines">What we do</h2>
        <p className="t-body mt-5 max-w-[48ch]" data-reveal="up">Student-led activities covering technical, creative, and social experiences.</p>

        <ul className="mt-[clamp(48px,8vh,96px)] border-t border-white/15">
          {CATEGORIES.map((c, i) => {
            const meta = CATEGORY_META[c.key]
            const on = hover === i
            return (
              <li key={c.key} className="group relative grid gap-6 border-b border-white/15 py-[clamp(28px,4.5vh,52px)] md:grid-cols-[1.1fr_1fr_120px] md:gap-10"
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} data-reveal="up">
                <h3 className="t-h1 above-spark text-[clamp(40px,5.2vw,84px)]">
                  {c.title.replace(' Events', '')}<span className="text-mute"> events</span>
                </h3>
                <div className="above-spark">
                  <ul className="space-y-1 text-[clamp(16px,1.3vw,19px)] text-white">
                    {c.tags.map((t) => <li key={t}><span className="mr-3 text-mute">—</span>{t}</li>)}
                  </ul>
                  <p className="t-body mt-5 max-w-[46ch]">{c.body}</p>
                </div>
                <div aria-hidden className="relative h-28 overflow-hidden rounded-full md:h-auto md:min-h-[180px]" style={{ boxShadow: on ? `0 0 60px -10px rgb(${meta.glow} / 0.8)` : 'none', transition: 'box-shadow 1s var(--ease-expo)' }}>
                  <GradientCanvas mode={c.mode} pillar active={on ? 1 : 0.22} />
                </div>
              </li>
            )
          })}
          {MORE.map((m) => (
            <li key={m.title} className="grid gap-6 border-b border-white/15 py-[clamp(28px,4.5vh,52px)] md:grid-cols-[1.1fr_1fr_120px] md:gap-10" data-reveal="up">
              <h3 className="t-h1 above-spark text-[clamp(36px,4.4vw,72px)]">{m.title}</h3>
              <div className="above-spark">
                <ul className="space-y-1 text-[clamp(16px,1.3vw,19px)] text-white">
                  {m.items.map((t) => <li key={t}><span className="mr-3 text-mute">—</span>{t}</li>)}
                </ul>
                <p className="t-body mt-5 max-w-[46ch]">{m.body}</p>
              </div>
              <span className="hidden md:block" />
            </li>
          ))}
        </ul>

        <div className="mt-14 flex justify-center" data-reveal="up">
          <Magnetic>
            <button type="button" onClick={() => (next ? openRegister(next) : scrollToTarget('events', { offset: -40 }))} className="pill pill--solid !h-12 !px-7" data-cursor="REGISTER">
              Register for an event <span aria-hidden>→</span>
            </button>
          </Magnetic>
        </div>
      </div>
    </section>
  )
}
