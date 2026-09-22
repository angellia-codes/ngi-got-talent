import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Loader2, Lock, TriangleAlert, UserRound } from "lucide-react";
import PinGate, { storedPin } from "../components/PinGate.tsx";
import { supabase } from "../lib/supabase.ts";
import {
  actLabel,
  categoryLabel,
  type Criterion,
  type JudgeSlot,
  type Performance,
  type Score,
} from "../lib/types.ts";

const SLOT_KEY = "gt_judge_slot";

export default function Judge() {
  return (
    <PinGate role="judge" title="Judging">
      <JudgeBoard />
    </PinGate>
  );
}

function JudgeBoard() {
  const [slots, setSlots] = useState<JudgeSlot[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [act, setAct] = useState<Performance | null>(null);
  // null while the first load is in flight — an empty array would read as "no
  // scores yet" and let the prefill below fire against nothing.
  const [scores, setScores] = useState<Score[] | null>(null);
  const [slotId, setSlotId] = useState(() => sessionStorage.getItem(SLOT_KEY) ?? "");

  const [points, setPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    // Refetched whenever event_settings changes: admin_update_settings is what
    // activates and deactivates slots, and judge_slots is not in the realtime
    // publication itself.
    const { data } = await supabase
      .from("judge_slots")
      .select("*")
      .eq("is_active", true)
      .order("slot_number");
    setSlots((data ?? []) as JudgeSlot[]);
  }, []);

  const loadAct = useCallback(async () => {
    // public_read_started_performances exposes exactly this row to anon, so the
    // current act needs no RPC of its own.
    const { data } = await supabase
      .from("performances")
      .select("*")
      .eq("status", "on_stage")
      .maybeSingle();
    setAct((data ?? null) as Performance | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void supabase
      .from("criteria")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => setCriteria((data ?? []) as Criterion[]));
    void loadSlots();
    void loadAct();
  }, [loadSlots, loadAct]);

  const loadScores = useCallback(async () => {
    if (!act) {
      setScores([]);
      return;
    }
    const { data } = await supabase.from("scores").select("*").eq("performance_id", act.id);
    setScores((data ?? []) as Score[]);
  }, [act]);

  useEffect(() => {
    // Both reset together: a new act must never inherit the previous act's
    // chips, not even for the frame before the prefill effect runs.
    setScores(null);
    setPoints({});
    void loadScores();
  }, [loadScores]);

  useEffect(() => {
    const channel = supabase
      .channel("judge")
      .on("postgres_changes", { event: "*", schema: "public", table: "performances" }, () => {
        void loadAct();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () => {
        void loadScores();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_settings" }, () => {
        void loadSlots();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadAct, loadScores, loadSlots]);

  const myScores = useMemo(
    () => (scores ?? []).filter((s) => s.judge_slot_id === slotId),
    [scores, slotId],
  );
  const locked = myScores.some((s) => s.locked_at !== null);

  // Prefill once per (act, slot). Keyed rather than run on every scores change
  // because another judge submitting would otherwise wipe a rubric mid-entry.
  const prefilled = useRef("");
  useEffect(() => {
    if (!act || !slotId || scores === null) return;
    const key = act.id + slotId;
    if (key === prefilled.current) return;
    prefilled.current = key;
    setPoints(Object.fromEntries(myScores.map((s) => [s.criterion_id, s.points])));
    setError(null);
  }, [act, slotId, scores, myScores]);

  const total = criteria.reduce((sum, c) => sum + (points[c.id] ?? 0), 0);
  const maxTotal = criteria.reduce((sum, c) => sum + c.max_points, 0);
  const complete = criteria.every((c) => points[c.id] !== undefined);

  async function submit() {
    if (!act) return;
    setSubmitting(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("judge_submit_scores", {
      p_pin: storedPin("judge"),
      p_performance_id: act.id,
      p_judge_slot_id: slotId,
      p_points: points,
    });

    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await loadScores();
  }

  function chooseSlot(id: string) {
    sessionStorage.setItem(SLOT_KEY, id);
    setSlotId(id);
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 size={24} strokeWidth={2} className="animate-spin text-gold" aria-label="Loading" />
      </main>
    );
  }

  const mySlot = slots.find((s) => s.id === slotId) ?? null;

  // The slot is claimed in sessionStorage only — a session tag, not an account
  // (PRD §4). A slot deactivated by Admin while this tab was open drops out of
  // `slots`, so the picker comes back rather than submitting into a dead slot.
  if (!mySlot) {
    return (
      <SlotPicker
        slots={slots}
        scores={scores ?? []}
        onChoose={chooseSlot}
        subtitle={
          slotId ? "That judge slot is no longer active. Pick another." : "Which judge are you?"
        }
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-heavy text-caption uppercase tracking-[0.2em] text-gold/80">
            Judging
          </p>
          <h1 className="mt-1 font-display text-section leading-tight text-text-on-glass">
            Nourish GOT <span className="text-gold">Talent</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => chooseSlot("")}
          className="flex min-h-11 items-center gap-2 rounded-button border border-glass-border px-4 font-sans text-button font-semibold text-text-on-glass transition-colors hover:border-gold/60"
        >
          <UserRound size={20} strokeWidth={2} />
          Judge {mySlot.slot_number}
        </button>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-button border border-secondary/50 bg-secondary/15 p-3 font-sans text-caption text-text-on-glass"
        >
          <TriangleAlert size={16} strokeWidth={2} className="mt-px shrink-0 text-gold-light" />
          <span>{error}</span>
        </p>
      )}

      <AnimatePresence mode="wait">
        {!act ? (
          <WaitingCard key="waiting" />
        ) : locked ? (
          <SubmittedCard key={"locked-" + act.id} act={act} total={sumOf(myScores)} />
        ) : (
          <Rubric
            key={act.id}
            act={act}
            criteria={criteria}
            points={points}
            total={total}
            maxTotal={maxTotal}
            complete={complete}
            submitting={submitting}
            onSet={(criterionId, value) => setPoints((p) => ({ ...p, [criterionId]: value }))}
            onSubmit={() => void submit()}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function sumOf(scores: Score[]): number {
  return scores.reduce((sum, s) => sum + s.points, 0);
}

/* ------------------------------------------------------------------ */

function SlotPicker({
  slots,
  scores,
  onChoose,
  subtitle,
}: {
  slots: JudgeSlot[];
  scores: Score[];
  onChoose: (id: string) => void;
  subtitle: string;
}) {
  const reduced = useReducedMotion();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm items-center px-4 py-12">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="glass-dense w-full rounded-card p-6"
      >
        <h1 className="font-display text-card-title leading-tight text-text-on-glass">
          Pick your judge slot
        </h1>
        <p className="mt-2 font-sans text-caption text-text-on-glass/60">{subtitle}</p>

        <ul className="mt-6 space-y-2">
          {slots.map((slot) => {
            // Taken slots stay selectable: Admin can unlock, and blocking here
            // would strand a judge whose phone died mid-act.
            const taken = scores.some((s) => s.judge_slot_id === slot.id && s.locked_at !== null);
            return (
              <li key={slot.id}>
                <button
                  type="button"
                  onClick={() => onChoose(slot.id)}
                  className="flex min-h-12 w-full items-center justify-between rounded-button border border-glass-border px-4 font-sans text-body text-text-on-glass transition-colors hover:border-gold/60"
                >
                  <span className="font-semibold">Judge {slot.slot_number}</span>
                  {taken && (
                    <span className="font-sans text-caption text-text-on-glass/50">
                      already scored this act
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {slots.length === 0 && (
          <p className="mt-6 font-sans text-body text-text-on-glass/60">
            No judge slots are active. Ask the admin to add one.
          </p>
        )}

        <p className="mt-6 font-sans text-caption text-text-on-glass/50">
          Nothing is reported per judge. The slot only keeps your scores apart from the other
          judges&apos; so they can be averaged.
        </p>
      </motion.div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

// New act slides in from the right, 200ms (design guide). Reduced motion gets a
// plain fade, no slide.
function actTransition(reduced: boolean | null) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, x: 24 },
    animate: reduced ? { opacity: 1 } : { opacity: 1, x: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: "easeOut" as const },
  };
}

function WaitingCard() {
  const reduced = useReducedMotion();

  return (
    <motion.div {...actTransition(reduced)} className="glass-dense rounded-card p-6 text-center">
      <h2 className="font-display text-card-title text-text-on-glass">Waiting for the next act</h2>
      <p className="mt-2 font-sans text-body text-text-on-glass/60">
        Your screen updates by itself when the admin puts an act on stage.
      </p>
    </motion.div>
  );
}

function SubmittedCard({ act, total }: { act: Performance; total: number }) {
  const reduced = useReducedMotion();

  return (
    <motion.div {...actTransition(reduced)} className="glass-dense rounded-card p-6 text-center">
      <motion.span
        initial={reduced ? { opacity: 0 } : { scale: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1 }}
        transition={reduced ? { duration: 0.15 } : { duration: 0.15, ease: "easeOut" }}
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-gold"
      >
        <Check size={28} strokeWidth={2} className="text-bg-base" />
      </motion.span>

      <h2 className="mt-5 font-display text-card-title text-text-on-glass">Scores submitted</h2>
      <p className="mt-2 font-sans text-body text-text-on-glass/60">
        {actLabel(act)} — you gave {total}.
      </p>
      <p className="mt-4 flex items-center justify-center gap-2 font-sans text-caption text-text-on-glass/50">
        <Lock size={16} strokeWidth={2} />
        Locked. Ask the admin to unlock if a number is wrong.
      </p>
    </motion.div>
  );
}

function Rubric({
  act,
  criteria,
  points,
  total,
  maxTotal,
  complete,
  submitting,
  onSet,
  onSubmit,
}: {
  act: Performance;
  criteria: Criterion[];
  points: Record<string, number>;
  total: number;
  maxTotal: number;
  complete: boolean;
  submitting: boolean;
  onSet: (criterionId: string, value: number) => void;
  onSubmit: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div {...actTransition(reduced)}>
      <section className="glass-dense rounded-card p-4 sm:p-6">
        <p className="font-heavy text-caption uppercase tracking-[0.2em] text-gold/80">On stage</p>
        <h2 className="mt-1 font-display text-card-title leading-tight text-text-on-glass">
          {actLabel(act)}
        </h2>
        <p className="mt-1 font-sans text-caption text-text-on-glass/60">
          {act.reference_code} · {categoryLabel(act)} ·{" "}
          {act.performer_type === "group"
            ? `Group of ${act.performer_count}`
            : act.performer_type === "duo"
              ? "Duo"
              : "Single"}
        </p>
      </section>

      <div className="mt-4 space-y-4">
        {criteria.map((criterion) => (
          <CriterionCard
            key={criterion.id}
            criterion={criterion}
            value={points[criterion.id]}
            onSet={(value) => onSet(criterion.id, value)}
          />
        ))}
      </div>

      {/* Sticky so the total and the submit stay in reach on a phone without
          scrolling back down past five chip grids. */}
      <div className="sticky bottom-0 mt-4 -mx-4 bg-bg-base/80 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-card sm:px-6">
        <p className="text-center font-sans text-caption text-text-on-glass/60">
          Total{" "}
          <span className="font-heavy text-card-title text-gold">
            {total}
          </span>{" "}
          / {maxTotal}
        </p>
        <button
          type="button"
          disabled={submitting || !complete}
          onClick={onSubmit}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-gold font-sans text-button font-semibold text-bg-base transition-colors hover:bg-gold-light disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={20} strokeWidth={2} className="animate-spin" />
              Submitting
            </>
          ) : complete ? (
            "Submit scores"
          ) : (
            "Score every criterion to submit"
          )}
        </button>
      </div>
    </motion.div>
  );
}

function CriterionCard({
  criterion,
  value,
  onSet,
}: {
  criterion: Criterion;
  value: number | undefined;
  onSet: (value: number) => void;
}) {
  // 0..max_points as tap targets rather than a slider or a stepper: exact
  // values under stage lighting, and no drag precision needed on a phone.
  //
  // The card is padded tighter than the others and the grid gap is 4px, because
  // seven 44px targets plus their gaps only fit across a 390px phone if the
  // card gives the row that width back.
  const chips = Array.from({ length: criterion.max_points + 1 }, (_, i) => i);

  return (
    <fieldset className="glass-dense rounded-card p-3 sm:p-6">
      <legend className="sr-only">{criterion.name}</legend>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-card-title leading-tight text-text-on-glass">
          {criterion.name}
        </p>
        <p className="shrink-0 font-sans text-caption text-text-on-glass/60">
          <span className="font-heavy text-card-title text-gold">{value ?? "–"}</span> /{" "}
          {criterion.max_points}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-1.5">
        {chips.map((chip) => {
          const active = value === chip;
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={active}
              aria-label={`${criterion.name}: ${chip}`}
              onClick={() => onSet(chip)}
              className={
                "flex h-11 items-center justify-center rounded-button font-sans text-button font-semibold tabular-nums transition-colors " +
                (active
                  ? "bg-gold text-bg-base"
                  : "border border-glass-border text-text-on-glass hover:border-gold/60")
              }
            >
              {chip}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
