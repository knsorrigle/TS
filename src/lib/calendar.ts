import type { TSEvent } from './api'
import { eventStart } from './time'
import { SITE } from './site'
import { toast } from './toast'

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')

export const eventUrl = (e: TSEvent) => `${location.origin}/events/${e.slug}`

function span(e: TSEvent) {
  const start = eventStart(e.date, e.time) ?? new Date()
  const end = new Date(start.getTime() + 2 * 3600_000)
  return { start, end }
}

export function googleCalendarUrl(e: TSEvent) {
  const { start, end } = span(e)
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: `${e.title} · TECHSPARK`, dates: `${fmt(start)}/${fmt(end)}`,
    details: `${e.description}\n\n${eventUrl(e)}`, location: `${e.location}, ${SITE.college}, ${SITE.city}`,
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

export function downloadIcs(e: TSEvent) {
  const { start, end } = span(e)
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TECHSPARK//Events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${e.id}@techspark`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(`${e.title} · TECHSPARK`)}`, `DESCRIPTION:${esc(`${e.description}\n\n${eventUrl(e)}`)}`,
    `LOCATION:${esc(`${e.location}, ${SITE.college}, ${SITE.city}`)}`, `URL:${eventUrl(e)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Starts in an hour', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  a.download = `${e.slug}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export async function copyText(text: string, done = 'Copied to clipboard') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(done)
  } catch {
    toast.error('Couldn’t copy. Long-press to copy instead.')
  }
}

export async function shareEvent(e: TSEvent) {
  const url = eventUrl(e)
  const data = { title: `${e.title} · TECHSPARK`, text: `${e.title}: ${e.description}`, url }
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try { await navigator.share(data); return } catch (err) { if ((err as Error).name === 'AbortError') return }
  }
  copyText(url, 'Event link copied')
}
