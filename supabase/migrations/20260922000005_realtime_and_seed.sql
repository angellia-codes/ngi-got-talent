-- Realtime is opt-in per table. Every table a hook subscribes to must appear
-- here: the Badminton app subscribes to `registrations` (data.ts:73) but never
-- added it to the publication, so that listener is silently inert.
alter publication supabase_realtime add table performances;
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table event_settings;

-- The six outlets from PRD §3.
insert into outlets (name, display_order) values
  ('Nourish Ungasan', 1),
  ('Nourish Uluwatu', 2),
  ('Nourish Berawa', 3),
  ('Wholefood', 4),
  ('The Bakery', 5),
  ('BOH', 6);

-- PRD §6.3: 5 criteria x 20 pts = 100 total.
insert into criteria (name, max_points, display_order) values
  ('Technical Skill', 20, 1),
  ('Creativity / Originality', 20, 2),
  ('Stage Presence', 20, 3),
  ('Audience Engagement', 20, 4),
  ('Overall Impression', 20, 5);

-- Three slots, per PRD §4. Admin adds or deactivates slots in phase 2.
insert into judge_slots (slot_number) values (1), (2), (3);

insert into event_settings (id, leaderboard_state, judge_count)
values (1, 'hidden', 3)
on conflict (id) do nothing;

-- PLACEHOLDER PINS. These must be changed before the event:
--   update private.app_secrets set value = '<pin>' where key = 'admin_pin';
--   update private.app_secrets set value = '<pin>' where key = 'judge_pin';
insert into private.app_secrets (key, value) values
  ('admin_pin', '000000'),
  ('judge_pin', '000000')
on conflict (key) do nothing;
