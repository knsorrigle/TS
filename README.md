# TECHSPARK — club website

Student-led club at **Navkis College of Engineering, Hassan** (CSE). Vite + React + TypeScript + Tailwind v4, GSAP/Lenis motion, hand-written WebGL (ogl), Supabase backend. Design direction: [`DESIGN.md`](DESIGN.md).

## Run it

```bash
npm install
npm run dev
```

Without Supabase keys, `npm run dev` uses **demo data** (dev only) so every section, state and the full registration + admin flow can be tried. Admin demo login: any email, any 4+ character password.

## Connect Supabase

1. Create a project at supabase.com → **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql). It's idempotent, so you can safely re-run it.
2. Create your organizer account under **Authentication → Users**, then make it an admin:
   ```sql
   insert into public.techspark_admins (id, role)
   select id, 'admin' from auth.users where email = 'you@college.edu'
   on conflict (id) do nothing;
   ```
3. `cp .env.example .env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API).

The admin gate is enforced by RLS (`is_admin()`), not just the UI. Anonymous visitors can only read published rows and register through the `register_for_event` RPC.

## Deploy (Vercel)

Import the repo, add the two `VITE_SUPABASE_*` env vars, deploy. `vercel.json` handles the SPA rewrite. [`middleware.ts`](middleware.ts) injects per-event `<title>`/OG tags on `/events/:slug` so WhatsApp shares show the event.

## Where things live

| Path | What |
|---|---|
| `src/sections/*` | Home page sections, top to bottom |
| `src/gl/*` | GLSL: hero aperture + living gradients |
| `src/components/*` | Register sheet, cards, cursor, nav, toasts… |
| `src/lib/api.ts` | Supabase queries + snake_case ↔ camelCase mappers |
| `src/admin/*` | `/admin` dashboard (lazy-loaded) |
| `supabase/schema.sql` | Tables, RPC, waitlist promotion, RLS, storage |

## To fill in

- `CLUB_GITHUB_URL` in `src/lib/site.ts`: the GitHub icon stays hidden while it's empty.
