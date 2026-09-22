-- Phase 3 — Judging (PRD §6.3).
--
-- One publicly-callable entry point, taking the Judge PIN as its first argument
-- and SECURITY DEFINER because the anon role holds no write privilege at all
-- after the lock_writes migration. Same shape as the admin functions:
-- search_path pinned, or the function is resolvable against a caller-controlled
-- schema.
--
-- Everything the judge screen reads — the on-stage act, the criteria, the
-- active slots, the scores already in — is already readable under the phase-1
-- RLS policies, so there is no judge_list_* to write.
--
-- No ALTER TABLE. Everything this phase needs was put in place by phase 1.

-- Mirror of private.require_admin. Reuses private.check_pin rather than
-- comparing the secret again here: check_pin already btrims both sides (a
-- trailing newline in the stored PIN reads as a forgotten password) and already
-- carries the anti-guessing pg_sleep.
create or replace function private.require_judge(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.check_pin(p_pin, 'judge') then
    raise exception 'Incorrect PIN';
  end if;
end;
$$;

-- The whole rubric lands as one set or not at all: p_points is
-- {"<criterion_id>": 17, ...} covering every active criterion.
--
-- Rejected: a per-criterion autosave RPC. A set-at-a-time submit is what makes
-- the PRD §6.3 lock a single fact rather than five, and it means a judge who
-- walks away half-done cannot move the standings.
--
-- This function is also the ONLY guard on points <= criteria.max_points. The
-- schema says so explicitly: a CHECK cannot reach another table.
create or replace function judge_submit_scores(
  p_pin text,
  p_performance_id uuid,
  p_judge_slot_id uuid,
  p_points jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_status   performance_status;
  v_active   int;
  v_supplied int;
  v_bad      text;
begin
  perform private.require_judge(p_pin);

  select status into v_status from performances where id = p_performance_id;
  if v_status is null then
    raise exception 'No such act';
  end if;

  -- Scoring is for whatever Admin has on stage. Once the act is closed out the
  -- rubric is history, and a late submit would silently change a settled
  -- average.
  if v_status <> 'on_stage' then
    raise exception 'That act is not on stage';
  end if;

  if not exists (
    select 1 from judge_slots where id = p_judge_slot_id and is_active
  ) then
    raise exception 'That judge slot is not active';
  end if;

  -- The submit lock. Cleared only by admin_unlock_scores, so a judge cannot
  -- quietly revise a score after seeing where the act landed.
  if exists (
    select 1 from scores
    where performance_id = p_performance_id
      and judge_slot_id = p_judge_slot_id
      and locked_at is not null
  ) then
    raise exception 'Those scores are already submitted — ask the admin to unlock them';
  end if;

  if p_points is null or jsonb_typeof(p_points) <> 'object' then
    raise exception 'Please score every criterion';
  end if;

  -- Exactly one entry per active criterion: a missing one would leave a partial
  -- rubric locked, and an unknown key means the form is scoring something this
  -- event does not use.
  select count(*) into v_active from criteria where is_active;
  select count(*) into v_supplied
  from jsonb_each(p_points) e
  join criteria c on c.id::text = e.key and c.is_active;

  if v_supplied <> v_active or v_supplied <> (select count(*) from jsonb_each(p_points)) then
    raise exception 'Please score every criterion';
  end if;

  -- Whole numbers only, and checked before anything is cast: a text or decimal
  -- value would raise a cast error from inside a WHERE clause otherwise, since
  -- SQL does not promise the typeof test is evaluated first.
  if exists (
    select 1 from jsonb_each(p_points) e
    where jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}') !~ '^\d+$'
  ) then
    raise exception 'Every score must be a whole number';
  end if;

  select c.name into v_bad
  from jsonb_each(p_points) e
  join criteria c on c.id::text = e.key
  where (e.value #>> '{}')::int > c.max_points
  limit 1;

  if v_bad is not null then
    raise exception 'Score for % is above its maximum', v_bad;
  end if;

  insert into scores (performance_id, judge_slot_id, criterion_id, points, locked_at, updated_at)
  select p_performance_id, p_judge_slot_id, c.id, (e.value #>> '{}')::int, now(), now()
  from jsonb_each(p_points) e
  join criteria c on c.id::text = e.key
  on conflict (performance_id, judge_slot_id, criterion_id) do update
  set points = excluded.points,
      locked_at = excluded.locked_at,
      updated_at = excluded.updated_at;
end;
$$;
