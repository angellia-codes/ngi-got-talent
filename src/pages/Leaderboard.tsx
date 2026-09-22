import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EyeOff, Loader2, Trophy } from "lucide-react";
import { supabase } from "../lib/supabase.ts";
import {
  actLabel,
  categoryLabel,
  type EventSettings,
  type LeaderboardRow,
} from "../lib/types.ts";

type Ranked = LeaderboardRow & { rank: number };

export default function Leaderboard() {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // The view returns nothing at all while the state is hidden — the gate is
    // in the SQL, not here, so anon cannot read the standings off the REST API
    // while Admin believes they are hidden.
    //
    // Ordered client-side as well: PostgREST does not promise a view's own
    // ORDER BY survives the query it wraps around it.
    const [board, event] = await Promise.all([
      supabase
        .from("leaderboard")
        .select("*")
        .order("average_total", { ascending: false, nullsFirst: false })
        .order("reference_code"),
      supabase.from("event_settings").select("*").eq("id", 1).single(),
    ]);

    setRows((board.data ?? []) as LeaderboardRow[]);
    if (event.data) setSettings(event.data as EventSettings);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "performances" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_settings" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  // Competition ranking: tied acts share a position and the next one skips
  // (1, 2, 2, 4). PRD §4 leaves the tie itself for Admin to resolve manually,
  // so nothing here invents a winner between two equal averages.
  const ranked = useMemo<Ranked[]>(() => {
    const scored = rows.filter((r) => r.average_total !== null);
    // The list is already sorted, so the first row holding an average is that
    // average's rank.
    return scored.map((row) => ({
      ...row,
      rank: scored.findIndex((r) => r.average_total === row.average_total) + 1,
    }));
  }, [rows]);

  const unscored = rows.length - ranked.length;

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 size={24} strokeWidth={2} className="animate-spin text-gold" aria-label="Loading" />
      </main>
    );
  }

  // Branching on the state rather than on "no rows came back": an empty board
  // during Live means nothing has been scored yet, which is not the same
  // screen as Hidden.
  if (!settings || settings.leaderboard_state === "hidden") {
    return <Holding />;
  }

  const reveal = settings.leaderboard_state === "final_reveal";
  const podium = reveal ? ranked.filter((r) => r.rank <= 3) : [];
  const rest = reveal ? ranked.filter((r) => r.rank > 3) : ranked;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <p className="font-heavy text-caption uppercase tracking-[0.2em] text-gold/80">
          Nourish Group Indonesia
        </p>
        <h1 className="mt-2 font-display text-hero leading-tight text-text-on-glass sm:text-[64px]">
          Nourish GOT <span className="text-gold">Talent</span>
        </h1>
        <p className="mt-3 font-sans text-body text-text-on-glass/70">
          {reveal ? "And the winners are" : "Live standings"}
        </p>
      </header>

      {podium.length > 0 && <Podium podium={podium} />}

      {rest.length > 0 && (
        <ul className={"space-y-3" + (podium.length > 0 ? " mt-10" : "")}>
          {rest.map((row) => (
            <Row key={row.performance_id} row={row} />
          ))}
        </ul>
      )}

      {ranked.length === 0 && (
        <p className="text-center font-sans text-body text-text-on-glass/60">
          No act has been scored yet.
        </p>
      )}

      {unscored > 0 && (
        <p className="mt-8 text-center font-sans text-caption text-text-on-glass/50">
          Not scored yet: {unscored} {unscored === 1 ? "act" : "acts"}
        </p>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Holding() {
  const reduced = useReducedMotion();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4 py-12">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="glass w-full rounded-card p-8 text-center"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-gold">
          <EyeOff size={28} strokeWidth={2} className="text-bg-base" />
        </span>
        <h1 className="mt-6 font-display text-section leading-tight text-text-on-glass">
          Nourish GOT <span className="text-gold">Talent</span>
        </h1>
        <p className="mt-3 font-sans text-body text-text-on-glass/70">
          The standings are hidden. This screen fills in by itself the moment they go live.
        </p>
      </motion.div>
    </main>
  );
}

const PODIUM_LABELS: Record<number, string> = {
  1: "Winner",
  2: "1st Runner-up",
  3: "2nd Runner-up",
};

// Staggered curtain reveal, 2nd Runner-up → 1st Runner-up → Winner at 300ms
// (design guide). The cards sit in rank order on screen; only the delays run
// backwards.
function Podium({ podium }: { podium: Ranked[] }) {
  const reduced = useReducedMotion();
  const last = podium[podium.length - 1].rank;

  return (
    <ul className="space-y-4">
      {podium.map((row) => (
        <motion.li
          key={row.performance_id}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: (last - row.rank) * 0.3 }}
          className={
            "glass rounded-card p-6 sm:p-8" + (row.rank === 1 ? " border-gold" : "")
          }
        >
          <div className="flex items-center gap-4">
            {row.rank === 1 && (
              <motion.span
                animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: last * 0.3 }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-gold"
              >
                <Trophy size={24} strokeWidth={2} className="text-bg-base" />
              </motion.span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heavy text-caption uppercase tracking-[0.2em] text-gold/80">
                {PODIUM_LABELS[row.rank]}
              </p>
              <p
                className={
                  "mt-1 font-display leading-tight " +
                  (row.rank === 1 ? "text-winner text-gold" : "text-section text-text-on-glass")
                }
              >
                {actLabel(row)}
              </p>
              <p className="mt-1 font-sans text-body text-text-on-glass/70">
                {row.outlet} · {categoryLabel(row)}
              </p>
            </div>
            <p className="shrink-0 font-heavy text-section tabular-nums text-text-on-glass">
              {row.average_total}
            </p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

function Row({ row }: { row: Ranked }) {
  const reduced = useReducedMotion();

  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="glass flex items-center gap-4 rounded-card p-4 sm:p-6"
    >
      <span className="w-10 shrink-0 font-heavy text-section tabular-nums text-gold">
        {row.rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-card-title leading-tight text-text-on-glass">
          {actLabel(row)}
        </p>
        <p className="mt-0.5 font-sans text-caption text-text-on-glass/60">
          {row.outlet} · {categoryLabel(row)} · {row.judges_scored}{" "}
          {row.judges_scored === 1 ? "judge" : "judges"}
        </p>
      </div>
      <p className="shrink-0 font-heavy text-card-title tabular-nums text-text-on-glass">
        {row.average_total}
      </p>
    </motion.li>
  );
}
