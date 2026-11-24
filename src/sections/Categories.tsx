import { useLayoutEffect, useRef, useState } from 'react'
import { CATEGORIES, CATEGORY_META } from '../lib/site'
import { gsap } from '../lib/motion'
import { useReveals } from '../lib/reveal'
import { useDesktop, useReducedMotion } from '../lib/useMedia'
import { GradientCanvas } from '../components/GradientCanvas'
import { SectionHead } from '../components/SectionHead'
import { scrollToTarget } from '../lib/motion'

/** Three lights. Pinned on desktop: as you scroll, each category takes the light in turn. */
export function Categories() {
  const desktop = useDesktop()
  const reduced = useReducedMotion()
  return desktop && !reduced ? <PinnedLights /> : <StackedBands />
}

function Header() {
  return (
    <div>
      <SectionHead index="03" label="What we do" aside="Student-led activities" />
      <h2 id="activities-title" className="t-h1 mt-8 text-[clamp(40px,5.4vw,88px)] text-frost" data-reveal="lines">Event categories</h2>
      <p className="t-body mt-4 max-w-[52ch]" data-reveal="lines" data-delay="0.1">
        Student-led activities covering technical, creative, and social experiences.
      </p>
    </div>
  )
}

function Tags({ tags, glow }: { tags: string[]; glow: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <li key={t} className="rounded-full border px-3 py-1.5 text-[12.5px] text-frost/85" style={{ borderColor: `rgb(${glow} / 0.35)`, background: `rgb(${glow} / 0.06)` }}>
          <span className="opacity-60">#</span>{t}
        </li>
      ))}
    </ul>
  )
}

function PinnedLights() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  useReveals(root)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          trigger: stage.current,
          start: 'top top',
          end: '+=210%',
          pin: true,
          scrub: true,
          onUpdate: (st) => {
            const i = Math.min(2, Math.floor(st.progress * 3 * 0.999))
            if (i !== activeRef.current) { activeRef.current = i; setActive(i) }
            stage.current?.style.setProperty('--p', String(st.progress))
          },
        },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  // swap the copy with a masked line transition
  const copy = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = copy.current
    if (!el) return
    const lines = el.querySelectorAll('[data-swap]')
    gsap.fromTo(lines, { yPercent: 105, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', stagger: 0.06 })
  }, [active])

  const cat = CATEGORIES[active]
  const meta = CATEGORY_META[cat.key]
  const widths = [[1.25, 0.55, 0.42], [0.5, 1.3, 0.45], [0.48, 0.55, 1.3]][active]

  return (
    <section ref={root} id="activities" aria-labelledby="activities-title" className="relative bg-void">
      <div className="mx-auto max-w-[1440px] px-[var(--gutter)] pt-[var(--section-pad)]">
        <Header />
      </div>

      <div ref={stage} className="relative h-[100svh] overflow-hidden">
        {/* ref-02 meta rail */}
        <div className="absolute inset-x-[var(--gutter)] top-[calc(var(--nav-h)+20px)] flex justify-between t-meta">
          <span>Cat_0{active + 1}</span>
          <span>{meta.short}</span>
          <span>{cat.rail}</span>
        </div>

        <div className="absolute inset-0 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-[clamp(32px,4vw,72px)] px-[var(--gutter)] pb-[8vh] pt-[calc(var(--nav-h)+72px)]">
          {/* pillars */}
          <div className="flex h-full items-stretch gap-[clamp(10px,1.2vw,20px)]" aria-hidden>
            {CATEGORIES.map((c, i) => (
              <div
                key={c.key}
                className="relative overflow-hidden transition-[flex-grow,opacity] duration-[1400ms] ease-[var(--ease-expo)]"
                style={{ flexGrow: widths[i], flexBasis: 0, opacity: i === active ? 1 : 0.75 }}
              >
                <GradientCanvas mode={c.mode} pillar active={i === active ? 1 : 0} />
                <span className="t-num absolute bottom-3 left-3 text-[11px] font-[650] text-frost/70">0{i + 1}</span>
              </div>
            ))}
          </div>

          {/* copy */}
          <div ref={copy} className="flex flex-col justify-center" aria-live="polite">
            <p className="overflow-hidden"><span data-swap className="t-num block text-[13px] font-[650]" style={{ color: meta.to }}>0{active + 1} / 03</span></p>
            <h3 className="mt-5 overflow-hidden"><span data-swap className="t-h1 block text-[clamp(40px,4.6vw,76px)] text-frost">{cat.title}</span></h3>
            <p className="mt-4 overflow-hidden"><span data-swap className="block text-[clamp(16px,1.25vw,19px)] font-[500] text-frost/75">{cat.tagline}</span></p>
            <p className="mt-6 overflow-hidden"><span data-swap className="t-body block max-w-[46ch]">{cat.body}</span></p>
            <div className="mt-7 overflow-hidden"><div data-swap><Tags tags={cat.tags} glow={meta.glow} /></div></div>
            <div className="mt-9 overflow-hidden">
              <div data-swap>
                <button type="button" onClick={() => scrollToTarget('events', { offset: -40 })} className="pill pill--sm" data-cursor="VIEW">
                  See {meta.short.toLowerCase()} events <span aria-hidden>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* progress: three ticks */}
        <div aria-hidden className="absolute bottom-6 left-[var(--gutter)] right-[var(--gutter)] flex gap-2">
          {CATEGORIES.map((c, i) => (
            <span key={c.key} className="h-px flex-1 overflow-hidden bg-line">
              <span
                className="block h-full origin-left bg-frost"
                style={{ transform: `scaleX(calc(min(1, max(0, var(--p, 0) * 3 - ${i}))))` }}
              />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function StackedBands() {
  const root = useRef<HTMLElement>(null)
  const [inView, setInView] = useState<number>(-1)
  useReveals(root)

  useLayoutEffect(() => {
    const bands = root.current?.querySelectorAll<HTMLElement>('[data-band]')
    if (!bands) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setInView(Number((e.target as HTMLElement).dataset.band)) })
    }, { rootMargin: '-35% 0px -35% 0px' })
    bands.forEach((b) => io.observe(b))
    return () => io.disconnect()
  }, [])

  return (
    <section ref={root} id="activities" aria-labelledby="activities-title" className="relative bg-void px-[var(--gutter)] py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1440px]">
        <Header />
        <div className="mt-14 flex flex-col gap-4">
          {CATEGORIES.map((c, i) => {
            const meta = CATEGORY_META[c.key]
            return (
              <article key={c.key} data-band={i} className="relative overflow-hidden border border-line bg-ink" data-reveal="up">
                <div className="relative h-[30vh] min-h-[180px]">
                  <GradientCanvas mode={c.mode} active={inView === i ? 1 : 0.15} />
                  <span className="t-num absolute left-4 top-4 text-[12px] font-[650] text-frost/80">0{i + 1} / 03</span>
                </div>
                <div className="p-6 sm:p-8">
                  <h3 className="t-h1 text-[clamp(34px,8vw,56px)] text-frost">{c.title}</h3>
                  <p className="mt-3 text-[16px] font-[500] text-frost/75">{c.tagline}</p>
                  <p className="t-body mt-4">{c.body}</p>
                  <div className="mt-6"><Tags tags={c.tags} glow={meta.glow} /></div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
