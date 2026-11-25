import { useMemo } from 'react'
import { fetchSiteContent } from './api'
import { useAsync } from './useAsync'

/** Every piece of site copy and every link, editable from Admin → Site content. */
export interface Row { title: string; muted: string; items: string[]; body: string; category: '' | 'technical' | 'non-technical' | 'fun' }
export interface SiteContent {
  hero: { tagline: string; description: string; ticket: string }
  intro: { words: string[]; body: string; primaryCta: string; secondaryCta: string }
  statement: { heading: string; body: string; marquee: string[] }
  whatWeDo: { heading: string; sub: string; rows: Row[] }
  sections: { events: string; eventsEmpty: string; bulletins: string; bulletinsSub: string; archive: string; archiveSub: string; team: string; teamSub: string }
  cta: { heading: string; body: string; primary: string; secondary: string }
  contact: { email: string; instagram: string; github: string; dept: string; college: string; city: string }
  registration: { departments: string[]; years: string[] }
}

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    tagline: 'Inspire. Innovate. Integrate.',
    description: 'A student-led college club hosting technical, non-technical, and fun events.',
    ticket: 'TS—2026 · Navkis · CSE',
  },
  intro: {
    words: ['Technology.', 'Creativity.', 'Community.'],
    body: 'A student-led college club hosting technical, non-technical, and fun events. Explore technology, participate in events, and build your skills alongside fellow students.',
    primaryCta: 'Explore events',
    secondaryCta: 'Discover Techspark',
  },
  statement: {
    heading: 'Bringing students together through campus events.',
    body: 'TECHSPARK is a student-led college club dedicated to bringing students together through engaging campus events. We create opportunities for students of all backgrounds to participate, collaborate, and explore new interests—spanning hands-on technical activities, creative non-technical challenges, and lively social events.',
    marquee: ['Hackathons', 'Workshops', 'Tech Talks', 'Quizzes', 'Design Showcases', 'Trivia', 'Mixers', 'Coding Competitions', 'Presentation Jams', 'Team Challenges'],
  },
  whatWeDo: {
    heading: 'What we do',
    sub: 'Student-led activities covering technical, creative, and social experiences.',
    rows: [
      { title: 'Technical', muted: 'events', category: 'technical', items: ['Hackathons', 'Coding Competitions', 'Workshops', 'Tech Talks'], body: 'Hands-on technical activities designed to challenge and inspire students. We organize campus hackathons, coding competitions, practical workshops, and insightful tech talks that provide real exposure and healthy competition.' },
      { title: 'Non-Technical', muted: 'events', category: 'non-technical', items: ['Design Showcases', 'Campus Quizzes', 'Presentation Jams', 'Team Challenges'], body: 'Engaging activities tailored for students across all disciplines. From design showcases and general knowledge quizzes to presentation challenges and problem-solving contests, these events highlight talents beyond code.' },
      { title: 'Fun & Social', muted: 'events', category: 'fun', items: ['Interactive Games', 'Trivia Battles', 'Social Mixers', 'Club Gatherings'], body: 'Interactive events that bring the campus community together to relax and connect. Through interactive games, trivia sessions, social mixers, and club celebrations, we help students build lasting friendships.' },
      { title: 'How we host events', muted: '', category: '', items: ['Find ideas that excite students', 'Structure every activity', 'Announce schedules early', 'Open registrations for all'], body: 'We identify ideas that excite students, organize and structure each activity, announce upcoming schedules, and open registrations so everyone has a clear path to participate.' },
      { title: 'Inclusive community', muted: '', category: '', items: ['Every department welcome', 'Teams and solo formats', 'Beginners to builders'], body: 'From fast-paced hackathons and technical workshops to fun team competitions and social gatherings, our events are designed to make campus life active, collaborative, and rewarding.' },
    ],
  },
  sections: {
    events: 'Events',
    eventsEmpty: 'No events live right now.',
    bulletins: 'Bulletins',
    bulletinsSub: 'Official updates and notices from the club.',
    archive: 'Archive',
    archiveSub: 'Past events & achievements — student collaboration sessions held across previous campus semesters.',
    team: 'The people',
    teamSub: 'Students who plan, build and host every TECHSPARK session.',
  },
  cta: {
    heading: 'Experience campus\nbeyond limits.',
    body: 'Discover upcoming events and participate in technical, non-technical, and fun activities with fellow students.',
    primary: 'Explore events',
    secondary: 'Contact the club',
  },
  contact: {
    email: 'techspark.navkis@gmail.com',
    instagram: 'https://www.instagram.com/techspark.navkis',
    github: '',
    dept: 'Computer Science & Engineering',
    college: 'Navkis College of Engineering',
    city: 'Hassan',
  },
  registration: {
    departments: ['AIML', 'AIDS', 'CSE', 'CSE (Cybersecurity)', 'MCA', 'ECE', 'Civil'],
    years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
  },
}

/** Deep-merge saved values over defaults: a missing or blank field never blanks the site. */
export function mergeContent(saved: unknown): SiteContent {
  const merge = (def: unknown, val: unknown): unknown => {
    if (val === undefined || val === null) return def
    if (Array.isArray(def)) return Array.isArray(val) && val.length ? val : def
    if (typeof def === 'object' && def) {
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(def)) out[k] = merge((def as Record<string, unknown>)[k], (val as Record<string, unknown>)?.[k])
      return out
    }
    return typeof val === typeof def && (typeof val !== 'string' || val.trim() !== '') ? val : def
  }
  return merge(DEFAULT_CONTENT, saved) as SiteContent
}

/** Site copy with defaults rendered immediately (no loading flash); admin edits arrive a moment later. */
export function useContent(): SiteContent {
  const res = useAsync('site', fetchSiteContent)
  return useMemo(() => mergeContent(res.status === 'success' ? res.data : null), [res.status, res.data])
}
