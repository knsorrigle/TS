import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react'
import { parseMedia, type Media } from '../lib/media'
import { lockScroll } from '../lib/motion'

/** Photo grid + a keyboard/swipe lightbox. Used on event pages and archive frames. */
export function Gallery({ images, title, className = '' }: { images: string[]; title: string; className?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <>
      <div className={`mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 ${className}`}>
        {images.map((src, i) => (
          <button key={src + i} type="button" onClick={() => setOpen(i)} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/5" aria-label={`Open item ${i + 1} of ${images.length}`}>
            <Tile m={parseMedia(src)} />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox images={images} start={open} title={title} onClose={() => setOpen(null)} />}
    </>
  )
}

export function Lightbox({ images, start, title, onClose }: { images: string[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start)
  const touch = useRef<number | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const prev = () => setI((n) => (n - 1 + images.length) % images.length)
  const next = () => setI((n) => (n + 1) % images.length)
  useEffect(() => {
    lockScroll(true)
    closeBtn.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    addEventListener('keydown', key)
    return () => { removeEventListener('keydown', key); lockScroll(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div role="dialog" aria-modal="true" aria-label={`${title} — photos`} className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
      onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) (dx > 0 ? prev() : next()); touch.current = null }}>
      <Stage key={images[i]} m={parseMedia(images[i])} alt={`${title} — ${i + 1} of ${images.length}`} />
      <p className="t-num absolute bottom-6 left-1/2 -translate-x-1/2 text-[13px] text-mute-hi">{i + 1} / {images.length}</p>
      <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close" className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/25 text-white hover:bg-white hover:text-black"><X size={18} /></button>
      {images.length > 1 && <>
        <button type="button" onClick={prev} aria-label="Previous photo" className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 text-white hover:bg-white hover:text-black"><ChevronLeft size={18} /></button>
        <button type="button" onClick={next} aria-label="Next photo" className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 text-white hover:bg-white hover:text-black"><ChevronRight size={18} /></button>
      </>}
    </div>
  )
}

/** Grid tile: photo, or a video frame / provider thumbnail with a play marker. */
function Tile({ m }: { m: Media }) {
  const cls = 'h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-[1.04]'
  const play = (
    <span className="absolute inset-0 grid place-items-center">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-white/40 bg-black/45 text-white backdrop-blur transition-transform duration-500 group-hover:scale-110"><Play size={20} fill="currentColor" /></span>
    </span>
  )
  if (m.kind === 'image') return <img src={m.src} alt="" loading="lazy" decoding="async" className={cls} />
  if (m.kind === 'video') return <><video src={`${m.src}#t=0.5`} muted playsInline preload="metadata" className={cls} />{play}</>
  if (m.thumb) return <><img src={m.thumb} alt="" loading="lazy" className={cls} />{play}</>
  return <>{play}</>
}

/** Lightbox stage: photo, native video, or a provider embed (privacy-friendly domains). */
function Stage({ m, alt }: { m: Media; alt: string }) {
  if (m.kind === 'image') return <img src={m.src} alt={alt} className="max-h-[86svh] max-w-[92vw] rounded-xl object-contain" />
  if (m.kind === 'video') return <video src={m.src} controls autoPlay playsInline aria-label={alt} className="max-h-[86svh] max-w-[92vw] rounded-xl bg-black" />
  return (
    <div className="aspect-video w-[min(92vw,calc(86svh*16/9))] overflow-hidden rounded-xl bg-black">
      <iframe src={m.embed} title={alt} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
    </div>
  )
}
