import { useRef } from 'react'
import { useReveals } from '../lib/reveal'
import { useContent } from '../lib/content'


/** Centred serif statement (Redis's "ultimate design partner" moment) + an endless keyword strip. */
export function Statement() {
  const c = useContent()
  const WORDS = c.statement.marquee
  const root = useRef<HTMLElement>(null)
  useReveals(root, [c.statement.heading])
  return (
    <section ref={root} id="about" aria-labelledby="about-title" data-spark="-0.44 0.05 0.5 0.6" className="relative overflow-hidden bg-void py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1280px] px-[var(--gutter)] text-center">
        <h2 id="about-title" className="t-h1 above-spark mx-auto max-w-[15ch] text-[clamp(48px,8.4vw,148px)]" data-reveal="lines">
          {c.statement.heading}
        </h2>
        <p className="t-body above-spark mx-auto mt-10 max-w-[58ch] text-[clamp(16px,1.3vw,19px)] text-frost/75" data-reveal="lines" data-delay="0.1">
          {c.statement.body}
        </p>
      </div>

      <div className="marquee mt-[clamp(64px,10vh,120px)] border-y border-white/12 py-6" aria-label={WORDS.join(', ')}>
        <div className="marquee__track" aria-hidden>
          {[0, 1].map((k) => (
            <div key={k} className="marquee__set">
              {WORDS.map((w) => (
                <span key={w} className="t-serif flex items-center gap-[clamp(24px,3vw,48px)] whitespace-nowrap text-[clamp(30px,3.6vw,56px)] text-white/85">
                  {w}<span className="text-white/25">/</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
