import { Hero } from '../sections/Hero'

export function Home() {
  return (
    <>
      <Hero />
      {/* Intro + remaining sections land next. This stub carries the hero's light line so the handoff can be judged. */}
      <section id="intro" aria-label="Welcome" className="relative h-[120svh] bg-void">
        <div aria-hidden className="absolute left-1/2 top-0 h-[70%] w-px -translate-x-1/2 bg-gradient-to-b from-frost via-spark/60 to-transparent shadow-[0_0_14px_rgb(26_159_232/0.8)]" />
      </section>
    </>
  )
}
