-- Cryptic Clue: Treasure Hunt — 3 Dec 2026, Auditorium. Run in Supabase → SQL Editor.
-- Safe to run twice (skips if the slug exists). Edit anything later in Admin → Events & Sessions.
insert into public.techspark_events
  (title, slug, description, full_description, date, time, end_time, location, category, status,
   published, featured, capacity, speaker, image, gallery, tags, registration_mode)
values (
  'Cryptic Clue: Treasure Hunt',
  'cryptic-clue-treasure-hunt',
  'Crack the clue, unlock the challenge! Solve puzzles, riddles and challenges, and race to claim the legendary treasure.',
  E'Crack puzzles, riddles & challenges — and race to claim the legendary treasure.\n\nTeam size: 3–4\nEntry fee: ₹200\nPrize pool: ₹5,000\n\nCo-ordinators:\nVijayraghavendra M — 9164775569\nDhaathri H S — 8792768014\nRaksha K R — 8497834794',
  '2026-12-03', '10:00 AM', '4:50 PM', 'Auditorium', 'Non-Technical', 'Open',
  true, true, 0, '',
  'https://techspark-navkis.vercel.app/posters/cryptic-clue.webp',
  array['https://techspark-navkis.vercel.app/posters/cryptic-clue.webp'],
  array['Treasure Hunt', 'Puzzles', 'Riddles', 'Teams of 3–4', 'Prize pool ₹5,000'],
  'form'
)
on conflict (slug) do nothing;
