-- Nourish GOT Talent — core schema
--
-- Single-event by design: the multi-year option PRD §7 left open was explicitly
-- declined, so there is no parent `events` table and nothing carries an
-- event_id. Supporting a 2027 season later means a data migration; that trade
-- was made knowingly.

create schema if not exists private;

create type performance_category as enum ('dance', 'sing', 'band', 'drama', 'other');
create type performer_type as enum ('single', 'duo', 'group');
create type performance_status as enum ('not_started', 'on_stage', 'scored', 'skipped');
create type leaderboard_state as enum ('hidden', 'live', 'final_reveal');

-- A table rather than an enum, matching the Badminton app: an outlet can be
-- added or renamed without a migration, and registrations keep pointing at the
-- right row.
create table outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order int not null default 0
);

-- Human-readable registration reference. A sequence rather than a UUID: GT-007
-- can be read back over the phone, cannot collide, and doubles as arrival
-- order. The anon role needs USAGE on this sequence (granted in the RLS
-- migration) or every registration fails on the column default.
create sequence performance_reference_seq start 1;

create table performances (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique
    default 'GT-' || lpad(nextval('performance_reference_seq')::text, 3, '0'),
  -- "Performer Name" for a Single act, "Representative / Contact Name" for a
  -- Duo or Group — one column, the label switches in the form (PRD §6.1).
  full_name text not null,
  outlet_id uuid not null references outlets (id),
  category performance_category not null,
  category_other text,
  performer_type performer_type not null,
  act_name text,
  performer_count int,
  -- Nullable and deliberately NOT unique: a unique running_order turns
  -- drag-reordering into a shuffle of conflicting updates. Callers order by
  -- (running_order nulls last, created_at) instead.
  running_order int,
  status performance_status not null default 'not_started',
  created_at timestamptz not null default now()
);

-- The rubric is data, not code (PRD §7): changing a criterion or its weight is
-- an UPDATE, not a deploy.
create table criteria (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  max_points int not null default 20 check (max_points > 0),
  display_order int not null default 0,
  is_active boolean not null default true
);

-- A session tag, not an account (PRD §4): the shared PIN gets a judge in, then
-- they claim a slot so three judges' scores can be told apart and averaged.
create table judge_slots (
  id uuid primary key default gen_random_uuid(),
  slot_number int not null unique check (slot_number > 0),
  is_active boolean not null default true
);

-- One row per (performance × judge slot × criterion), per PRD §7.
--
-- locked_at is the submit lock from PRD §6.3, set across a judge's whole
-- row-set in one transaction by the phase-3 submit RPC and cleared by an admin
-- override. A separate submissions table would have bought only a join.
--
-- NOTE: points <= criteria.max_points is NOT enforced here — a CHECK cannot
-- reach another table. The submit RPC is the only guard, so do not assume the
-- database validates the ceiling.
create table scores (
  id uuid primary key default gen_random_uuid(),
  performance_id uuid not null references performances (id) on delete cascade,
  judge_slot_id uuid not null references judge_slots (id) on delete cascade,
  criterion_id uuid not null references criteria (id),
  points int not null check (points >= 0),
  locked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (performance_id, judge_slot_id, criterion_id)
);

-- Singleton, following the Latte Art app's tournament_state shape.
--
-- Deliberately does NOT hold the on-stage performance id. PRD §7 sketched one,
-- but §6.2 makes performances.status the thing that drives what judges see,
-- and two columns for one fact drift the first time someone edits a row in the
-- Supabase dashboard.
create table event_settings (
  id int primary key default 1 check (id = 1),
  leaderboard_state leaderboard_state not null default 'hidden',
  judge_count int not null default 3 check (judge_count between 1 and 10),
  updated_at timestamptz not null default now()
);

-- Lives outside `public`, so Supabase's REST API does not expose it at all —
-- a stronger guarantee than RLS with no policies. Read only by the
-- SECURITY DEFINER functions in the functions migration.
create table private.app_secrets (
  key text primary key,
  value text not null
);
