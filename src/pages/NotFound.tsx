import { Link } from 'react-router'

export function NotFound() {
  return (
    <section className="relative grid min-h-[100svh] place-items-center px-[var(--gutter)] text-center">
      <div>
        <div aria-hidden className="mx-auto mb-10 h-1.5 w-1.5 rounded-full bg-frost/40 shadow-[0_0_18px_4px_rgb(26_159_232/0.25)]" />
        <p className="t-meta">ERROR 404 <span className="sep" /> NOT FOUND</p>
        <h1 className="mt-6 font-display text-[clamp(28px,5vw,64px)] font-extralight uppercase tracking-[0.08em]">This spark went out.</h1>
        <p className="t-body mx-auto mt-5 max-w-[42ch]">The page you were looking for isn't here, or it moved somewhere darker.</p>
        <Link to="/" viewTransition className="pill mt-10" data-cursor="HOME">Relight <span aria-hidden>→</span> Home</Link>
      </div>
    </section>
  )
}
