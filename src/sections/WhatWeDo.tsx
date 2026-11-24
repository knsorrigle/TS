import { useRef } from 'react'
import { CATEGORIES } from '../lib/site'
import { useReveals } from '../lib/reveal'

const MORE = [
  { title: 'How we host events', items: ['Find ideas that excite students', 'Structure every activity', 'Announce schedules early', 'Open registrations for all'], body: 'We identify ideas that excite students, organize and structure each activity, announce upcoming schedules, and open registrations so everyone has a clear path to participate.' },
  { title: 'Inclusive community', items: ['Every department welcome', 'Teams and solo formats', 'Beginners to builders'], body: 'From fast-paced hackathons and technical workshops to fun team competitions and social gatherings, our events are designed to make campus life active, collaborative, and rewarding.' },
]

/** Redis "services": hairline rows, serif name left, em-dash list right. Category rows carry a living light pillar. */
export function WhatWeDo() {
  const root = useRef<HTMLElement>(null)
  useReveals(root)
  return (
    <section ref={root} id="activities" aria-labelledby="activities-title" data-spark="0.4 0 0.7 0.9" className="relative bg-void px-[var(--gutter)] py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1440px]">
        <h2 id="activities-title" className="t-h1 above-spark text-[clamp(64px,11vw,190px)]" data-reveal="lines">What we do</h2>
        <p className="t-body mt-5 max-w-[48ch]" data-reveal="up">Student-led activities covering technical, creative, and social experiences.</p>

        <ul className="mt-[clamp(48px,8vh,96px)] border-t border-white/15">
          {CATEGORIES.map((c) => {
            return (
              <li key={c.key} className="grid gap-6 border-b border-white/15 py-[clamp(28px,4.5vh,52px)] md:grid-cols-[1.1fr_1fr] md:gap-10" data-reveal="up">
                <h3 className="t-h1 above-spark text-[clamp(40px,5.2vw,84px)]">
                  {c.title.replace(' Events', '')}<span className="text-mute"> events</span>
                </h3>
                <div className="above-spark">
                  <ul className="space-y-1 text-[clamp(16px,1.3vw,19px)] text-white">
                    {c.tags.map((t) => <li key={t}><span className="mr-3 text-mute">—</span>{t}</li>)}
                  </ul>
                  <p className="t-body mt-5 max-w-[46ch]">{c.body}</p>
                </div>
              </li>
            )
          })}
          {MORE.map((m) => (
            <li key={m.title} className="grid gap-6 border-b border-white/15 py-[clamp(28px,4.5vh,52px)] md:grid-cols-[1.1fr_1fr] md:gap-10" data-reveal="up">
              <h3 className="t-h1 above-spark text-[clamp(36px,4.4vw,72px)]">{m.title}</h3>
              <div className="above-spark">
                <ul className="space-y-1 text-[clamp(16px,1.3vw,19px)] text-white">
                  {m.items.map((t) => <li key={t}><span className="mr-3 text-mute">—</span>{t}</li>)}
                </ul>
                <p className="t-body mt-5 max-w-[46ch]">{m.body}</p>
              </div>
            </li>
          ))}
        </ul>

      </div>
    </section>
  )
}
