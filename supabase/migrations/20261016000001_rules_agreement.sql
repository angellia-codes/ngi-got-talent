-- Records when each participant agreed to the Rules & Regulations, so HR has
-- something on file if a rule is broken on the night.
--
-- Nullable on purpose: registrations made before this migration never saw the
-- rules, and a backfilled timestamp would claim an agreement that did not
-- happen. No CHECK either — even a NOT VALID one is re-checked on UPDATE, so
-- admin_set_status would start failing on those older rows. submit_registration
-- is the only insert path anon has (see the lock_writes migration), and it
-- always sets the column.
alter table performances add column rules_agreed_at timestamptz;

-- The signature changes, so the old function has to be dropped: CREATE OR
-- REPLACE with an extra argument adds an overload instead, and the 7-argument
-- version would keep accepting registrations without an agreement.
drop function if exists submit_registration(
  text, uuid, performance_category, text, performer_type, text, int
);

-- Same body as the functions migration, plus the agreement. The timestamp is
-- the server's now(), not something the browser sends: a phone's clock is not
-- evidence of anything.
create function submit_registration(
  p_full_name text,
  p_outlet_id uuid,
  p_category performance_category,
  p_category_other text,
  p_performer_type performer_type,
  p_act_name text,
  p_performer_count int,
  p_agreed_to_rules boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name      text := btrim(coalesce(p_full_name, ''));
  v_category_other text := nullif(btrim(coalesce(p_category_other, '')), '');
  v_act_name       text := nullif(btrim(coalesce(p_act_name, '')), '');
  v_count          int  := p_performer_count;
  v_reference      text;
begin
  if length(v_full_name) < 2 then
    raise exception 'Please enter a name of at least 2 characters';
  end if;

  if not exists (select 1 from outlets where id = p_outlet_id) then
    raise exception 'Please choose an outlet';
  end if;

  if p_category = 'other' and v_category_other is null then
    raise exception 'Please say which kind of performance this is';
  end if;

  -- Drop values whose field is not in play, so a stale headcount left over
  -- from a Group -> Single switch cannot reach the table even if the form
  -- forgets to clear it.
  if p_category <> 'other' then
    v_category_other := null;
  end if;

  if p_performer_type in ('duo', 'group') and v_act_name is null then
    raise exception 'Please enter a group or act name';
  end if;

  if p_performer_type = 'single' then
    v_act_name := null;
  end if;

  if p_performer_type = 'group' then
    if v_count is null or v_count < 3 then
      raise exception 'A group needs at least 3 performers — pick Duo for two';
    end if;
  else
    v_count := null;
  end if;

  -- "is not true" rather than "= false": a null must be refused too.
  if p_agreed_to_rules is not true then
    raise exception 'Please read and agree to the Rules & Regulations';
  end if;

  -- status and running_order keep their defaults ('not_started', null): a
  -- caller cannot put its own act on stage or jump the running order.
  insert into performances (
    full_name, outlet_id, category, category_other,
    performer_type, act_name, performer_count, rules_agreed_at
  )
  values (
    v_full_name, p_outlet_id, p_category, v_category_other,
    p_performer_type, v_act_name, v_count, now()
  )
  returning reference_code into v_reference;

  return v_reference;
end;
$$;
