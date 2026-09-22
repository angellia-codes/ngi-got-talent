-- Admin rules self-test (phase 2).
--
-- Run against the project (Supabase SQL editor, or the MCP execute_sql tool).
-- Silence means it passed: every check below raises a REGRESSION exception if
-- the database behaved differently.
--
-- Cleans up its own rows and restores event_settings to whatever it found, but
-- as with the registration test the registrations it creates consume values
-- from performance_reference_seq. After running this against a live event
-- database, rewind the sequence:
--   select setval('performance_reference_seq',
--                 (select coalesce(max(substring(reference_code from 4)::int), 0)
--                  from performances));
--
-- Takes about three seconds: each wrong-PIN check pays check_pin's deliberate
-- anti-guessing delay.

do $$
declare
  v_pin     text;
  v_outlet  uuid;
  v_a       uuid;
  v_b       uuid;
  v_crit    uuid;
  v_slot3   uuid;
  v_state   leaderboard_state;
  v_judges  int;
  v_n       int;
begin
  select value into v_pin from private.app_secrets where key = 'admin_pin';
  select id into v_outlet from outlets order by display_order limit 1;
  select leaderboard_state, judge_count into v_state, v_judges
  from event_settings where id = 1;

  if v_pin is null or v_outlet is null or v_state is null then
    raise exception 'Seed data missing — run the realtime_and_seed migration first';
  end if;

  -- Two acts to move around. Created through the public RPC so they land in
  -- exactly the state a real registration does: not_started, no running order.
  perform submit_registration('Admin Test A', v_outlet, 'dance', null, 'single', null, null);
  perform submit_registration('Admin Test B', v_outlet, 'sing', null, 'duo', 'Test Duo', null);
  select id into v_a from performances where full_name = 'Admin Test A';
  select id into v_b from performances where full_name = 'Admin Test B';

  ---------------------------------------------------------------------- PINs

  begin
    perform admin_list_performances('definitely-not-the-pin');
    raise exception 'REGRESSION: admin_list_performances accepted a wrong PIN';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  begin
    perform admin_set_running_order('definitely-not-the-pin', array[v_a]);
    raise exception 'REGRESSION: admin_set_running_order accepted a wrong PIN';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  begin
    perform admin_set_status('definitely-not-the-pin', v_a, 'on_stage');
    raise exception 'REGRESSION: admin_set_status accepted a wrong PIN';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  begin
    perform admin_update_settings('definitely-not-the-pin', 'final_reveal', null);
    raise exception 'REGRESSION: admin_update_settings accepted a wrong PIN';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  -------------------------------------------------------------- the roster

  -- The whole point of the RPC: the pre-event roster is hidden from anon by
  -- public_read_started_performances, and the admin still has to see it.
  if not exists (
    select 1 from admin_list_performances(v_pin) r
    where r.id = v_a and r.status = 'not_started'
  ) then
    raise exception 'REGRESSION: admin_list_performances hid a not_started act';
  end if;

  execute 'set role anon';
  select count(*) into v_n from performances where id = v_a;
  execute 'reset role';
  if v_n <> 0 then
    raise exception 'REGRESSION: anon could read a not_started act directly';
  end if;

  -------------------------------------------------------- the running order

  perform admin_set_running_order(v_pin, array[v_b, v_a]);
  if (select running_order from performances where id = v_b) <> 1
     or (select running_order from performances where id = v_a) <> 2 then
    raise exception 'REGRESSION: admin_set_running_order did not assign 1..n in array order';
  end if;

  ------------------------------------------------------------ stage advance

  perform admin_set_status(v_pin, v_a, 'on_stage');
  perform admin_set_status(v_pin, v_b, 'on_stage');

  select count(*) into v_n from performances where status = 'on_stage';
  if v_n <> 1 then
    raise exception 'REGRESSION: % acts on stage after advancing', v_n;
  end if;

  if (select status from performances where id = v_a) <> 'scored' then
    raise exception 'REGRESSION: the outgoing act was not closed out as scored';
  end if;

  -- Re-staging the act that is already live must be a no-op. Without the
  -- guard it demotes itself first and leaves an empty stage.
  perform admin_set_status(v_pin, v_b, 'on_stage');
  if (select status from performances where id = v_b) <> 'on_stage' then
    raise exception 'REGRESSION: re-staging the live act cleared the stage';
  end if;

  -------------------------------------------------------------- judge count

  select id into v_slot3 from judge_slots where slot_number = 3;
  select id into v_crit from criteria order by display_order limit 1;
  insert into scores (performance_id, judge_slot_id, criterion_id, points, locked_at)
  values (v_b, v_slot3, v_crit, 17, now());

  perform admin_update_settings(v_pin, null, 2);
  if (select is_active from judge_slots where slot_number = 3) then
    raise exception 'REGRESSION: lowering judge_count left slot 3 active';
  end if;

  -- scores.judge_slot_id cascades on delete, so shrinking the panel by
  -- deleting a slot would take that judge's scores with it.
  if not exists (select 1 from scores where judge_slot_id = v_slot3 and performance_id = v_b) then
    raise exception 'REGRESSION: lowering judge_count deleted slot 3 scores';
  end if;

  perform admin_update_settings(v_pin, null, 3);
  if not (select is_active from judge_slots where slot_number = 3) then
    raise exception 'REGRESSION: raising judge_count did not reactivate slot 3';
  end if;

  ------------------------------------------------- standings while hidden

  -- The tie-break review runs before the reveal, so the admin standings must
  -- survive a gate that empties the public leaderboard view completely.
  perform admin_update_settings(v_pin, 'hidden', null);

  if (select count(*) from leaderboard) <> 0 then
    raise exception 'REGRESSION: the leaderboard view leaked rows while hidden';
  end if;

  if (select r.average_total from admin_list_performances(v_pin) r where r.id = v_b) is null then
    raise exception 'REGRESSION: the admin standings were empty while the leaderboard was hidden';
  end if;

  if (select r.judge_totals from admin_list_performances(v_pin) r where r.id = v_b) -> '3' is null then
    raise exception 'REGRESSION: judge_totals did not carry the per-slot breakdown';
  end if;

  ------------------------------------------------------------------ cleanup

  delete from scores where performance_id in (v_a, v_b);
  delete from performances where id in (v_a, v_b);
  perform admin_update_settings(v_pin, v_state, v_judges);

  raise notice 'admin_rules_test: all checks passed';
end $$;
