import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase.ts";
import { actLabel, categoryLabel, type Performance } from "../lib/types.ts";

type OnStage = Performance & { outlet: { name: string } | null };

// The projector screen: whatever Admin has on stage, big enough to read from
// the back of the room. Read-only and public — an on_stage act is already
// readable under the phase-1 RLS policies, same as the judge screen.
export default function Stage() {
  const [act, setAct] = useState<OnStage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("performances")
      .select("*, outlet:outlets(name)")
      .eq("status", "on_stage")
      .maybeSingle();
    setAct((data ?? null) as OnStage | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("stage")
      .on("postgres_changes", { event: "*", schema: "public", table: "performances" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 size={24} strokeWidth={2} className="animate-spin text-gold" aria-label="Loading" />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden px-4 py-8 sm:px-12 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <p className="font-heavy text-[15px] uppercase tracking-[0.2em] text-text-on-glass sm:text-[20px]">
          Nourish GOT <span className="text-gold">Talent</span>
        </p>
        {act && (
          <span className="flex items-center gap-2 rounded-pill bg-gold px-4 py-1.5 font-heavy text-caption uppercase tracking-[0.2em] text-bg-base sm:text-[15px]">
            <span className="size-2 animate-pulse rounded-pill bg-primary" aria-hidden />
            On stage
          </span>
        )}
      </header>

      <div className="flex flex-1 items-center justify-center py-8">
        <AnimatePresence mode="wait">
          {act ? <Spotlight key={act.id} act={act} /> : <Intermission key="intermission" />}
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

// Design guide's stage advance: the new act slides in from the right, 200ms.
// A plain fade under prefers-reduced-motion.
function useStageMotion() {
  const reduced = useReducedMotion();
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, x: 80 },
    animate: reduced ? { opacity: 1 } : { opacity: 1, x: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, x: -80 },
    transition: { duration: 0.2, ease: "easeOut" as const },
  };
}

function Spotlight({ act }: { act: OnStage }) {
  const stageMotion = useStageMotion();

  const lineup =
    act.performer_type === "group"
      ? `Group of ${act.performer_count}`
      : act.performer_type === "duo"
        ? "Duo"
        : "Solo";

  return (
    <motion.section {...stageMotion} className="w-full max-w-6xl text-center">
      {act.running_order !== null && (
        <p className="font-heavy text-[15px] uppercase tracking-[0.3em] text-gold sm:text-[22px]">
          Act {act.running_order}
        </p>
      )}

      <h1 className="mt-4 font-heavy text-[clamp(44px,9vw,148px)] uppercase leading-[0.95] text-text-on-glass [overflow-wrap:anywhere] [text-shadow:5px_5px_0_var(--color-primary)]">
        {actLabel(act)}
      </h1>

      <ul className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {[act.outlet?.name, categoryLabel(act), lineup].filter(Boolean).map((item) => (
          <li
            key={item}
            className="glass rounded-pill px-5 py-2 font-display text-[20px] uppercase tracking-wide text-text-on-glass sm:px-7 sm:text-[32px]"
          >
            {item}
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function Intermission() {
  const stageMotion = useStageMotion();

  return (
    <motion.section {...stageMotion} className="text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-pill bg-gold sm:size-20">
        <Sparkles size={32} strokeWidth={1.5} className="text-bg-base" aria-hidden />
      </span>
      <h1 className="mt-8 font-heavy text-[clamp(40px,7vw,112px)] uppercase leading-[0.95] text-text-on-glass [text-shadow:5px_5px_0_var(--color-primary)]">
        Up <span className="text-gold">next</span>
      </h1>
      <p className="mt-6 font-display text-[20px] uppercase tracking-[0.2em] text-text-on-glass/70 sm:text-[28px]">
        The next act is getting ready
      </p>
    </motion.section>
  );
}
