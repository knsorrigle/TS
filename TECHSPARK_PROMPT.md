# TECHSPARK — Club Website Rebuild (Claude Code brief)

You're building the new website for **TECHSPARK**, a student-led club at **Navkis College of Engineering, Hassan** (CSE dept, est. 2026). This replaces the current site at https://techspark-website-indol.vercel.app — same content and backend, completely new design.

Read every file in `./refs/` before writing any code (look at the images, scrub through the video). **They're references only. Don't copy or recreate them.** Take the mood, palette, light quality, grain and typographic restraint, then design something original that sits in that world. Then plan, then build.

**The bar: UI and UX have to be peak. Award-site level (Awwwards SOTD / FWA quality), no crumbs left.** Every state, every hover, every edge case, every breakpoint gets designed. If something feels "fine", it isn't done.

---

## 0. The concept — "ONE SPARK"

Kill the current aesthetic entirely: no "LIVE TERMINAL", no "SYSTEM ONLINE // CAMPUS HUB", no fake laptop, no cyan-on-slate cyberpunk, no hacker monospace everywhere. That's what every college tech club site looks like.

The new site is **light in the dark**. A spark is a single point of light. The whole site is built from that idea. Here's what each ref is *for*: inspiration, not a template.

- **ref-01 (blue lensing / tiny sphere)**: the feel of the hero. Vast darkness, one small object, light bending around it, electric blue pouring through a gap. Use it as the starting point for an original WebGL hero where the light reacts to the cursor and to scroll, and opening up into the page on scroll. Also take its typography lesson: small, tracked-out, right-aligned text blocks that feel like a film title card.
- **ref-02 (Cold Wall poster)**: blurred vertical light, symmetry, near-black, tiny meta-labels. Use it for how sections glow and for the editorial labelling system. Interpret it; don't rebuild the poster.
- **ref-03 (flowing blue gradient)**: the organic, grainy gradient quality for big atmospheric surfaces (CTA, modals, transitions).
- **ref-04 (motion clip)**: animated gradient pills and blobs, including a gradient input with a blinking caret. Use it as the language for interactive UI: inputs, buttons, category swatches. Each event category gets its own living gradient (Technical = blue/cobalt, Non-Technical = cyan/teal, Fun & Social = warm orange-red; the warm one is the only warm colour on the site).
- **Grain everywhere.** No flat, clean digital gradients.

You own the composition. Surprise me, within this world.

Mood words: cinematic, minimal, cold, luminous, quiet confidence. Think film-festival title card, not hackathon landing page.

---

## 1. Design system

**Colour**
- `--void: #000000` / `--ink: #03060D` (backgrounds)
- `--spark: #1A9FE8` (electric blue, the ref-01 blue, primary)
- `--cobalt: #0057FF`
- `--periwinkle: #7B86E8` (ref-02 pillars)
- `--frost: #E8F1FF` (light / headings on dark)
- `--mute: #6B7A90` (secondary text)
- Category warm accent, Fun & Social only: `#FF5A3C → #FFC46B`
- No yellow, no magenta, no neon purple.

**Type** (Google Fonts)
- Display (English): something wide and confident with good tracking: **"Unbounded"** or **"Syne"** (wide weight). Use sparingly, mostly uppercase, letter-spacing 0.3–0.5em at small sizes.
- Body: **"Inter"** or **"Geist"**, 15–16px, `--mute` on dark.
- Meta/labels: **"JetBrains Mono"** or **"Geist Mono"** at 10–11px, uppercase, only for tiny labels like `02 // ABOUT`. Not for paragraphs.

**Grain**: one global fixed overlay (SVG feTurbulence or a tiny noise PNG, ~6–8% opacity, `mix-blend-mode: overlay`), plus grain baked into the shaders.

**Motion**: slow and weighty. Lenis smooth scroll + GSAP ScrollTrigger. Ease `expo.out` / `power4.out`, 0.9–1.4s. Text reveals by line with a mask. No bouncy springs, no typewriter effects.

---

## 2. The logo

`refs/logo-current.jpeg` is the official club logo. **Use the full logo as-is. Don't redesign, redraw, recolour or crop the artwork.**

- Copy it to `public/logo.png` (and export a good `logo.webp`). The black background in the file has to blend into the page's near-black. If you need to, use `mix-blend-mode: screen` or cut it out cleanly with a transparent background.
- **Placement: a corner, not centre stage.** Small in the top-left of the nav (~36–44px) with the `TECHSPARK` wordmark text set beside it in the display font. Also small in a footer corner. It never sits in the hero composition, and it's never huge.
- Favicon / apple-touch-icon: generate from the logo file (it's square, 1254×1254).
- The hero title is the typographic wordmark `TECHSPARK`, not the logo image.

---

## 3. Stack

- **Vite + React + TypeScript + Tailwind CSS v4**
- **GSAP + ScrollTrigger**, **Lenis**
- **WebGL**: `ogl` (lightweight) or `@react-three/fiber` for the hero lensing shader and gradient swatches. Write the shaders yourself as GLSL fragment shaders: lensing = SDF sphere + curved dark masses + blue emission along the seam + noise grain.
- **Supabase** (`@supabase/supabase-js`). Reuse the existing backend exactly (section 5).
- `lucide-react` for the few icons needed.
- Deploy target: Vercel. `react-router` for `/` and `/admin` (plus SPA rewrite in `vercel.json`).

---

## 4. Pages & sections (keep ALL existing content)

### Nav (fixed, minimal, transparent → blurred black on scroll)
Left corner: logo + `TECHSPARK`. Right: `ABOUT` · `WHAT WE DO` · `EVENTS` · `BULLETINS` · `ARCHIVE` + a pill button `RSVP OPEN` (→ #events). Tiny tracked caps. Active-section indicator that slides between links. Hides on scroll down, reveals on scroll up. Mobile: full-screen black overlay menu with large numbered items (01–05), staggered in.

### 01 Hero: the spark
- Original full-bleed WebGL scene inspired by ref-01's mood.
- Title-card text stack:
  - `TECHSPARK` (large display, tracked)
  - `LEARN. BUILD. INNOVATE.`
- Bottom-left meta: `CAMPUS CHAPTER // EST. 2026` · `NAVKIS COLLEGE OF ENGINEERING`
- Bottom-centre: `SCROLL TO ENTER` with a thin animated line.
- Mouse moves the sphere slightly; the light seam reacts.
- Scroll: the wedge opens, blue floods in, then fades to the next section.

### Intro / welcome
- Label: `CAMPUS COMMUNITY // WELCOME TO TECHSPARK`
- Huge stacked words revealed one by one on scroll: `TECHNOLOGY.` `CREATIVITY.` `COMMUNITY.`
- Copy: "A student-led college club hosting technical, non-technical, and fun events. Explore technology, participate in events, and build your skills alongside fellow students."
- CTAs: `EXPLORE EVENTS` (→ #events), `DISCOVER TECHSPARK` (→ #about)

### 02 // ABOUT TECHSPARK (#about)
- Label: `STUDENT-LED INITIATIVE • CAMPUS BASED`
- Headline (line-by-line mask reveal): **Bringing students together through campus events.**
- Sub: **A Broader Campus Experience**
- Body: "TECHSPARK is a student-led college club dedicated to bringing students together through engaging campus events. We create opportunities for students of all backgrounds to participate, collaborate, and explore new interests—spanning hands-on technical activities, creative non-technical challenges, and lively social events."
- Two side blocks:
  - **HOW WE HOST EVENTS**: "We identify ideas that excite students, organize and structure each activity, announce upcoming schedules, and open registrations so everyone has a clear path to participate."
  - **INCLUSIVE COMMUNITY**: "From fast-paced hackathons and technical workshops to fun team competitions and social gatherings, our events are designed to make campus life active, collaborative, and rewarding."

### 03 // WHAT WE DO: Event Categories (#activities)
- Title `EVENT CATEGORIES`, sub `STUDENT-LED ACTIVITIES COVERING TECHNICAL, CREATIVE, AND SOCIAL EXPERIENCES`
- Light-driven layout inspired by ref-02's vertical glow (your call on composition). Pinned section; as you scroll, each category takes the light in turn and its living gradient swatch (ref-04 language) comes alive.
  1. **Technical Events**: *Hackathons, Competitions, Workshops & Tech Talks*. "Hands-on technical activities designed to challenge and inspire students. We organize campus hackathons, coding competitions, practical workshops, and insightful tech talks that provide real exposure and healthy competition." Tags: #Hackathons #Coding Competitions #Workshops #Tech Talks
  2. **Non-Technical Events**: *Creative Showcases, Quizzes & Team Challenges*. "Engaging activities tailored for students across all disciplines. From design showcases and general knowledge quizzes to presentation challenges and problem-solving contests, these events highlight talents beyond code." Tags: #Design Showcases #Campus Quizzes #Presentation Jams #Team Challenges
  3. **Fun & Social Events**: *Recreational Gatherings, Games & Interactive Mixers*. "Interactive events that bring the campus community together to relax and connect. Through interactive games, trivia sessions, social mixers, and club celebrations, we help students build lasting friendships." Tags: #Interactive Games #Trivia Battles #Social Mixers #Club Gatherings
- Mobile: pillars become stacked full-width bands.

### 04 // CAMPUS SCHEDULE: Upcoming Events (#events)
- Title `UPCOMING EVENTS`, live count `SHOWING {n} PUBLISHED CAMPUS SESSIONS`
- Data: `techspark_events` where `published = true`. Featured event = large hero card; the rest in a grid. Filter chips by category.
- Card: image (grainy duotone-blue treatment via CSS/shader), title, date, time, location, category, speaker, capacity bar (`registeredCount / capacity`), status, tags.
- Event detail: route `/events/:slug` or a full-screen sheet, showing `fullDescription`.
- **RSVP modal** (ref-03 gradient background, gradient-pill inputs from the video):
  - Full Name (placeholder "e.g. Rahul Sharma")
  - Email (Personal or College) ("name@gmail.com or student@college.edu")
  - Roll / Student ID ("24CS014")
  - Department select: Computer Science & Engineering / Information Technology / Electronics & Communication / Electrical Engineering / Mechanical / Other
  - Academic Year select: 1st Year / 2nd Year / 3rd Year / 4th Year
  - Submit calls RPC `register_for_event` (section 5). Result states:
    - **Confirmed**: "Your seat has been reserved. Check in at the entrance with your student ID."
    - **Waitlisted**: "Event capacity is currently reached. If a seat opens up, you will be notified in order of registration."
    - Error: show the message.
- Loading = shimmering grain skeletons. Empty state: "No sessions published yet. Something's sparking — check back soon." Error state: "Unable to load upcoming campus sessions at this time. Please check back soon or contact the club leads."

### 05 // BULLETINS: Announcements (#announcements)
- Title `ANNOUNCEMENTS`, sub `OFFICIAL UPDATES & NOTICES`
- Data: `techspark_announcements` where `published = true`, ordered `pinned desc, created_at desc`.
- Editorial list, not cards: date (mono) | category | title | summary. Pinned ones get a thin `--spark` rule and a pin label. Priority = small tag. Click expands `content` inline. If `relatedEventSlug` is set, link to that event.
- Empty/error: "Unable to load campus announcements at this time. Check back later or view official campus notices."

### 06 // ARCHIVE & ACHIEVEMENTS (#archive)
- Title `PAST EVENTS & ACHIEVEMENTS`, sub `STUDENT COLLABORATION SESSIONS HELD ACROSS PREVIOUS CAMPUS SEMESTERS`
- Data: `techspark_past_events` where `published = true`, `created_at desc`.
- Horizontal scroll gallery (pinned, scrubbed by vertical scroll): image, title, date, participants count, category, description, highlight (achievement line in `--spark`).
- Empty: "Event outcomes will be published upon conclusion of campus rounds."

### Closing CTA
- ref-03 gradient full-bleed, slowly flowing (shader).
- Label `STUDENT-LED CAMPUS COMMUNITY`
- Huge: `EXPERIENCE CAMPUS` / `BEYOND LIMITS.`
- "Discover upcoming events and participate in technical, non-technical, and fun activities with fellow students."
- Buttons: `EXPLORE EVENTS` (→ #events), `CONTACT THE CLUB` (→ mailto)

### Footer
- Logo (small, corner) + wordmark. "A student-led college club hosting engaging technical, non-technical, and fun events across campus."
- Dept: Computer Science & Engineering · Navkis College of Engineering, Bangalore
- Directory: 01 // About · 02 // What We Do · 03 // Events & RSVPs · 04 // Announcements · 05 // Event Archive
- Channels & Connect:
  - Instagram: https://www.instagram.com/techspark.navkis
  - Email: techspark.navkis@gmail.com
  - GitHub: **TODO**. The current site links to bare `https://github.com/`. Put the URL in a `CLUB_GITHUB_URL` constant and hide the icon if it's empty.
- Small `Admin Login` link → `/admin`
- `© 2026 TECHSPARK Student Club. All rights reserved.`
- `BACK TO TOP`
- A giant cropped `TECHSPARK` wordmark bleeding off the bottom edge, lit from below.

### /admin: dashboard (rebuild, same features, same visual system but calmer)
- Login: email + password via Supabase Auth (placeholders "admin@college.edu or organizer@domain.com", "Enter account password"). After sign-in, look up `techspark_admins` by `id = user.id` and read `role`. If there's no row, sign out and show "Access Denied". Listen to `onAuthStateChange`.
- Tabs: **Events & Sessions** · **Bulletins & News** · **Past Event Gallery** · **Student Registrations** · **Database & Schema**
  - Events: create/edit/delete, toggle publish, featured flag. Slug auto-generated from title (lowercase, strip accents, hyphens) and checked for uniqueness against `techspark_events.slug`, adding `-2`, `-3`… or a random suffix on conflict (unique constraint `uq_events_slug`). Image upload to Supabase Storage bucket **`event-images`**: max **5 MB**, jpg/jpeg/png/webp only. Or paste a URL.
  - Bulletins: CRUD + publish + pin.
  - Past events: CRUD + publish.
  - Registrations: table with filters (by event, status, department, search), and **export to .xlsx** (use `xlsx`/SheetJS).
  - Database & Schema: shows the SQL from `supabase/schema.sql` so leads can set up a fresh project.
- After any write, dispatch a `techspark_data_updated` event so the public sections refetch.

---

## 5. Backend: reuse the existing Supabase schema

Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Read from `.env.local` and **never hardcode keys in source**. Add `.env.example`.

Write `supabase/schema.sql` that matches these tables (snake_case in DB, camelCase in the TS mappers):

- **techspark_events**: id, title, slug (unique, `uq_events_slug`), description, full_description, date, time, location, category, status, published (bool), capacity (int), registered_count (int), speaker, image, tags (text[]), featured (bool), created_at
- **techspark_categories**: name, description, created_at
- **techspark_announcements**: id, title, summary, content, date, category, priority, author, pinned (bool), published (bool), related_event_slug, created_at
- **techspark_past_events**: id, title, date, participants, category, description, image, highlight, published (bool, default true), created_at
- **techspark_registrations**: id, event_id, event_title, student_name, student_email, student_roll, department, year, status ('Confirmed' | 'Waitlisted'), created_at
- **techspark_admins**: id (= auth.users.id), role
- **RPC `register_for_event(p_event_id, p_student_name, p_student_email, p_student_roll, p_department, p_year)`** → returns `{ success, status, message, error }`. Atomically checks capacity and duplicate roll/email per event, inserts a Confirmed or Waitlisted row, and increments `registered_count`. `security definer`.
- Storage bucket `event-images` (public read).

**RLS, and do this properly:**
- Public (anon): SELECT only `published = true` rows on events / announcements / past_events, plus categories. No direct access to registrations; anon can only register through the RPC.
- Admin (authenticated user with a row in `techspark_admins`): full CRUD on everything plus read registrations. Use an `is_admin()` SQL helper.
- The admin gate must be enforced by RLS, not just the client-side role check.

Note: on the current live site, every data section shows "Unable to load…", so the existing Supabase setup is broken somewhere (RLS, a paused project, or a bad key). Build so it works against a fresh project using `schema.sql`, and handle loading / empty / error states gracefully everywhere.

---

## 6. Quality bar

### UI craft: non-negotiable
- **Preloader**: a short "spark ignites" sequence (under 1.8s, skipped on repeat visits via sessionStorage) that hands off seamlessly into the hero. No percentage counter cliché.
- **Custom cursor** (desktop only): a small light point that grows and labels itself on hover (`VIEW`, `RSVP`, `DRAG`). It hides over inputs. Native cursor on touch.
- **Magnetic buttons**, hover light-sweeps, and press states (scale 0.97). Every interactive element has hover, focus-visible, active, disabled and loading states.
- **Text**: line-masked reveals and split-letter hover on nav links. Hanging punctuation, `text-wrap: balance` on headings, `pretty` on body.
- **Scroll**: thin progress line, section counters (`02 / 06`) that update, nothing janky. Pinned sections release cleanly with no jump.
- **Page/route transitions** (home ↔ event detail ↔ admin) with the View Transitions API, plus a GSAP fallback.
- **Images**: blur-up placeholders and a consistent grainy blue duotone treatment so random event photos look on-brand.
- **Toasts**: one minimal toast system for success and errors.
- 60fps everywhere. Test on a mid-range Android.

### UX: think like a student on a phone at 11pm
- Every event card shows **seats left** in plain words ("12 seats left" / "Waitlist open" / "Full" / "Closed") plus a countdown when it's under 48h away.
- **Next-event spotlight**: the nearest upcoming event gets a live countdown and a one-tap RSVP, both in the hero area and as a **sticky RSVP bar on mobile**.
- **RSVP flow**: inline validation as you type (roll number format, email), the submit button shows progress, no double-submits. On success, an animated confirmation with **Add to Calendar (.ics + Google Calendar link)**, **Share event** (Web Share API, copy-link fallback), and the event details recap. Remember the registration in localStorage so the card shows "You're registered ✓". Show a friendly message for duplicate registrations.
- **Deep links**: every event has a shareable URL (`/events/:slug`) with its own OG title/description, so WhatsApp group shares look good.
- **Copy email** on click with a toast. Instagram opens in a new tab.
- Search + category filter on events, with state kept in the URL.
- 404 page that's on-brand ("This spark went out") with a way home.
- Keyboard: everything reachable, the modal traps focus, Esc closes, Enter submits.
- Empty, loading and error states are *designed*, not afterthoughts.

- **Performance**: Lighthouse 90+ on mobile. Shaders pause when off-screen (IntersectionObserver). Cap DPR at 1.5. Lazy-load below-the-fold WebGL. If WebGL isn't available, fall back to static grainy gradient images exported from the shaders.
- **`prefers-reduced-motion`**: no smooth scroll, no pinning, no shader animation. Static frames and simple fades.
- **Responsive**: design mobile at 375px properly. The hero lensing recomposes vertically on mobile (seam goes vertical, text below).
- **Accessibility**: real semantic sections and headings, focus states (a `--spark` ring), form labels, AA contrast on body text.
- **SEO**: title "TECHSPARK — Student Club | Navkis College of Engineering", meta description "TECHSPARK is a student-led college club hosting technical, non-technical, and fun events across campus.", OG image (render a 1200×630 still of the hero), favicon from the new mark.
- Clean component structure: `src/sections/*`, `src/gl/*` (shaders), `src/lib/supabase.ts`, `src/lib/api.ts` (mappers), `src/admin/*`.

---

## 7. How to work

1. Look at every ref. Write a short `DESIGN.md` covering what you're taking from each ref (mood, not layout), your original concept for each section, and the motion plan. Then stop and show me.
2. Scaffold, set up the design tokens and grain, and build the hero first. Make it unforgettable before anything else, then screenshot it for me.
3. Build the remaining sections top to bottom, then the RSVP flow, then admin, then `schema.sql` + RLS.
4. Finish with a pass on performance, reduced motion, mobile, and accessibility.
5. **Crumb hunt**: before you call it done, screenshot every section at 375 / 768 / 1440, every hover and focus state, every empty/loading/error/success state, and the full RSVP flow. List every flaw you find, fix them, and repeat until the list is empty.
5. Commit in logical chunks. **Do not add "Co-Authored-By" lines to commits.**
