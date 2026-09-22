-- Access model: no Supabase Auth. The anon key is read-only everywhere, and
-- every write — registration included — goes through a SECURITY DEFINER
-- function. There is deliberately no INSERT, UPDATE or DELETE policy anywhere
-- in this file: following the Badminton app, the absence of a policy is the
-- security boundary.

alter table outlets enable row level security;
alter table performances enable row level security;
alter table criteria enable row level security;
alter table judge_slots enable row level security;
alter table scores enable row level security;
alter table event_settings enable row level security;

create policy public_read_outlets on outlets
  for select to anon, authenticated using (true);

create policy public_read_criteria on criteria
  for select to anon, authenticated using (true);

create policy public_read_judge_slots on judge_slots
  for select to anon, authenticated using (true);

create policy public_read_event_settings on event_settings
  for select to anon, authenticated using (true);

create policy public_read_scores on scores
  for select to anon, authenticated using (true);

-- Acts that have reached the stage are public: the judge screen needs the
-- current one, the leaderboard needs the scored ones. The pre-event roster
-- stays private so staff names are not listable from the public URL — the
-- admin reads it through a PIN-checked RPC in phase 2.
create policy public_read_started_performances on performances
  for select to anon, authenticated using (status <> 'not_started');

-- Without this, the reference_code column default cannot call nextval() and
-- every registration fails. SECURITY DEFINER already covers the RPC; granting
-- it explicitly keeps the default usable if a later phase inserts directly.
grant usage on sequence performance_reference_seq to anon, authenticated;

-- private.app_secrets is unreachable with the anon key because a non-public
-- schema is not exposed through the REST API. These revokes make that explicit
-- rather than relying on Supabase's default privileges staying as they are.
revoke usage on schema private from anon, authenticated;
revoke all on private.app_secrets from anon, authenticated;
