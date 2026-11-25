-- Make Cryptic Clue a team event (3–4 people per team). Run AFTER the updated schema.sql.
update public.techspark_events
   set registration_kind = 'team', team_min = 3, team_max = 4
 where slug = 'cryptic-clue-treasure-hunt';
