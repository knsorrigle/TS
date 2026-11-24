import { useEffect, useRef } from 'react'

/** Global film grain: one 192px noise tile generated once, jittered across 8 positions per 0.66s. */
export function Grain() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 192
    const ctx = c.getContext('2d')
    if (!ctx || !ref.current) return
    const img = ctx.createImageData(192, 192)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    ref.current.style.backgroundImage = `url(${c.toDataURL('image/png')})`
  }, [])
  return <div ref={ref} className="grain" aria-hidden />
}
