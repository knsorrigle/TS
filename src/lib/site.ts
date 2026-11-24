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
  { id: 'about', label: 'About', long: 'About' },
  { id: 'activities', label: 'What we do', long: 'What We Do' },
  { id: 'events', label: 'Events', long: 'Events & Registrations' },
  { id: 'announcements', label: 'Bulletins', long: 'Announcements' },
  { id: 'archive', label: 'Archive', long: 'Event Archive' },
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

export const CATEGORIES: { key: CategoryKey; mode: 0 | 1 | 2; title: string; tagline: string; body: string; tags: string[]; rail: string }[] = [
  {
    key: 'technical', mode: 0, title: 'Technical Events', tagline: 'Hackathons, Competitions, Workshops & Tech Talks',
    body: 'Hands-on technical activities designed to challenge and inspire students. We organize campus hackathons, coding competitions, practical workshops, and insightful tech talks that provide real exposure and healthy competition.',
    tags: ['Hackathons', 'Coding Competitions', 'Workshops', 'Tech Talks'], rail: 'Hack · Workshop · Talk',
  },
  {
    key: 'non-technical', mode: 1, title: 'Non-Technical Events', tagline: 'Creative Showcases, Quizzes & Team Challenges',
    body: 'Engaging activities tailored for students across all disciplines. From design showcases and general knowledge quizzes to presentation challenges and problem-solving contests, these events highlight talents beyond code.',
    tags: ['Design Showcases', 'Campus Quizzes', 'Presentation Jams', 'Team Challenges'], rail: 'Design · Quiz · Pitch',
  },
  {
    key: 'fun', mode: 2, title: 'Fun & Social Events', tagline: 'Recreational Gatherings, Games & Interactive Mixers',
    body: 'Interactive events that bring the campus community together to relax and connect. Through interactive games, trivia sessions, social mixers, and club celebrations, we help students build lasting friendships.',
    tags: ['Interactive Games', 'Trivia Battles', 'Social Mixers', 'Club Gatherings'], rail: 'Games · Trivia · Mixers',
  },
]
