-- Judging rules self-test (phases 3 and 4).
--
-- Run against the project (Supabase SQL editor, or the MCP execute_sql tool).
-- Silence means it passed: every check below raises a REGRESSION exception if
-- the database behaved differently.
--
-- Cleans up its own rows and restores event_settings to whatever it found, but
-- as with the other two tests the registration it creates consumes a value from
-- performance_reference_seq. After running this against a live event database,
-- rewind the sequence:
--   select setval('performance_reference_seq',
--                 (select coalesce(max(substring(reference_code from 4)::int), 0)
--                  from performances));
--
-- Takes a few seconds: each wrong-PIN check pays check_pin's deliberate
-- anti-guessing delay.
--
-- It puts its own act on stage, which closes out whatever was live at the time
-- exactly as admin_set_status does for a real advance. Do not run it during a
-- show.

do $$
declare
  v_judge_pin text;
  v_admin_pin text;
  v_outlet    uuid;
  v_act       uuid;
  v_slot1     uuid;
  v_slot3     uuid;
  v_crit      uuid;
  v_points    jsonb;
  v_state     leaderboard_state;
  v_judges    int;
  v_n         int;
  v_avg       numeric;
begin
  select value into v_judge_pin from private.app_secrets where key = 'judge_pin';
  select value into v_admin_pin from private.app_secrets where key = 'admin_pin';
  select id into v_outlet from outlets order by display_order limit 1;
  select leaderboard_state, judge_count into v_state, v_judges from event_settings where id = 1;

  if v_judge_pin is null or v_admin_pin is null or v_outlet is null or v_state is null then
    raise exception 'Seed data missing — run the realtime_and_seed migration first';
  end if;

  -- The panel has to be at full size for the inactive-slot check below to have
  -- a slot 3 to deactivate.
  perform admin_update_settings(v_admin_pin, null, 3);
  select id into v_slot1 from judge_slots where slot_number = 1;
  select id into v_slot3 from judge_slots where slot_number = 3;
  select id into v_crit from criteria where is_active order by display_order limit 1;

  -- 15 on every active criterion: a valid, complete rubric.
  select jsonb_object_agg(id::text, 15) into v_points from criteria where is_active;

  perform submit_registration('Judge Test Act', v_outlet, 'band', null, 'group', 'Test Band', 4);
  select id into v_act from performances where full_name = 'Judge Test Act';

  ---------------------------------------------------------------------- PINs

  begin
    perform judge_submit_scores('definitely-not-the-pin', v_act, v_slot1, v_points);
    raise exception 'REGRESSION: judge_submit_scores accepted a wrong PIN';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  begin
    perform admin_unlock_scores('definitely-not-the-pin', v_act, 1);
    raise exception 'REGRESSION: admin_unlock_scores accepted a wrong PIN';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  ------------------------------------------------------------- what is on stage

  -- The act is still not_started. Scoring it would let a judge move an average
  -- for an act that has not performed.
  begin
    perform judge_submit_scores(v_judge_pin, v_act, v_slot1, v_points);
    raise exception 'REGRESSION: an act that is not on stage was scored';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  perform admin_set_status(v_admin_pin, v_act, 'on_stage');

  ------------------------------------------------------------------- the slot

  perform admin_update_settings(v_admin_pin, null, 2);
  begin
    perform judge_submit_scores(v_judge_pin, v_act, v_slot3, v_points);
    raise exception 'REGRESSION: a deactivated judge slot was allowed to score';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;
  perform admin_update_settings(v_admin_pin, null, 3);

  ---------------------------------------------------------------- the payload

  begin
    perform judge_submit_scores(v_judge_pin, v_act, v_slot1, v_points - v_crit::text);
    raise exception 'REGRESSION: a rubric missing a criterion was accepted';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  begin
    perform judge_submit_scores(
      v_judge_pin, v_act, v_slot1,
      v_points || jsonb_build_object(gen_random_uuid()::text, 5)
    );
    raise exception 'REGRESSION: a rubric with an unknown criterion was accepted';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  -- The ceiling is this function's job alone: schema.sql says plainly that a
  -- CHECK cannot reach criteria.max_points from scores.
  begin
    perform judge_submit_scores(
      v_judge_pin, v_act, v_slot1,
      v_points || jsonb_build_object(v_crit::text, 999)
    );
    raise exception 'REGRESSION: a score above max_points was accepted';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  begin
    perform judge_submit_scores(
      v_judge_pin, v_act, v_slot1,
      v_points || jsonb_build_object(v_crit::text, 15.5)
    );
    raise exception 'REGRESSION: a fractional score was accepted';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  begin
    perform judge_submit_scores(
      v_judge_pin, v_act, v_slot1,
      v_points || jsonb_build_object(v_crit::text, 'twenty')
    );
    raise exception 'REGRESSION: a non-numeric score was accepted';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  if exists (select 1 from scores where performance_id = v_act) then
    raise exception 'REGRESSION: a rejected rubric left rows behind';
  end if;

  ------------------------------------------------------------ a valid submit

  perform judge_submit_scores(v_judge_pin, v_act, v_slot1, v_points);

  select count(*) into v_n
  from scores where performance_id = v_act and judge_slot_id = v_slot1 and locked_at is not null;
  if v_n <> (select count(*) from criteria where is_active) then
    raise exception 'REGRESSION: % criteria landed locked, expected one per active criterion', v_n;
  end if;

  -- The submit lock (PRD §6.3): only an admin unlock reopens it.
  begin
    perform judge_submit_scores(v_judge_pin, v_act, v_slot1, v_points);
    raise exception 'REGRESSION: a locked rubric was submitted over';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  ------------------------------------------------------ what the surfaces see

  select r.average_total into v_avg from admin_list_performances(v_admin_pin) r where r.id = v_act;
  if v_avg is null or v_avg <> (select sum(15) from criteria where is_active) then
    raise exception 'REGRESSION: the admin average was %, expected the judge total', v_avg;
  end if;

  perform admin_update_settings(v_admin_pin, 'hidden', null);
  if (select count(*) from leaderboard) <> 0 then
    raise exception 'REGRESSION: the leaderboard view leaked rows while hidden';
  end if;

  perform admin_update_settings(v_admin_pin, 'live', null);
  select l.average_total into v_avg from leaderboard l where l.performance_id = v_act;
  if v_avg is null then
    raise exception 'REGRESSION: a scored act was missing from the live leaderboard';
  end if;

  ------------------------------------------------------------------- unlock

  perform admin_unlock_scores(v_admin_pin, v_act, 1);

  if exists (
    select 1 from scores where performance_id = v_act and locked_at is not null
  ) then
    raise exception 'REGRESSION: unlock left the scores locked';
  end if;

  -- Unlock deletes nothing: the judge reopens on their own numbers.
  select count(*) into v_n from scores where performance_id = v_act;
  if v_n <> (select count(*) from criteria where is_active) then
    raise exception 'REGRESSION: unlock deleted the judge rows';
  end if;

  -- Both the view and admin_list_performances count only locked scores, so an
  -- unlocked act drops out of the standings with no other change.
  select l.average_total into v_avg from leaderboard l where l.performance_id = v_act;
  if v_avg is not null then
    raise exception 'REGRESSION: an unlocked act still counted on the leaderboard';
  end if;

  perform judge_submit_scores(
    v_judge_pin, v_act, v_slot1,
    (select jsonb_object_agg(id::text, 10) from criteria where is_active)
  );
  select l.average_total into v_avg from leaderboard l where l.performance_id = v_act;
  if v_avg <> (select sum(10) from criteria where is_active) then
    raise exception 'REGRESSION: the resubmitted total was %, expected the new scores', v_avg;
  end if;

  ------------------------------------------------------------------ cleanup

  delete from scores where performance_id = v_act;
  delete from performances where id = v_act;
  perform admin_update_settings(v_admin_pin, v_state, v_judges);

  raise notice 'judging_rules_test: all checks passed';
end $$;
