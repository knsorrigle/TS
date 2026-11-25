/** Gallery items are plain URLs; this decides how each one is shown. */
export type MediaKind = 'image' | 'video' | 'youtube' | 'vimeo' | 'drive'

export interface Media { kind: MediaKind; src: string; id?: string; thumb?: string; embed?: string }

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i

export function parseMedia(url: string): Media {
  const src = url.trim()
  let m = src.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i)
  if (m) {
    return { kind: 'youtube', src, id: m[1], thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`, embed: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1` }
  }
  m = src.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (m) return { kind: 'vimeo', src, id: m[1], embed: `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1` }
  m = src.match(/drive\.google\.com\/file\/d\/([\w-]+)/i)
  if (m) return { kind: 'drive', src, id: m[1], embed: `https://drive.google.com/file/d/${m[1]}/preview` }
  if (VIDEO_EXT.test(src) || /\/videos\//.test(src)) return { kind: 'video', src }
  return { kind: 'image', src }
}

export const isVideo = (url: string) => parseMedia(url).kind !== 'image'

export function countLabel(urls: string[]) {
  const v = urls.filter(isVideo).length
  const p = urls.length - v
  return [p && `${p} photo${p === 1 ? '' : 's'}`, v && `${v} video${v === 1 ? '' : 's'}`].filter(Boolean).join(' · ')
}
