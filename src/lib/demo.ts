/**
 * Dev-only fixtures, used when running `npm run dev` without Supabase keys so every section,
 * state and flow can be designed and tested. Never used in production builds.
 */
import type { Announcement, PastEvent, TSEvent, TeamMember } from './api'

const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const now = new Date().toISOString()

export const demoEvents: TSEvent[] = [
  {
    id: 'demo-1', slug: 'spark-hack-24', title: 'Spark Hack: 24 Hours to Build', featured: true, published: true,
    description: 'A 24-hour campus hackathon. Form a team of up to four, pick a track, and ship something real by sunrise.',
    fullDescription: 'Spark Hack is our flagship overnight build.\n\nTeams of two to four pick one of three tracks (campus tools, sustainability, open innovation) and have 24 hours to go from idea to working demo. Mentors from the CSE faculty and alumni will be on the floor through the night.\n\nBring your laptop, charger and student ID. Dinner, midnight snacks and breakfast are on us.',
    date: day(1), time: '6:00 PM', location: 'CSE Block, Lab 3', category: 'Technical', status: 'Open',
    capacity: 120, registeredCount: 108, speaker: 'Faculty mentors & alumni', image: '', tags: ['Hackathon', 'Teams', 'Overnight'], createdAt: now,
    endTime: '6:00 PM (next day)', registrationMode: 'form', registrationUrl: '', registrationDeadline: null, gallery: [],
  },
  {
    id: 'demo-2', slug: 'git-good-workshop', title: 'Git Good: Version Control Workshop', featured: false, published: true,
    description: 'Branches, merges and pull requests without the panic. Hands-on, laptops required.',
    fullDescription: 'A practical two-hour workshop on Git and GitHub for first and second years.', date: day(6), time: '2:00 PM',
    location: 'Seminar Hall 1', category: 'Technical', status: 'Open', capacity: 60, registeredCount: 22, speaker: 'TECHSPARK leads',
    image: '', tags: ['Workshop', 'Git'], createdAt: now, endTime: '', registrationMode: 'form', registrationUrl: '', registrationDeadline: null, gallery: [],
  },
  {
    id: 'demo-3', slug: 'campus-quiz-night', title: 'Campus Quiz Night', featured: false, published: true,
    description: 'General knowledge, tech trivia and one very hard picture round. Teams of three.',
    fullDescription: 'Five rounds, one winner, no phones.', date: day(11), time: '5:30 PM', location: 'Main Auditorium',
    category: 'Non-Technical', status: 'Open', capacity: 90, registeredCount: 90, speaker: 'Quizmaster: TBA', image: '',
    tags: ['Quiz', 'Teams of 3'], createdAt: now, endTime: '', registrationMode: 'form', registrationUrl: '', registrationDeadline: null, gallery: [],
  },
  {
    id: 'demo-4', slug: 'design-showcase', title: 'Design Showcase: Posters & Interfaces', featured: false, published: true,
    description: 'Show your best poster, app screen or brand work. Feedback from the panel, prizes for the top three.',
    fullDescription: 'Open to every department.', date: day(17), time: '11:00 AM', location: 'Library Foyer', category: 'Non-Technical',
    status: 'Open', capacity: 0, registeredCount: 14, speaker: '', image: '', tags: ['Design', 'Showcase'], createdAt: now, endTime: '', registrationMode: 'external', registrationUrl: 'https://forms.gle/example', registrationDeadline: null, gallery: [],
  },
  {
    id: 'demo-5', slug: 'game-night-mixer', title: 'Game Night Mixer', featured: false, published: true,
    description: 'Board games, a FIFA bracket and too much pizza. Come alone, leave with a squad.',
    fullDescription: 'Our end-of-month social.', date: day(23), time: '6:30 PM', location: 'Student Lounge', category: 'Fun & Social',
    status: 'Open', capacity: 80, registeredCount: 31, speaker: '', image: '', tags: ['Games', 'Social'], createdAt: now, endTime: '', registrationMode: 'form', registrationUrl: '', registrationDeadline: null, gallery: [],
  },
  {
    id: 'demo-6', slug: 'intro-to-linux', title: 'Intro to Linux (closed)', featured: false, published: true,
    description: 'The terminal, demystified.', fullDescription: 'Registrations for this session are closed.', date: day(-4), time: '3:00 PM',
    location: 'Lab 2', category: 'Technical', status: 'Closed', capacity: 40, registeredCount: 40, speaker: '', image: '', tags: ['Linux'], createdAt: now, endTime: '', registrationMode: 'form', registrationUrl: '', registrationDeadline: null, gallery: [],
  },
]

export const demoAnnouncements: Announcement[] = [
  { id: 'a1', title: 'Spark Hack registrations close Friday', summary: 'Only a few seats left for this semester\'s overnight hackathon.', content: 'Register through the events section. Teams can be finalised on the day. Each member must register individually with their own roll number.', date: day(-1), category: 'Events', priority: 'High', author: 'Club Leads', pinned: true, published: true, relatedEventSlug: 'spark-hack-24', createdAt: now, linkUrl: '', linkLabel: '' },
  { id: 'a2', title: 'Core team applications are open', summary: 'We\'re looking for leads for design, outreach and tech.', content: 'Second and third years from any department can apply. Fill the form at the club desk or email us.', date: day(-3), category: 'Club', priority: 'Normal', author: 'TECHSPARK', pinned: false, published: true, relatedEventSlug: null, createdAt: now, linkUrl: 'https://forms.gle/example', linkLabel: 'Apply' },
  { id: 'a3', title: 'Lab 3 timing change for the Git workshop', summary: 'The workshop moves to Seminar Hall 1.', content: 'Same time, new room. Bring your laptop with Git installed.', date: day(-6), category: 'Notice', priority: 'Low', author: 'Club Leads', pinned: false, published: true, relatedEventSlug: 'git-good-workshop', createdAt: now, linkUrl: '', linkLabel: '' },
]

export const demoPastEvents: PastEvent[] = [
  { id: 'p1', title: 'Inaugural Tech Talk', date: day(-40), participants: 140, category: 'Technical', description: 'Our first session: the CSE department on where computing is heading and how students can get involved.', image: '', highlight: '140 students in the room on day one', published: true, createdAt: now , gallery: [], linkUrl: '' },
  { id: 'p2', title: 'Code Relay', date: day(-28), participants: 64, category: 'Technical', description: 'Teams of four passed a single laptop every ten minutes. Chaos, then very clean code.', image: '', highlight: 'Winning team solved 9 of 10 problems', published: true, createdAt: now , gallery: [], linkUrl: '' },
  { id: 'p3', title: 'Pitch Jam', date: day(-20), participants: 48, category: 'Non-Technical', description: 'Three minutes, one slide, one idea. Students pitched campus improvements to a faculty panel.', image: '', highlight: 'Two ideas adopted by the department', published: true, createdAt: now , gallery: [], linkUrl: '' },
  { id: 'p4', title: 'Trivia Battle', date: day(-12), participants: 90, category: 'Fun & Social', description: 'Thirty teams, five rounds, one tie-breaker that went to sudden death.', image: '', highlight: 'Record turnout for a social night', published: true, createdAt: now , gallery: [], linkUrl: '' },
  { id: 'p5', title: 'Freshers Mixer', date: day(-8), participants: 120, category: 'Fun & Social', description: 'Games and introductions for first years across every branch.', image: '', highlight: '', published: true, createdAt: now , gallery: [], linkUrl: '' },
]

/** Dev only: no faces, just initials — production renders nothing until real members are added. */
export const demoTeam: TeamMember[] = [
  ['Club Lead', 'Ananya K'], ['Tech Lead', 'Rohit M'], ['Design Lead', 'Sahana P'], ['Events', 'Kiran B'], ['Outreach', 'Meghana S'], ['Faculty Coordinator', 'Prof. Rao'],
].map(([role, name], i) => ({ id: `t${i}`, name, role, photo: '', photoFun: '', sortOrder: i, published: true, createdAt: now , gallery: [], linkUrl: '' }))

/** Dev only: site content overrides live in memory (admin "Site content" tab edits this). */
export const demoSite: { value: Record<string, unknown> | null } = { value: null }
