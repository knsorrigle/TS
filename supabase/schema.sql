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

-- The single source of truth for "is this request from an admin?" — used by every RLS policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.techspark_admins where id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

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

-- ─────────────────────────────── RPC: register_for_event ───────────────────────────────
-- Atomic: locks the event row, checks duplicates and capacity, inserts Confirmed or Waitlisted,
-- and bumps registered_count. The only way anon can write a registration.
create or replace function public.register_for_event(
  p_event_id      uuid,
  p_student_name  text,
  p_student_email text,
  p_student_roll  text,
  p_department    text,
  p_year          text
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
begin
  if length(v_name) < 2 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or length(v_roll) < 4
     or coalesce(p_department, '') = '' or coalesce(p_year, '') = '' then
    return json_build_object('success', false, 'error', 'Please fill in every field with valid details.');
  end if;

  select * into v_event from public.techspark_events
  where id = p_event_id and published = true
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'This event is not open for registration.');
  end if;

  if v_event.status ilike any (array['closed%', 'cancel%', 'complete%', 'ended%']) then
    return json_build_object('success', false, 'error', 'Registrations for this event are closed.');
  end if;

  if exists (
    select 1 from public.techspark_registrations
    where event_id = p_event_id and (lower(student_email) = v_email or upper(student_roll) = v_roll)
  ) then
    return json_build_object('success', false, 'error', 'You have already registered for this event with this roll number or email.');
  end if;

  if v_event.capacity > 0 and v_event.registered_count >= v_event.capacity then
    v_status := 'Waitlisted';
  else
    v_status := 'Confirmed';
  end if;

  insert into public.techspark_registrations
    (event_id, event_title, student_name, student_email, student_roll, department, year, status)
  values
    (p_event_id, v_event.title, v_name, v_email, v_roll, p_department, p_year, v_status);

  if v_status = 'Confirmed' then
    update public.techspark_events set registered_count = registered_count + 1 where id = p_event_id;
  end if;

  return json_build_object(
    'success', true,
    'status', v_status,
    'message', case when v_status = 'Confirmed' then 'Your seat has been reserved.' else 'Added to the waitlist.' end
  );
exception
  when unique_violation then
    return json_build_object('success', false, 'error', 'You have already registered for this event with this roll number or email.');
end;
$$;
revoke all on function public.register_for_event(uuid, text, text, text, text, text) from public;
grant execute on function public.register_for_event(uuid, text, text, text, text, text) to anon, authenticated;

-- When an admin removes a confirmed registration, promote the oldest waitlisted student
-- (or free the seat if nobody is waiting).
create or replace function public.techspark_on_registration_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_next uuid;
begin
  if old.status = 'Confirmed' then
    select id into v_next from public.techspark_registrations
    where event_id = old.event_id and status = 'Waitlisted'
    order by created_at asc limit 1
    for update skip locked;
    if v_next is not null then
      update public.techspark_registrations set status = 'Confirmed' where id = v_next;
    else
      update public.techspark_events set registered_count = greatest(registered_count - 1, 0) where id = old.event_id;
    end if;
  end if;
  return old;
end;
$$;
drop trigger if exists trg_registration_delete on public.techspark_registrations;
create trigger trg_registration_delete after delete on public.techspark_registrations
for each row execute function public.techspark_on_registration_delete();

-- ════════════════════════════════════════════════════════════════════════════
--  Row Level Security — the admin gate lives here, not in the browser.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.techspark_admins        enable row level security;
alter table public.techspark_events        enable row level security;
alter table public.techspark_categories    enable row level security;
alter table public.techspark_announcements enable row level security;
alter table public.techspark_past_events   enable row level security;
alter table public.techspark_registrations enable row level security;

-- admins: a signed-in user can read their own row (the client uses this to read `role`).
-- No insert/update/delete policies: admins are granted from the SQL editor only.
drop policy if exists "admins read self" on public.techspark_admins;
create policy "admins read self" on public.techspark_admins
  for select to authenticated using (id = auth.uid() or public.is_admin());

-- events / announcements / past events: public sees published rows; admins see and write everything.
do $$
declare t text;
begin
  foreach t in array array['techspark_events', 'techspark_announcements', 'techspark_past_events'] loop
    execute format('drop policy if exists "public read published" on public.%I', t);
    execute format('create policy "public read published" on public.%I for select to anon, authenticated using (published = true or public.is_admin())', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- categories: readable by everyone, writable by admins.
drop policy if exists "public read" on public.techspark_categories;
create policy "public read" on public.techspark_categories for select to anon, authenticated using (true);
drop policy if exists "admin write" on public.techspark_categories;
create policy "admin write" on public.techspark_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- registrations: no anon access at all (anon registers only through the RPC above).
drop policy if exists "admin read" on public.techspark_registrations;
create policy "admin read" on public.techspark_registrations for select to authenticated using (public.is_admin());
drop policy if exists "admin update" on public.techspark_registrations;
create policy "admin update" on public.techspark_registrations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete" on public.techspark_registrations;
create policy "admin delete" on public.techspark_registrations for delete to authenticated using (public.is_admin());
revoke insert on public.techspark_registrations from anon;

-- ════════════════════════════════════════════════════════════════════════════
--  Storage: event-images (public read, admin write)
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

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
