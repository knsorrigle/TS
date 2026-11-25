-- Bulletin for Cryptic Clue: Treasure Hunt. Run in Supabase → SQL Editor.
-- Safe to run twice (skips if a bulletin with this title exists). Edit or unpin later in Admin → Bulletins & News.
insert into public.techspark_announcements
  (title, summary, content, date, category, priority, author, pinned, published, related_event_slug)
select
  'Cryptic Clue: registrations are open',
  'A campus treasure hunt on 3 December. Teams of 3–4, ₹200 per team, ₹5,000 in prizes.',
  E'Cryptic Clue: Treasure Hunt runs on Thursday, 3 December, 10:00 AM – 4:50 PM, starting at the Auditorium. Solve puzzles, riddles and on-the-spot challenges across campus, and race the other teams to the treasure.\n\nTeams of 3–4 · entry ₹200 per team · prize pool ₹5,000.\n\nHow to register: open the event, tap Register, and fill in your team. Pay ₹200 by scanning the UPI QR (or paying to the UPI ID shown), then paste the 12-digit UTR from your UPI app. One person registers for the whole team.\n\nQuestions? The co-ordinators’ numbers are on the event page.',
  current_date, 'Events', 'High', 'TECHSPARK', true, true, 'cryptic-clue-treasure-hunt'
where not exists (
  select 1 from public.techspark_announcements where title = 'Cryptic Clue: registrations are open'
);

select title, pinned, published, related_event_slug from public.techspark_announcements
where title = 'Cryptic Clue: registrations are open';
