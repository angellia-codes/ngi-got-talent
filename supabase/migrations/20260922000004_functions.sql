-- PIN verification and registration.
--
-- Both are SECURITY DEFINER so they can read private.app_secrets and write
-- performances while the anon role itself holds no write privilege at all.
-- search_path is pinned on every one of them; without it a SECURITY DEFINER
-- function is resolvable against a caller-controlled schema.

create or replace function private.check_pin(p_pin text, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  expected text;
begin
  select value into expected
  from private.app_secrets
  where key = p_role || '_pin';

  -- btrim both sides. The Badminton app shipped a fix commit for exactly this:
  -- a trailing newline in the stored secret gives a permanent "Incorrect PIN"
  -- that reads like a forgotten password rather than a whitespace bug.
  if expected is not null and btrim(expected) = btrim(coalesce(p_pin, '')) then
    return true;
  end if;

  -- Crude anti-guessing delay, as in the Badminton Edge Function. A shared
  -- 4-digit event PIN is 10,000 guesses; without this it falls in seconds,
  -- with it a full sweep takes an hour and a half.
  perform pg_sleep(0.6);
  return false;
end;
$$;

create or replace function verify_pin(p_pin text, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_role not in ('admin', 'judge') then
    raise exception 'Unknown role';
  end if;
  return private.check_pin(p_pin, p_role);
end;
$$;

-- The public registration endpoint. Returns the reference code only.
--
-- This is an RPC rather than a direct table INSERT (which is what the
-- Badminton app does) for two reasons: PostgREST needs a SELECT policy to
-- return an inserted row, and we deliberately hide not_started registrations
-- from the public. Routing through a function means no anon write policy has
-- to exist anywhere.
create or replace function submit_registration(
  p_full_name text,
  p_outlet_id uuid,
  p_category performance_category,
  p_category_other text,
  p_performer_type performer_type,
  p_act_name text,
  p_performer_count int
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

  -- status and running_order keep their defaults ('not_started', null): a
  -- caller cannot put its own act on stage or jump the running order.
  insert into performances (
    full_name, outlet_id, category, category_other,
    performer_type, act_name, performer_count
  )
  values (
    v_full_name, p_outlet_id, p_category, v_category_other,
    p_performer_type, v_act_name, v_count
  )
  returning reference_code into v_reference;

  return v_reference;
end;
$$;
