-- ════════════════════════════════════════════════════════════════════════════
--  TECHSPARK — Supabase schema
--  Run this whole file in a fresh project: Supabase → SQL Editor → New query → Run.
--  It is idempotent: safe to re-run.
--
--  After running it, make yourself an admin (replace the email):
--    insert into public.techspark_admins (id, role)
--    select id, 'admin' from auth.users where email = 'you@college.edu'
--    on conflict (id) do nothing;
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─────────────────────────────── Admins ───────────────────────────────
create table if not exists public.techspark_admins (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

-- One device at a time: the session that signed in most recently holds the admin seat.
-- (Supabase puts a session_id claim in every access token; we compare against it.)
alter table public.techspark_admins add column if not exists active_session uuid;
alter table public.techspark_admins add column if not exists session_claimed_at timestamptz;

-- The single source of truth for "is this request from an admin?" — used by every RLS policy.
-- True only for an admin account *and* the session currently holding the seat, so a second device
-- (or a stolen old token) loses every admin permission the moment someone signs in elsewhere.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.techspark_admins a
    where a.id = auth.uid()
      and (a.active_session is null or a.active_session::text = coalesce(auth.jwt() ->> 'session_id', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Called right after a successful sign-in: this session takes the seat. Returns the role, or null if not an admin.
create or replace function public.claim_admin_session()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sid  text := auth.jwt() ->> 'session_id';
  v_role text;
begin
  if auth.uid() is null or v_sid is null then
    return null;
  end if;
  update public.techspark_admins
     set active_session = v_sid::uuid, session_claimed_at = now()
   where id = auth.uid()
  returning role into v_role;
  return v_role;
end;
$$;
revoke all on function public.claim_admin_session() from public, anon;
grant execute on function public.claim_admin_session() to authenticated;

-- ─────────────────────────────── Events ───────────────────────────────
create table if not exists public.techspark_events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null,
  description       text,
  full_description  text,
  date              date,
  time              text,
  location          text,
  category          text default 'Technical',
  status            text default 'Open',          -- Open | Full | Closed
  published         boolean not null default false,
  capacity          integer not null default 0 check (capacity >= 0),   -- 0 = unlimited
  registered_count  integer not null default 0 check (registered_count >= 0),
  speaker           text,
  image             text,
  tags              text[] not null default '{}',
  featured          boolean not null default false,
  created_at        timestamptz not null default now(),
  constraint uq_events_slug unique (slug)
);
create index if not exists idx_events_published_date on public.techspark_events (published, date);

-- v2 fields (safe on existing projects)
alter table public.techspark_events add column if not exists end_time text;
alter table public.techspark_events add column if not exists registration_mode text not null default 'form'; -- form | external | closed
alter table public.techspark_events add column if not exists registration_url text;                          -- used when mode = external
alter table public.techspark_events add column if not exists registration_deadline timestamptz;              -- registrations close after this
alter table public.techspark_events add column if not exists gallery text[] not null default '{}';
-- team events: registrations are per team (leader + members); capacity counts teams
alter table public.techspark_events add column if not exists registration_kind text not null default 'individual'; -- individual | team
alter table public.techspark_events add column if not exists team_min integer not null default 2;
alter table public.techspark_events add column if not exists team_max integer not null default 4;
-- paid events: the student pays by UPI, then pastes the 12-digit UTR; the registration is only created with one
alter table public.techspark_events add column if not exists payment_required boolean not null default false;
alter table public.techspark_events add column if not exists entry_fee integer not null default 0;   -- ₹ per registration (per team for team events)
alter table public.techspark_events add column if not exists upi_id text;
alter table public.techspark_events add column if not exists upi_name text;
alter table public.techspark_events add column if not exists payment_qr text;                        -- image URL of the UPI QR
alter table public.techspark_events add column if not exists payment_note text;

-- ─────────────────────────────── Categories ───────────────────────────────
create table if not exists public.techspark_categories (
  name        text primary key,
  description text,
  created_at  timestamptz not null default now()
);
insert into public.techspark_categories (name, description) values
  ('Technical', 'Hackathons, Competitions, Workshops & Tech Talks'),
  ('Non-Technical', 'Creative Showcases, Quizzes & Team Challenges'),
  ('Fun & Social', 'Recreational Gatherings, Games & Interactive Mixers')
on conflict (name) do nothing;

-- ─────────────────────────────── Announcements ───────────────────────────────
create table if not exists public.techspark_announcements (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  summary             text,
  content             text,
  date                date default current_date,
  category            text default 'General',
  priority            text default 'Normal',       -- Low | Normal | High | Urgent
  author              text,
  pinned              boolean not null default false,
  published           boolean not null default false,
  related_event_slug  text,
  created_at          timestamptz not null default now()
);
alter table public.techspark_announcements add column if not exists link_url text;
alter table public.techspark_announcements add column if not exists link_label text;
create index if not exists idx_announcements_order on public.techspark_announcements (published, pinned desc, created_at desc);

-- ─────────────────────────────── Past events ───────────────────────────────
create table if not exists public.techspark_past_events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  date          date,
  participants  integer default 0,
  category      text default 'Technical',
  description   text,
  image         text,
  highlight     text,
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.techspark_past_events add column if not exists gallery text[] not null default '{}';
alter table public.techspark_past_events add column if not exists link_url text;

-- ─────────────────────────────── Site content (every piece of copy, editable in admin) ───────────────────────────────
create table if not exists public.techspark_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────── Team ───────────────────────────────
create table if not exists public.techspark_team (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text,
  photo       text,
  photo_fun   text,          -- shown on hover
  sort_order  integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────── Registrations ───────────────────────────────
create table if not exists public.techspark_registrations (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.techspark_events (id) on delete cascade,
  event_title    text not null,
  student_name   text not null,
  student_email  text not null,
  student_roll   text not null,
  department     text not null,
  year           text not null,
  status         text not null default 'Confirmed' check (status in ('Confirmed', 'Waitlisted')),
  created_at     timestamptz not null default now()
);
create unique index if not exists uq_reg_event_email on public.techspark_registrations (event_id, lower(student_email));
create unique index if not exists uq_reg_event_roll  on public.techspark_registrations (event_id, upper(student_roll));
create index if not exists idx_reg_event_status on public.techspark_registrations (event_id, status, created_at);
-- team registrations: the leader is the student_* columns; the rest of the team lives here
alter table public.techspark_registrations add column if not exists team_name text;
alter table public.techspark_registrations add column if not exists team_members jsonb not null default '[]'::jsonb; -- [{name, roll, email, department, year}]
create index if not exists idx_reg_team_members on public.techspark_registrations using gin (team_members);
-- UPI payment: the transaction reference the student pasted, what they were asked to pay, and whether an admin checked it
alter table public.techspark_registrations add column if not exists payment_utr text;
alter table public.techspark_registrations add column if not exists payment_amount integer;
alter table public.techspark_registrations add column if not exists payment_verified boolean not null default false;
-- one UTR pays for one registration, across every event
create unique index if not exists uq_reg_payment_utr on public.techspark_registrations (payment_utr) where payment_utr is not null;

-- ─────────────────────────────── RPC: register_for_event ───────────────────────────────
-- Atomic: locks the event row, validates, checks duplicates and capacity, inserts Confirmed or Waitlisted.
-- Individual events: one student. Team events: the caller is the leader; p_team_name + p_members (the rest).
-- Nobody can appear twice for the same event — as a leader or as a member of any team.
-- The only way anon can write a registration. (registered_count is maintained by trg_registration_count.)
-- Paid events: p_utr is required (12 digits, never used before) and a full event refuses before anyone pays twice.
-- Returns the new registration's id: the student's device keeps it as a private receipt (see registration_status).
drop function if exists public.register_for_event(uuid, text, text, text, text, text);
drop function if exists public.register_for_event(uuid, text, text, text, text, text, text, jsonb);
create or replace function public.register_for_event(
  p_event_id      uuid,
  p_student_name  text,
  p_student_email text,
  p_student_roll  text,
  p_department    text,
  p_year          text,
  p_team_name     text  default null,
  p_members       jsonb default '[]'::jsonb,
  p_utr           text  default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event   public.techspark_events%rowtype;
  v_status  text;
  v_name    text := btrim(coalesce(p_student_name, ''));
  v_email   text := lower(btrim(coalesce(p_student_email, '')));
  v_roll    text := upper(regexp_replace(coalesce(p_student_roll, ''), '\s', '', 'g'));
  v_team    text := nullif(btrim(coalesce(p_team_name, '')), '');
  v_members jsonb := coalesce(p_members, '[]'::jsonb);
  v_rolls   text[];
  v_size    int;
  v_is_team boolean;
  v_paid    boolean;
  v_utr     text := nullif(regexp_replace(coalesce(p_utr, ''), '\s', '', 'g'), '');
  v_id      uuid;
begin
  if length(v_name) < 2 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or length(v_roll) < 4
     or coalesce(p_department, '') = '' or coalesce(p_year, '') = '' then
    return json_build_object('success', false, 'error', 'Please fill in every field with valid details.');
  end if;
  if jsonb_typeof(v_members) <> 'array' then
    return json_build_object('success', false, 'error', 'Team members were sent in an unexpected format.');
  end if;

  select * into v_event from public.techspark_events
  where id = p_event_id and published = true
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'This event is not open for registration.');
  end if;

  if v_event.status ilike any (array['closed%', 'cancel%', 'complete%', 'ended%'])
     or v_event.registration_mode = 'closed'
     or (v_event.registration_deadline is not null and now() > v_event.registration_deadline) then
    return json_build_object('success', false, 'error', 'Registrations for this event are closed.');
  end if;

  if v_event.registration_mode = 'external' then
    return json_build_object('success', false, 'error', 'This event takes registrations through its own link.');
  end if;

  v_is_team := v_event.registration_kind = 'team';
  if v_is_team then
    if v_team is null or length(v_team) < 2 then
      return json_build_object('success', false, 'error', 'Give your team a name.');
    end if;
    v_size := 1 + jsonb_array_length(v_members);
    if v_size < v_event.team_min or v_size > v_event.team_max then
      return json_build_object('success', false, 'error',
        format('Teams for this event need %s–%s people, including you.', v_event.team_min, v_event.team_max));
    end if;
    if exists (
      select 1 from jsonb_array_elements(v_members) e
      where length(btrim(coalesce(e->>'name', ''))) < 2
         or length(regexp_replace(coalesce(e->>'roll', ''), '\s', '', 'g')) < 4
    ) then
      return json_build_object('success', false, 'error', 'Fill in every team member’s name and roll number.');
    end if;
    -- normalise members
    select coalesce(jsonb_agg(jsonb_build_object(
             'name', btrim(e->>'name'),
             'roll', upper(regexp_replace(e->>'roll', '\s', '', 'g')),
             'email', lower(btrim(coalesce(e->>'email', ''))),
             'department', coalesce(e->>'department', ''),
             'year', coalesce(e->>'year', '')
           )), '[]'::jsonb)
      into v_members
      from jsonb_array_elements(v_members) e;
  else
    v_team := null;
    v_members := '[]'::jsonb;
  end if;

  v_rolls := array[v_roll] || coalesce((select array_agg(e->>'roll') from jsonb_array_elements(v_members) e), '{}'::text[]);
  if (select count(distinct r) from unnest(v_rolls) r) <> cardinality(v_rolls) then
    return json_build_object('success', false, 'error', 'The same roll number appears twice in your team.');
  end if;

  if exists (
    select 1 from public.techspark_registrations r
    where r.event_id = p_event_id
      and (lower(r.student_email) = v_email
           or upper(r.student_roll) = any(v_rolls)
           or exists (select 1 from jsonb_array_elements(r.team_members) x where upper(x->>'roll') = any(v_rolls)))
  ) then
    return json_build_object('success', false, 'error',
      case when v_is_team
        then 'Someone on this team (or this email) is already registered for this event.'
        else 'You have already registered for this event with this roll number or email.' end);
  end if;

  if v_is_team and exists (
    select 1 from public.techspark_registrations r
    where r.event_id = p_event_id and lower(r.team_name) = lower(v_team)
  ) then
    return json_build_object('success', false, 'error', 'That team name is already taken for this event — pick another.');
  end if;

  v_paid := v_event.payment_required and v_event.entry_fee > 0;

  if v_event.capacity > 0 and v_event.registered_count >= v_event.capacity then
    if v_paid then
      -- no waitlist for paid events: nobody should pay for a seat that may never come
      return json_build_object('success', false, 'full', true, 'error', case when v_utr is null
        then 'This event just filled up — please don’t pay.'
        else 'This event filled up while you were paying, so your registration couldn’t be saved. Contact the club with your UTR for a refund.' end);
    end if;
    v_status := 'Waitlisted';
  else
    v_status := 'Confirmed';
  end if;

  if v_paid then
    if v_utr is null then
      -- every other check passed: the form calls this first, so nobody pays and then finds a problem
      return json_build_object('success', false, 'needs_payment', true, 'amount', v_event.entry_fee,
        'error', 'Pay the entry fee, then enter the 12-digit UTR from your payment.');
    end if;
    if v_utr !~ '^[0-9]{12}$' then
      return json_build_object('success', false, 'error', 'A UTR is exactly 12 digits — check your UPI app’s payment details.');
    end if;
    if exists (select 1 from public.techspark_registrations r where r.payment_utr = v_utr) then
      return json_build_object('success', false, 'error', 'That UTR has already been used for a registration. Check the number, or contact the club.');
    end if;
  else
    v_utr := null;
  end if;

  insert into public.techspark_registrations
    (event_id, event_title, student_name, student_email, student_roll, department, year, status, team_name, team_members,
     payment_utr, payment_amount)
  values
    (p_event_id, v_event.title, v_name, v_email, v_roll, p_department, p_year, v_status, v_team, v_members,
     v_utr, case when v_paid then v_event.entry_fee end)
  returning id into v_id;

  return json_build_object(
    'success', true,
    'id', v_id,
    'status', v_status,
    'message', case
      when v_status = 'Confirmed' and v_is_team then 'Your team’s spot is reserved.'
      when v_status = 'Confirmed' then 'Your seat has been reserved.'
      else 'Added to the waitlist.' end
  );
exception
  when unique_violation then
    declare v_constraint text;
    begin
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'uq_reg_payment_utr' then
        return json_build_object('success', false, 'error', 'That UTR has already been used for a registration. Check the number, or contact the club.');
      end if;
      return json_build_object('success', false, 'error', 'You have already registered for this event with this roll number or email.');
    end;
end;
$$;
revoke all on function public.register_for_event(uuid, text, text, text, text, text, text, jsonb, text) from public;
grant execute on function public.register_for_event(uuid, text, text, text, text, text, text, jsonb, text) to anon, authenticated;

-- ─────────────────────────────── RPC: registration_status ───────────────────────────────
-- A student's device asks "is my registration still there?" with the id it got back when registering.
-- The id is a random uuid only that device knows, and the answer is just a status word — no personal details.
-- 'Removed' when an admin deleted it, so the site shows the Register button again.
create or replace function public.registration_status(p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select status from public.techspark_registrations where id = p_id), 'Removed');
$$;
revoke all on function public.registration_status(uuid) from public;
grant execute on function public.registration_status(uuid) to anon, authenticated;

-- Seat accounting lives in one trigger, so the RPC, admin inserts, status edits and deletes all stay consistent.
--   insert Confirmed → +1 · status Waitlisted→Confirmed → +1 · Confirmed→Waitlisted → −1
--   delete Confirmed → promote the oldest waitlisted student (seat stays taken), or −1 if nobody is waiting
create or replace function public.techspark_registration_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_next uuid;
begin
  if tg_op = 'INSERT' then
    if new.status = 'Confirmed' then
      update public.techspark_events set registered_count = registered_count + 1 where id = new.event_id;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.status <> new.status then
      update public.techspark_events
        set registered_count = greatest(registered_count + case when new.status = 'Confirmed' then 1 else -1 end, 0)
        where id = new.event_id;
    end if;
    return new;
  else -- DELETE
    if old.status = 'Confirmed' then
      select id into v_next from public.techspark_registrations
      where event_id = old.event_id and status = 'Waitlisted'
      order by created_at asc limit 1
      for update skip locked;
      if v_next is not null then
        -- the promoted student inherits the freed seat: UPDATE fires +1, so release the old seat first
        update public.techspark_events set registered_count = greatest(registered_count - 1, 0) where id = old.event_id;
        update public.techspark_registrations set status = 'Confirmed' where id = v_next;
      else
        update public.techspark_events set registered_count = greatest(registered_count - 1, 0) where id = old.event_id;
      end if;
    end if;
    return old;
  end if;
end;
$$;
drop trigger if exists trg_registration_delete on public.techspark_registrations;
drop function if exists public.techspark_on_registration_delete();
drop trigger if exists trg_registration_count on public.techspark_registrations;
create trigger trg_registration_count after insert or update of status or delete on public.techspark_registrations
for each row execute function public.techspark_registration_count();

-- ════════════════════════════════════════════════════════════════════════════
--  Row Level Security — the admin gate lives here, not in the browser.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.techspark_admins        enable row level security;
alter table public.techspark_events        enable row level security;
alter table public.techspark_categories    enable row level security;
alter table public.techspark_announcements enable row level security;
alter table public.techspark_past_events   enable row level security;
alter table public.techspark_team          enable row level security;
alter table public.techspark_settings      enable row level security;
alter table public.techspark_registrations enable row level security;

-- admins: a signed-in user can read their own row (the client uses this to read `role`).
-- No insert/update/delete policies: admins are granted from the SQL editor only.
drop policy if exists "admins read self" on public.techspark_admins;
create policy "admins read self" on public.techspark_admins
  for select to authenticated using (id = auth.uid() or public.is_admin());

-- events / announcements / past events / team: public sees published rows; admins see and write everything.
do $$
declare t text;
begin
  foreach t in array array['techspark_events', 'techspark_announcements', 'techspark_past_events', 'techspark_team'] loop
    execute format('drop policy if exists "public read published" on public.%I', t);
    execute format('create policy "public read published" on public.%I for select to anon, authenticated using (published = true or public.is_admin())', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- site content: readable by everyone, writable by admins.
drop policy if exists "public read" on public.techspark_settings;
create policy "public read" on public.techspark_settings for select to anon, authenticated using (true);
drop policy if exists "admin write" on public.techspark_settings;
create policy "admin write" on public.techspark_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- categories: readable by everyone, writable by admins.
drop policy if exists "public read" on public.techspark_categories;
create policy "public read" on public.techspark_categories for select to anon, authenticated using (true);
drop policy if exists "admin write" on public.techspark_categories;
create policy "admin write" on public.techspark_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- registrations: no anon access at all (anon registers only through the RPC above).
drop policy if exists "admin read" on public.techspark_registrations;
create policy "admin read" on public.techspark_registrations for select to authenticated using (public.is_admin());
drop policy if exists "admin insert" on public.techspark_registrations;
create policy "admin insert" on public.techspark_registrations for insert to authenticated with check (public.is_admin());
drop policy if exists "admin update" on public.techspark_registrations;
create policy "admin update" on public.techspark_registrations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete" on public.techspark_registrations;
create policy "admin delete" on public.techspark_registrations for delete to authenticated using (public.is_admin());
revoke insert on public.techspark_registrations from anon;

-- ════════════════════════════════════════════════════════════════════════════
--  Storage: event-images (public read, admin write) — event, gallery and team photos + gallery videos
-- ════════════════════════════════════════════════════════════════════════════
-- Photos (≤ 5 MB, enforced in the admin UI) and gallery videos (≤ 50 MB). The bucket allows the larger of the two.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

drop policy if exists "event images public read" on storage.objects;
create policy "event images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'event-images');
drop policy if exists "event images admin insert" on storage.objects;
create policy "event images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'event-images' and public.is_admin());
drop policy if exists "event images admin update" on storage.objects;
create policy "event images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'event-images' and public.is_admin());
drop policy if exists "event images admin delete" on storage.objects;
create policy "event images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'event-images' and public.is_admin());
