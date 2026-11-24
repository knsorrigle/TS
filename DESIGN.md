# TECHSPARK — Design Direction: "ONE SPARK"

> A single point of light in a very large dark. Everything on the site is that light: arriving, bending, opening, and finally flooding the page.

Status: **draft for review.** No code until this is approved.

---

## 1. What I'm taking from each reference (mood, not layout)

| Ref | What I take | What I leave behind |
|---|---|---|
| **ref-01 — lens / sphere** | Scale contrast: a huge dark against something tiny. Light that looks *bent*, with the soft gravitational falloff along the edges of the dark masses. One saturated electric blue (`--spark`) set against true black. The title-card typography: small, widely tracked, right-aligned, with lots of air. | The two-circle composition, the dark ball, the left-pointing wedge. My hero uses a different object and a different geometry (see §2). |
| **ref-02 — Cold Wall poster** | Light as *vertical architecture*: blurred columns that peak in brightness at mid-height and fade into ink at top and bottom. The periwinkle-to-frost range. A tiny meta row along the top (`DP_16 · 21_07 · 2023`), and a centred stacked label split by hairlines (`A │ COLD │ WALL`). Symmetry as a calm resting state. | The poster itself: no binder clips, no seven mirrored bars. Pillars appear in only two places (Categories, the About divider), and asymmetrically. |
| **ref-03 — flowing gradient** | The way the light *pours*: frost white at the source, through `--spark`, into cobalt, then sinking into ink, with a soft, organic edge and a visible fold. Grain that sits *inside* the colour instead of over it. | The portrait framing. I use the quality as a material (CTA, RSVP modal, transitions), not as a picture. |
| **ref-04 — motion clip** | Interactive UI as living gradient: pills whose colour drifts slowly inside a rounded shape. The *input* treatment: a dark-blue pill whose inner glow pools around the caret, with a thin blinking caret. Rotating banded swatches (cyan/teal) and warm sunset blooms (orange-red → amber). | The exact three swatches. I build one parametric "living gradient" shader and give each category its own palette and motion signature. |
| **logo** | Used **as-is**, small, in corners only (nav top-left, footer corner, favicon). Black background removed via `mix-blend-mode: screen`, or a clean alpha cut-out if screen looks muddy on `--ink`. | Its magenta and yellow never leak into the UI palette. They exist only inside the logo artwork. |

**Grain** is a material, not a filter: one fixed global overlay (SVG `feTurbulence`, ~7%, `overlay` blend, re-seeded at 12 fps so it *breathes* like film), plus hash-noise dithering inside every shader so gradients never band.

---

## 2. Original concept, section by section

### Preloader — "Ignition" (≤ 1.6s, once per session)
Pure black. A single pixel of frost-white appears at centre and breathes once. It **draws a 1px horizontal line** out to both screen edges (expo.out, 0.7s): this is the hero's light seam. The dark masses of the hero then slide in from above and below to frame it, and the preloader is gone. You never see a "page load". The spark was already the page. On repeat visits (sessionStorage) the hero simply fades up from black over 0.4s.

### 01 Hero — "The Aperture"
**The object:** not a dark ball. The spark is a **tiny white-hot point of light** sitting inside a narrow almond-shaped **aperture** between two vast, dark, curved masses (like eyelids of the night). Electric blue spills through the aperture from "behind" the dark. Along the rims of both masses the light **lenses**: the grain field and a faint dust of particles near the spark is visibly pulled toward it (screen-space radial distortion falling off by 1/r²). The rims carry a thin frost highlight that thins as it leaves the spark.

**Shader (ogl, single full-screen fragment pass):**
- Two SDF "lids" built from large offset circles, smooth-unioned and slightly asymmetric, so the aperture tilts like a horizon rather than mirroring.
- Emission = `--spark` along the seam, a falloff to `--cobalt` in the deep, and a frost core at the spark.
- Lensing: UV warp around the spark position before sampling noise/dust.
- Grain: blue-noise hash + temporal jitter.
- Uniforms: `uPointer` (eased), `uScroll` (0→1), `uTime`, `uAspect`, `uOrient` (0 = horizontal seam, 1 = vertical seam on portrait).

**Interaction:**
- Cursor: the spark drifts ≤ 3% toward the pointer with heavy easing (lerp 0.04); the aperture *tilts* a few degrees to follow, and the rim highlight brightens on the side nearest the cursor.
- Scroll (pinned ~120vh): the lids **part** → blue floods the frame → the flood **collapses into a single vertical line** of light at centre, which becomes the page's scroll-progress line and the light the intro words are lit by. One continuous light from preloader to intro.

**Typography (title card, right-aligned, lower-right third):**
```
                                    TECHSPARK            ← Unbounded 300, tracked 0.32em
                                    LEARN. BUILD. INNOVATE.   ← mono 11px, 0.4em
```
Bottom-left meta: `CAMPUS CHAPTER // EST. 2026` · `NAVKIS COLLEGE OF ENGINEERING` (mono, 10px).
Bottom-centre: `SCROLL TO ENTER` with a 48px hairline that a light bead travels down on loop.
Top-right under the nav: **Next-event spotlight**: a small title-card block (`NEXT // 14 DEC`, title, live `02D 11H 04M` countdown, `RSVP →` pill). Hidden gracefully when no upcoming event.

**Mobile:** `uOrient = 1`. The aperture turns vertical (lids left and right, seam top-to-bottom), the spark sits in the upper third, and the text stack goes below it, left-aligned.

### Intro — "Lit Words"
Pinned. Three huge words, `TECHNOLOGY.` `CREATIVITY.` `COMMUNITY.`, are set in Unbounded in near-invisible ink (#0B1220) from the start. The vertical light line from the hero becomes a **horizontal beam that sweeps down** the stack; each word is lit as the beam crosses it (CSS mask with a gradient tied to scroll), going from ink to frost with a blue bloom bleeding off the letter edges. Once all three are lit, the copy and the two CTAs rise in by line mask. Label in the ref-02 hairline style: `CAMPUS COMMUNITY │ WELCOME TO TECHSPARK`.

### 02 About — "The Column"
Editorial 12-col grid. The left 7 columns hold the label, the headline (line-masked: *Bringing students together through campus events.*), the sub-head and body. The right side is split by **one thin vertical light pillar** (ref-02 quality: blurred, peaking mid-height) that brightens from 0 to full as the section centres. On either side of its glow sit the two blocks, `HOW WE HOST EVENTS` and `INCLUSIVE COMMUNITY`, each numbered `A.01` / `A.02`. Section counter `02 / 06` in the gutter.

### 03 What We Do — "Three Lights"
Pinned (≈ 3 × 100vh). The stage is ink with **three vertical light pillars** of unequal widths, offset left of centre (asymmetric, not the poster's mirror). Only one pillar holds the light at a time:
- The active pillar widens, intensifies, and *becomes* that category's **living gradient** (WebGL swatch):
  - **Technical**: cobalt → spark, slow vertical currents.
  - **Non-Technical**: cyan/teal **banded rotation** (the ref-04 rotating-band idea, reinterpreted as concentric bands drifting around an off-centre void).
  - **Fun & Social**: warm `#FF5A3C → #FFC46B` sunset bloom, the **only warm light on the whole site**, so the moment it arrives it lands.
- The inactive pillars cool to periwinkle embers.
- The right column swaps the category's index (`01/03`), title, italic tagline, body and `#tags` with masked line transitions in sync.
- A tiny meta rail along the top mimics ref-02: `CAT_01 · TECHNICAL · HACK/WORKSHOP/TALK`.
**Mobile:** no pin. Three full-width bands, each with its gradient as a 30vh top strip that comes alive (shader starts) when it enters the viewport.

### 04 Events — "The Programme"
Styled like a film-festival programme, not a card dump.
- Header row: `UPCOMING EVENTS` + live `SHOWING {n} PUBLISHED CAMPUS SESSIONS` (the number counts with a roll).
- Controls: a **search pill** in the ref-04 input language (dark-blue living gradient, glow pools around a blinking caret) and **category chips** as small gradient pills that animate only while hovered or active. State goes in the URL (`?q=&cat=`).
- **Featured** event: a full-width "title card" with the image in grainy blue duotone on the left 60%, and on the right the date set huge in mono, the title, meta, a seats line ("12 seats left"), a hairline capacity bar that fills with that category's gradient, and the RSVP pill.
- **Grid**: 3/2/1 columns. Each card has the duotone image (it blooms to near-full colour on hover with a light sweep), a category gradient hairline along the top edge, title, date · time · place, speaker, capacity bar, plain-words status, tags, and a `< 48h` countdown badge. Registered events show `You're registered ✓`.
- States: shimmering grain skeletons; empty ("No sessions published yet. Something's sparking — check back soon.") with a tiny idle spark; error with a retry button.
- **RSVP modal**: a sheet that rises over a slowly flowing ref-03-quality gradient (frost top → spark → ink). Fields are living-gradient pills with floating labels, inline validation, and a progress-filled submit. Success = the gradient **condenses into a single point of light** (a spark) and the confirmation unfolds from it: status, recap, Add to Calendar (.ics + Google), Share. Waitlist uses a cooler, dimmer version; duplicates get a friendly note.
- **Detail route `/events/:slug`**: the hero image becomes a full-bleed duotone header, the long description sits in a narrow reading column, and a sticky RSVP rail holds the seats, countdown and the action. It morphs in from the card via the View Transitions API (shared element: image + title).

### 05 Bulletins — "Ledger"
Editorial rows across full width: `DATE (mono)` │ `CATEGORY` │ **Title** │ summary │ `PRIORITY`. Pinned rows carry a 1px `--spark` rule down the left edge plus a `PINNED` label. Hover passes a soft horizontal light sweep through the row. Click expands `content` inline (height animation, no layout jump) and shows `→ Related event` when linked.

### 06 Archive — "Contact Sheet"
A pinned horizontal strip scrubbed by vertical scroll that reads like a **film contact sheet**: duotone frames with mono edge-codes (`TS_06 · 0003 · MAR 2026`), participant counts, category, description, and the highlight line in `--spark`. The cursor reads `DRAG`, and drag also works. On mobile it is a native horizontal scroll-snap row (no pin).

### Closing CTA — "Daybreak"
A full-bleed shader in the ref-03 material: light **rises from below** (inverting the ref's pour), frost at the horizon fading upward into ink, with slow folds. Huge stacked `EXPERIENCE CAMPUS / BEYOND LIMITS.` in ink sits *on* the light, plus the label, copy, and two magnetic buttons.

### Footer
Logo (small, bottom-left corner) + wordmark, blurb, dept line, numbered directory, channels (Instagram, copy-email with toast, GitHub hidden while `CLUB_GITHUB_URL` is empty), `Admin Login`, ©, `BACK TO TOP`. Below that, a **giant cropped `TECHSPARK`** bleeding off the bottom edge and **lit from beneath** by a thin horizon of blue, with letters fading up into the dark.

### 404 — "This spark went out"
Black. A single spark at centre flickers twice and dies. Copy, then a `Relight → Home` pill that re-ignites the point as you hover it.

### /admin — same world, lights mostly off
No shaders. Ink surfaces, hairline dividers, mono labels, a single `--spark` accent, and the same input/pill components with their animation muted. The login card has a faint static ref-03 gradient at its top edge only.

---

## 3. Design system (summary)

- **Colour**: tokens exactly as in the brief. Warm is reserved for Fun & Social. Body text is `--mute` on `--ink` (checked for AA). Headings are `--frost`.
- **Type**: **Unbounded** (display, 200–400, uppercase, tracked 0.3–0.5em at small sizes and tighter at large), **Inter** (body 15/16px, `text-wrap: pretty`), **JetBrains Mono** (10–11px labels only).
- **Label system** (from ref-02): `02 │ ABOUT` with a hairline divider glyph, a top meta rail on key sections, and `02 / 06` section counters.
- **Spacing**: 8px base, section padding `clamp(96px, 16vh, 200px)`, 12-col grid with 24px gutters (16px on mobile).
- **Radii**: 0 on editorial surfaces, full pills on interactive gradient elements only. That contrast is the system.

## 4. Motion plan

- **Engine**: Lenis (duration 1.2, exponential easing) driving GSAP ScrollTrigger through one shared RAF.
- **Eases**: `expo.out` for reveals, `power4.inOut` for pinned scrubs, 0.9–1.4s. No springs, no bounce, no typewriter.
- **Text**: split into lines and masked (translateY 110% → 0, 60ms stagger). Nav links do a split-letter roll on hover.
- **Light is the transition**: every section entrance is driven by a light event (seam → flood → beam → pillar → strip → daybreak), so the page reads as one continuous take.
- **Cursor**: an 8px frost point with a soft blue halo. On hover it grows to a 64px ring with a mono label (`VIEW` / `RSVP` / `DRAG`), and it hides over inputs. Desktop pointer:fine only.
- **Magnetic buttons**: ≤ 8px pull, a light sweep on hover, scale 0.97 on press.
- **Route transitions**: View Transitions API (shared image/title), with a GSAP fallback that wipes through a thin light seam.
- **Performance**: one WebGL context per active shader, IntersectionObserver pause, DPR capped at 1.5, below-fold shaders lazy-mounted, and static grainy PNG fallbacks exported from the shaders.
- **Reduced motion**: no Lenis, no pins, shaders render one still frame, and reveals become 200ms opacity fades.

## 5. Tech choices

Vite + React + TS + Tailwind v4 · GSAP/ScrollTrigger · Lenis · **ogl** (smaller than three/r3f, and enough for full-screen fragment passes) · Supabase · lucide-react · react-router · SheetJS. The folders follow the brief (`src/sections`, `src/gl`, `src/lib`, `src/admin`, `supabase/schema.sql`).

---

## 6. Decisions

1. **Location: Navkis College of Engineering, Hassan.** The brief's footer line says "Bangalore". That is wrong; Hassan is used everywhere (footer, SEO, meta).
2. **Supabase:** built against a fresh project from `supabase/schema.sql`. Keys go in `.env.local` (template in `.env.example`).
3. **Event images:** uploaded later via the admin panel. Until then, image-less cards fall back to a category living-gradient frame instead of a broken image.

---

# v2: "Best of both" (approved 2026-11-25)

The revised brief (redis.agency structure plus a 3D crystal mascot) merged with the v1 light world.

| Taken from the revised brief | Kept from v1 |
|---|---|
| Huge editorial serif display (**Instrument Serif**), centred two-line hero `Tech / Spark` | The **aperture** shader as the hero's light: the crystal sits exactly at the spark point in the seam |
| **The Spark**: a faceted glass octahedron (it echoes the logo's diamond) with a pulsing blue core, which travels the whole page | Ignition preloader: point → seam → aperture, then the crystal **assembles from shards** and ignites |
| Floating crystal shards and soft light orbs at 3 depths with parallax | Grain, living gradients (ref-04), the Daybreak CTA (ref-03), the duotone photo treatment |
| Pill nav, the ticket-stub micro-detail with barcode, keyword marquee | Lit words (`Technology. Creativity. Community.`), now set in the serif |
| Events as a single centred column of big rounded cards | Seats in plain words, the <48h countdown, the register sheet and every state |
| What we do as hairline rows (serif name / em-dash list) | Each category row carries a WebGL light pillar that blooms on hover |
| Team row with hover photo swap (new `techspark_team` table) | Supabase, RLS, the admin and the OG middleware, all unchanged |
| Giant serif email footer; the page **loops** back into the hero | Mona Sans for all UI text (no mono, no wide tracking) |

Copy decisions: **Hassan** (not Bangalore) and **Inspire. Innovate. Integrate.** (the user's chat instruction overrides the brief file).

**Crystal path**: each section declares a pose with `data-spark="x y scale rotation"` (x and y as viewport fractions). The rig interpolates between the poses of the sections around the viewport centre, then adds pointer tilt, scroll-velocity spin, a lean toward a hovered event card and a flare on successful registration. It passes behind elements marked `.above-spark` and in front of everything else. One fixed transparent canvas (z 30) is lazy-loaded after first paint. On mobile it uses lighter glass (physical transmission, fewer shards). With reduced motion it's a static crystal with no loop. Without WebGL it falls back to a PNG.
