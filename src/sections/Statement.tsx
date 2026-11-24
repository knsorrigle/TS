import { useRef } from 'react'
import { useReveals } from '../lib/reveal'

const WORDS = ['Hackathons', 'Workshops', 'Tech Talks', 'Quizzes', 'Design Showcases', 'Trivia', 'Mixers', 'Coding Competitions', 'Presentation Jams', 'Team Challenges']

/** Centred serif statement (Redis's "ultimate design partner" moment) + an endless keyword strip. */
export function Statement() {
  const root = useRef<HTMLElement>(null)
  useReveals(root)
  return (
    <section ref={root} id="about" aria-labelledby="about-title" data-spark="-0.38 -0.05 0.75 0.6" className="relative overflow-hidden bg-void py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1280px] px-[var(--gutter)] text-center">
        <p className="t-label text-mute-hi" data-reveal="up">Student-led initiative <span className="sep" /> Campus based</p>
        <h2 id="about-title" className="t-h1 above-spark mx-auto mt-8 max-w-[15ch] text-[clamp(48px,8.4vw,148px)]" data-reveal="lines">
          Bringing students together through campus events.
        </h2>
        <p className="t-body above-spark mx-auto mt-10 max-w-[58ch] text-[clamp(16px,1.3vw,19px)] text-frost/75" data-reveal="lines" data-delay="0.1">
          TECHSPARK is a student-led college club dedicated to bringing students together through engaging campus events. We create opportunities for students of all backgrounds to participate, collaborate, and explore new interests—spanning hands-on technical activities, creative non-technical challenges, and lively social events.
        </p>
      </div>

      <div className="marquee mt-[clamp(64px,10vh,120px)] border-y border-white/12 py-6" aria-label={WORDS.join(', ')}>
        <div className="marquee__track" aria-hidden>
          {[0, 1].map((k) => (
            <div key={k} className="marquee__set">
              {WORDS.map((w) => (
                <span key={w} className="t-serif flex items-center gap-[clamp(24px,3vw,48px)] whitespace-nowrap text-[clamp(30px,3.6vw,56px)] text-white/85">
                  {w}<span className="h-1.5 w-1.5 rounded-full bg-spark shadow-[0_0_10px_rgb(26_159_232)]" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
