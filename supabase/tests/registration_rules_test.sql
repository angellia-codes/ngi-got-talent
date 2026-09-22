-- Registration rules self-test.
--
-- Run against the project (Supabase SQL editor, or the MCP execute_sql tool).
-- Silence means it passed: every block below expects the database to REJECT
-- something, and raises a REGRESSION exception if it was accepted instead.
--
-- Rolls back its own data, but note that the rejected INSERTs still consume
-- values from performance_reference_seq — nextval is not transactional. After
-- running this against a live event database, rewind the sequence:
--   select setval('performance_reference_seq',
--                 (select coalesce(max(substring(reference_code from 4)::int), 0)
--                  from performances));

do $$
declare
  v_outlet uuid;
  v_kept   uuid;
begin
  select id into v_outlet from outlets order by display_order limit 1;
  if v_outlet is null then
    raise exception 'No outlets seeded — run the realtime_and_seed migration first';
  end if;

  ---------------------------------------------------------------- constraints

  -- "Other" requires the free-text box (PRD §6.1).
  begin
    insert into performances (full_name, outlet_id, category, performer_type)
    values ('Bad Other', v_outlet, 'other', 'single');
    raise exception 'REGRESSION: category=other with no category_other was allowed';
  exception when check_violation then null;
  end;

  -- Duo requires an act name.
  begin
    insert into performances (full_name, outlet_id, category, performer_type)
    values ('Bad Duo', v_outlet, 'dance', 'duo');
    raise exception 'REGRESSION: duo with no act_name was allowed';
  exception when check_violation then null;
  end;

  -- A group of two is a Duo.
  begin
    insert into performances (full_name, outlet_id, category, performer_type, act_name, performer_count)
    values ('Bad Group', v_outlet, 'dance', 'group', 'The Twos', 2);
    raise exception 'REGRESSION: group with performer_count 2 was allowed';
  exception when check_violation then null;
  end;

  -- The CHECK-passes-on-NULL trap: `performer_count >= 3` alone evaluates to
  -- NULL here, which a CHECK treats as a pass. The constraint has an explicit
  -- `is not null` to close it.
  begin
    insert into performances (full_name, outlet_id, category, performer_type, act_name)
    values ('Null Group', v_outlet, 'dance', 'group', 'The Nulls');
    raise exception 'REGRESSION: group with null performer_count was allowed';
  exception when check_violation then null;
  end;

  -- A Single must not carry a leftover act name.
  begin
    insert into performances (full_name, outlet_id, category, performer_type, act_name)
    values ('Stale Single', v_outlet, 'dance', 'single', 'Leftover');
    raise exception 'REGRESSION: single with act_name was allowed';
  exception when check_violation then null;
  end;

  begin
    insert into performances (full_name, outlet_id, category, performer_type)
    values ('   ', v_outlet, 'dance', 'single');
    raise exception 'REGRESSION: blank full_name was allowed';
  exception when check_violation then null;
  end;

  ---------------------------------------------------------------------- RPC

  -- The happy path, and the trimming the RPC is responsible for.
  perform submit_registration('  Test Single  ', v_outlet, 'dance', null, 'single', null, null);
  select id into v_kept from performances where full_name = 'Test Single';
  if v_kept is null then
    raise exception 'REGRESSION: submit_registration did not trim full_name';
  end if;

  -- The RPC must drop values whose field no longer applies rather than
  -- trusting the caller to have cleared them.
  perform submit_registration('Test Stale', v_outlet, 'dance', 'ignored', 'single', 'ignored', 9);
  if exists (
    select 1 from performances
    where full_name = 'Test Stale'
      and (category_other is not null or act_name is not null or performer_count is not null)
  ) then
    raise exception 'REGRESSION: submit_registration kept values for inapplicable fields';
  end if;

  -- And it must reject what the form would have caught.
  begin
    perform submit_registration('X', v_outlet, 'dance', null, 'single', null, null);
    raise exception 'REGRESSION: submit_registration accepted a 1-character name';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  begin
    perform submit_registration('Test Group', v_outlet, 'dance', null, 'group', 'The Twos', 2);
    raise exception 'REGRESSION: submit_registration accepted a group of 2';
  exception when raise_exception then
    if sqlerrm like 'REGRESSION%' then raise; end if;
  end;

  ------------------------------------------------------------- one on stage

  update performances set status = 'on_stage' where id = v_kept;
  begin
    update performances set status = 'on_stage' where full_name = 'Test Stale';
    raise exception 'REGRESSION: two acts were allowed on stage at once';
  exception when unique_violation then null;
  end;

  --------------------------------------------------------------------- PINs

  if not verify_pin((select value from private.app_secrets where key = 'judge_pin'), 'judge') then
    raise exception 'REGRESSION: the seeded judge PIN did not verify';
  end if;

  if verify_pin('definitely-not-the-pin', 'judge') then
    raise exception 'REGRESSION: a wrong PIN verified';
  end if;

  ------------------------------------------------------------------ cleanup

  delete from performances where full_name in ('Test Single', 'Test Stale');

  raise notice 'registration_rules_test: all checks passed';
end $$;
