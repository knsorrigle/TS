import { useRef } from 'react'
import { useReveals } from '../lib/reveal'
import { useContent } from '../lib/content'

/** Redis "services": hairline rows, serif name left, em-dash list right. Every row is editable in admin. */
export function WhatWeDo() {
  const root = useRef<HTMLElement>(null)
  const c = useContent()
  useReveals(root, [c.whatWeDo.rows.length])
  return (
    <section ref={root} id="activities" aria-labelledby="activities-title" data-spark="0.45 -0.05 0.45 0.9" className="relative bg-void px-[var(--gutter)] py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1440px]">
        <h2 id="activities-title" className="t-h1 above-spark text-[clamp(64px,11vw,190px)]" data-reveal="lines">{c.whatWeDo.heading}</h2>
        <p className="t-body mt-5 max-w-[48ch]" data-reveal="up">{c.whatWeDo.sub}</p>

        <ul className="mt-[clamp(48px,8vh,96px)] border-t border-white/15">
          {c.whatWeDo.rows.map((r, i) => (
            <li key={`${r.title}-${i}`} className="grid gap-6 border-b border-white/15 py-[clamp(28px,4.5vh,52px)] md:grid-cols-[1.1fr_1fr] md:gap-10" data-reveal="up">
              <h3 className={`t-h1 above-spark ${r.category ? 'text-[clamp(40px,5.2vw,84px)]' : 'text-[clamp(36px,4.4vw,72px)]'}`}>
                {r.title}{r.muted && <span className="text-mute"> {r.muted}</span>}
              </h3>
              <div className="above-spark">
                {r.items.length > 0 && (
                  <ul className="space-y-1 text-[clamp(16px,1.3vw,19px)] text-white">
                    {r.items.map((t) => <li key={t}><span className="mr-3 text-mute">—</span>{t}</li>)}
                  </ul>
                )}
                {r.body && <p className="t-body mt-5 max-w-[46ch]">{r.body}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
