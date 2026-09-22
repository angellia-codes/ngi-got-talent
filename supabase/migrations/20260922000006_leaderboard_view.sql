-- Ranking = average of all submitted judge totals per act, sorted descending
-- (PRD §6.4). One combined leaderboard across every category, per PRD §4.
--
-- The Hidden/Live/Final Reveal gate lives inside the view rather than in the
-- phase-4 UI. Otherwise anon can read the standings straight off the REST API
-- while Admin believes the leaderboard is still Hidden.
--
-- security_invoker = on so the view respects the RLS on performances and
-- scores instead of running with its owner's privileges.
create view leaderboard
with (security_invoker = on)
as
with judge_totals as (
  -- Only locked (submitted) scores count, so a judge who is halfway through
  -- entering a rubric cannot move the standings.
  select
    s.performance_id,
    s.judge_slot_id,
    sum(s.points) as judge_total
  from scores s
  where s.locked_at is not null
  group by s.performance_id, s.judge_slot_id
)
select
  p.id as performance_id,
  p.reference_code,
  p.full_name,
  p.act_name,
  p.category,
  p.category_other,
  p.performer_type,
  o.name as outlet,
  count(jt.judge_slot_id) as judges_scored,
  round(avg(jt.judge_total), 2) as average_total
from performances p
join outlets o on o.id = p.outlet_id
left join judge_totals jt on jt.performance_id = p.id
where exists (
  select 1 from event_settings es
  where es.id = 1 and es.leaderboard_state <> 'hidden'
)
group by p.id, p.reference_code, p.full_name, p.act_name, p.category,
         p.category_other, p.performer_type, o.name
order by average_total desc nulls last, p.reference_code;

grant select on leaderboard to anon, authenticated;
