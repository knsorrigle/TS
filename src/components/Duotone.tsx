import { useState } from 'react'
import { CATEGORY_META, categoryKey } from '../lib/site'

/**
 * Any event photo, made on-brand: grayscale → mapped between ink and the category's light.
 * On hover (inside a `.group`) the true-colour image blooms through. Blur-up while loading.
 * Without an image, the frame becomes the category's living gradient.
 */
export function Duotone({ src, alt, category, className = '', label, eager }: {
  src?: string; alt: string; category?: string; className?: string; label?: string; eager?: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const meta = CATEGORY_META[categoryKey(category)]
  const style = { '--duo-a': meta.from, '--duo-b': meta.to, '--duo-glow': meta.glow } as React.CSSProperties

  if (!src || failed) {
    return (
      <div className={`duo-empty overflow-hidden ${className}`} style={style} aria-hidden={!label}>
        <span className="duo-empty__blob" />
        {label && <span className="t-poster absolute bottom-3 left-4 right-4 z-[2] text-[clamp(22px,3vw,34px)] text-frost/85">{label}</span>}
      </div>
    )
  }
  return (
    <div className={`duo overflow-hidden ${loaded ? 'is-loaded' : ''} ${className}`} style={style}>
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="duo__mono" />
      <img src={src} alt="" aria-hidden loading="lazy" decoding="async" className="duo__colour" />
    </div>
  )
}
