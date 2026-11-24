/** Combine a DB date ("2026-12-14") and free-text time ("10:00 AM" / "14:30") into a local Date. */
export function eventStart(date: string | null, time?: string): Date | null {
  if (!date) return null
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const m = (time ?? '').match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (m) {
    let h = Number(m[1]) % 24
    const min = Number(m[2] ?? 0)
    const ap = m[3]?.toLowerCase()
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    d.setHours(h, min, 0, 0)
  }
  return d
}

export function countdownParts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

const pad = (n: number) => String(n).padStart(2, '0')
export function formatCountdown(ms: number) {
  const { d, h, m, s } = countdownParts(ms)
  return d > 0 ? `${pad(d)}D ${pad(h)}H ${pad(m)}M` : `${pad(h)}H ${pad(m)}M ${pad(s)}S`
}

export function formatDateShort(date: string | null) {
  if (!date) return 'TBA'
  const d = new Date(`${date}T00:00:00`)
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()
}
