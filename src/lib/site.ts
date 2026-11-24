export const SITE = {
  name: 'TECHSPARK',
  college: 'Navkis College of Engineering',
  city: 'Hassan',
  dept: 'Computer Science & Engineering',
  est: 2026,
  email: 'techspark.navkis@gmail.com',
  instagram: 'https://www.instagram.com/techspark.navkis',
} as const

/** TODO: set the club's GitHub org/profile URL. The icon stays hidden while this is empty. */
export const CLUB_GITHUB_URL = ''

export const SECTIONS = [
  { id: 'about', label: 'About', nav: 'ABOUT' },
  { id: 'activities', label: 'What We Do', nav: 'WHAT WE DO' },
  { id: 'events', label: 'Events & RSVPs', nav: 'EVENTS' },
  { id: 'announcements', label: 'Announcements', nav: 'BULLETINS' },
  { id: 'archive', label: 'Event Archive', nav: 'ARCHIVE' },
] as const

export type CategoryKey = 'technical' | 'non-technical' | 'fun'

export const CATEGORY_META: Record<CategoryKey, { label: string; short: string; from: string; to: string; glow: string }> = {
  technical: { label: 'Technical Events', short: 'Technical', from: '#0057FF', to: '#1A9FE8', glow: '26 159 232' },
  'non-technical': { label: 'Non-Technical Events', short: 'Non-Technical', from: '#00B3C7', to: '#2CF0D2', glow: '44 240 210' },
  fun: { label: 'Fun & Social Events', short: 'Fun & Social', from: '#FF5A3C', to: '#FFC46B', glow: '255 120 70' },
}

/** Map any free-text category from the DB onto one of the three living gradients. */
export function categoryKey(raw: string | null | undefined): CategoryKey {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('non')) return 'non-technical'
  if (s.includes('fun') || s.includes('social')) return 'fun'
  return 'technical'
}
