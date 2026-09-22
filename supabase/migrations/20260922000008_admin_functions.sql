-- Phase 2 — the Admin surface (PRD §6.2).
--
-- Four publicly-callable entry points, each taking the Admin PIN as its first
-- argument and each SECURITY DEFINER, because the anon role holds no write
-- privilege at all after the lock_writes migration. Same shape as
-- submit_registration and verify_pin: search_path is pinned on every one of
-- them, or the function is resolvable against a caller-controlled schema.
--
-- No ALTER TABLE. Everything this phase needs was put in place by phase 1.

-- The guard every function below opens with. Reuses private.check_pin rather
-- than comparing the secret again here: check_pin already btrims both sides
-- (a trailing newline in the stored PIN reads as a forgotten password) and
-- already carries the anti-guessing pg_sleep.
create or replace function private.require_admin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.check_pin(p_pin, 'admin') then
    raise exception 'Incorrect PIN';
  end if;
end;
$$;

-- The single read the admin page makes, feeding the roster, the filters, the
-- running order and the tie-break review.
--
-- It cannot be a plain select from the client: public_read_started_performances
-- hides not_started rows, and that is the entire pre-event roster.
--
-- It also deliberately does NOT read the `leaderboard` view. That view returns
-- zero rows while leaderboard_state = 'hidden' — the visibility gate lives
-- inside it by design — and Admin resolves ties before the reveal.
create or replace function admin_list_performances(p_pin text)
returns table (
  id uuid,
  reference_code text,
  full_name text,
  outlet_id uuid,
  outlet text,
  category performance_category,
  category_other text,
  performer_type performer_type,
  act_name text,
  performer_count int,
  running_order int,
  status performance_status,
  created_at timestamptz,
  judges_scored int,
  average_total numeric,
  judge_totals jsonb
)
language plpgsql
security definer
set search_path = public, private
as $$
-- Every column below is alias-qualified, but the RETURNS TABLE names shadow
-- real columns (id, status, category, …); this makes the column win if one
-- ever slips through unqualified.
#variable_conflict use_column
begin
  perform private.require_admin(p_pin);

  return query
  with locked_totals as (
    -- Only locked (submitted) scores count, matching the leaderboard view: a
    -- judge halfway through a rubric must not move the standings.
    select s.performance_id, js.slot_number, sum(s.points)::int as total
    from scores s
    join judge_slots js on js.id = s.judge_slot_id
    where s.locked_at is not null
    group by s.performance_id, js.slot_number
  )
  select
    p.id,
    p.reference_code,
    p.full_name,
    p.outlet_id,
    o.name,
    p.category,
    p.category_other,
    p.performer_type,
    p.act_name,
    p.performer_count,
    p.running_order,
    p.status,
    p.created_at,
    count(lt.slot_number)::int,
    round(avg(lt.total), 2),
    -- {"1": 88, "2": 86} — the per-judge breakdown the tie-break panel shows
    -- beside acts that landed on the same average.
    coalesce(
      jsonb_object_agg(lt.slot_number, lt.total) filter (where lt.slot_number is not null),
      '{}'::jsonb
    )
  from performances p
  join outlets o on o.id = p.outlet_id
  left join locked_totals lt on lt.performance_id = p.id
  group by p.id, o.name
  order by p.running_order nulls last, p.created_at;
end;
$$;

-- The whole ordered list is sent on every reorder rather than a single moved
-- row, so two admin tabs cannot interleave a read-modify-write into a shuffle.
-- running_order is nullable and not unique by design, so this needs no
-- constraint juggling — acts left out of the array simply keep what they had.
create or replace function admin_set_running_order(p_pin text, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin(p_pin);

  update performances p
  set running_order = o.ord::int
  from unnest(p_ids) with ordinality as o(perf_id, ord)
  where p.id = o.perf_id;
end;
$$;

-- Not Started -> On Stage -> Scored / Skipped (PRD §6.2), plus the undo back
-- to not_started.
create or replace function admin_set_status(
  p_pin text,
  p_performance_id uuid,
  p_status performance_status
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_current performance_status;
begin
  perform private.require_admin(p_pin);

  select status into v_current from performances where id = p_performance_id;
  if v_current is null then
    raise exception 'No such act';
  end if;

  if p_status = 'on_stage' then
    -- Already live. Falling through would demote it and leave an empty stage.
    if v_current = 'on_stage' then
      return;
    end if;

    -- Close out whatever is live first, in this same transaction, so the
    -- one_act_on_stage partial unique index never sees two rows. Angel chose
    -- this over refusing until the outgoing act is closed by hand: one tap per
    -- act at a live event. The UI confirms first when fewer judges have
    -- submitted than event_settings.judge_count.
    update performances set status = 'scored' where status = 'on_stage';
  end if;

  update performances set status = p_status where id = p_performance_id;
end;
$$;

-- Leaderboard state and judge count in one function: both are nullable and
-- coalesce onto the current row, so the page changes either independently.
create or replace function admin_update_settings(
  p_pin text,
  p_leaderboard_state leaderboard_state default null,
  p_judge_count int default null
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_count int;
begin
  perform private.require_admin(p_pin);

  update event_settings
  set leaderboard_state = coalesce(p_leaderboard_state, leaderboard_state),
      judge_count       = coalesce(p_judge_count, judge_count),
      updated_at        = now()
  where id = 1
  returning judge_count into v_count;

  if p_judge_count is not null then
    insert into judge_slots (slot_number)
    select g from generate_series(1, v_count) g
    on conflict (slot_number) do nothing;

    -- Deactivated, never deleted: scores.judge_slot_id cascades on delete, so
    -- dropping a slot to shrink the panel would silently destroy that judge's
    -- scores. Raising the count again brings the slot and its scores back.
    update judge_slots set is_active = (slot_number <= v_count);
  end if;
end;
$$;
