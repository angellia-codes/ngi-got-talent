-- The conditional field rules from PRD §6.1 are business rules, so they live in
-- the database as well as the form. A registration that breaks one is rejected
-- whether it arrives from the UI, the RPC, or the Supabase dashboard.

alter table performances add constraint full_name_not_blank
  check (btrim(full_name) <> '');

-- "Other" requires the free-text box — and forbids it for every other
-- category, so a stale value cannot survive a category change.
alter table performances add constraint category_other_matches_category
  check ((category = 'other') = (category_other is not null and btrim(category_other) <> ''));

-- Group/Act Name is required for Duo and Group, and absent for Single.
alter table performances add constraint act_name_matches_performer_type
  check ((performer_type in ('duo', 'group')) = (act_name is not null and btrim(act_name) <> ''));

-- Headcount only for Group, minimum 3 — two performers is a Duo (PRD §6.1).
-- The explicit `is not null` matters: a CHECK passes when its expression is
-- NULL, so `performer_count >= 3` alone would let a Group through with no
-- headcount at all.
alter table performances add constraint performer_count_matches_performer_type
  check (
    case
      when performer_type = 'group' then performer_count is not null and performer_count >= 3
      else performer_count is null
    end
  );

-- Exactly one act can be on stage. Same partial-index idiom as the Badminton
-- app's one_approved_slot_per_outlet_category: unique on a column filtered to a
-- single value means only one row may hold that value.
create unique index one_act_on_stage on performances (status) where status = 'on_stage';

-- The admin running order (phase 2).
create index performances_running_order_idx on performances (running_order nulls last, created_at);

-- "Has this judge scored this act?" — the judge screen, and the admin's
-- all-judges-are-in check before marking an act Scored.
create index scores_performance_judge_idx on scores (performance_id, judge_slot_id);
