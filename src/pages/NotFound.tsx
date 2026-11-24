import { useEffect } from 'react'
import { Link } from 'react-router'
import { spark } from '../three/sparkState'

export function NotFound({ what }: { what?: 'event' } = {}) {
  // the crystal dims while you're lost
  useEffect(() => { spark.dim = true; return () => { spark.dim = false } }, [])
  return (
    <section data-spark="0 0.24 0.8 0" className="relative grid min-h-[100svh] place-items-center px-[var(--gutter)] text-center">
      <div className="above-spark">
        <div aria-hidden className="dead-spark mx-auto mb-10 h-1.5 w-1.5 rounded-full bg-frost" />
        <p className="t-meta">Error 404 <span className="sep" /> Not found</p>
        <h1 className="t-h1 mt-6 text-[clamp(40px,7vw,96px)]">This spark went out.</h1>
        <p className="t-body mx-auto mt-5 max-w-[42ch]">{what === 'event' ? 'This event isn’t published, or the link has changed. The current schedule is one tap away.' : 'The page you were looking for isn’t here, or it moved somewhere darker.'}</p>
        <Link to={what === 'event' ? '/#events' : '/'} viewTransition className="relight pill mt-10">{what === 'event' ? 'See all events' : 'Relight · Home'} <span aria-hidden>→</span></Link>
      </div>
    </section>
  )
}
