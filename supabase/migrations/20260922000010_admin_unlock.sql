-- The override PRD §6.3 asks for: "Admin can unlock/override if a judge
-- fat-fingers a number." Phase 2 shipped without it because nothing could be
-- locked yet; phase 3's submit lock is what makes it reachable.
--
-- Clears locked_at rather than deleting the rows, so the judge's screen reopens
-- pre-filled with what they entered and they fix the one number they got wrong.
-- Rejected: delete, which hands a judge a blank rubric to re-enter from memory.
--
-- Nothing else has to change for the standings to follow: the leaderboard view
-- and admin_list_performances both count only locked scores, so an unlocked
-- act drops out of both on its own.
-- Takes the slot NUMBER, not the slot id: admin_list_performances already
-- hands the admin page judge_totals keyed by slot number ({"1": 88}), and the
-- slot's uuid appears nowhere on that screen.
create or replace function admin_unlock_scores(
  p_pin text,
  p_performance_id uuid,
  p_slot_number int
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin(p_pin);

  update scores s
  set locked_at = null,
      updated_at = now()
  from judge_slots js
  where js.id = s.judge_slot_id
    and js.slot_number = p_slot_number
    and s.performance_id = p_performance_id;
end;
$$;
