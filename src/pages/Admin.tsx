import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  LockOpen,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Scale,
  SkipForward,
  Square,
  TriangleAlert,
} from "lucide-react";
import PinGate, { storedPin } from "../components/PinGate.tsx";
import { Select } from "../components/Select.tsx";
import { supabase } from "../lib/supabase.ts";
import {
  CATEGORY_OPTIONS,
  LEADERBOARD_STATE_OPTIONS,
  PERFORMER_TYPE_OPTIONS,
  STATUS_LABELS,
  actLabel,
  categoryLabel,
  type AdminPerformanceRow,
  type EventSettings,
  type LeaderboardState,
  type PerformanceStatus,
} from "../lib/types.ts";

export default function Admin() {
  return (
    <PinGate role="admin" title="Admin">
      <AdminBoard />
    </PinGate>
  );
}

function AdminBoard() {
  const [rows, setRows] = useState<AdminPerformanceRow[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [outletFilter, setOutletFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [performerFilter, setPerformerFilter] = useState("");

  const load = useCallback(async () => {
    // The roster cannot be read straight from the table: public_read_started_
    // performances hides not_started rows, which before the show is every act.
    const { data, error: rpcError } = await supabase.rpc("admin_list_performances", {
      p_pin: storedPin("admin"),
    });
    if (rpcError) setError(rpcError.message);
    else setRows((data ?? []) as AdminPerformanceRow[]);
    setLoading(false);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from("event_settings").select("*").eq("id", 1).single();
    if (data) setSettings(data as EventSettings);
  }, []);

  useEffect(() => {
    void load();
    void loadSettings();
  }, [load, loadSettings]);

  useEffect(() => {
    // Refetch on any change rather than patching state from the payload: a row
    // here is a join plus aggregates, which a single-table replication payload
    // cannot rebuild. Rejected: polling on a timer.
    const channel = supabase
      .channel("admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "performances" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_settings" }, () => {
        void loadSettings();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, loadSettings]);

  async function call(fn: string, args: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc(fn, { p_pin: storedPin("admin"), ...args });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
  }

  const onStage = rows.find((r) => r.status === "on_stage") ?? null;

  function setStatus(row: AdminPerformanceRow, status: PerformanceStatus) {
    if (
      status === "on_stage" &&
      onStage &&
      onStage.id !== row.id &&
      settings &&
      onStage.judges_scored < settings.judge_count
    ) {
      // admin_set_status closes the live act out as `scored` in the same
      // transaction, so this confirm is the only place to catch it.
      const ok = window.confirm(
        `${actLabel(onStage)} has ${onStage.judges_scored} of ${settings.judge_count} judge scores in. ` +
          `Putting ${actLabel(row)} on stage marks it scored anyway. Continue?`,
      );
      if (!ok) return;
    }
    void call("admin_set_status", { p_performance_id: row.id, p_status: status });
  }

  function move(id: string, direction: -1 | 1) {
    // The whole ordered list goes back, not the moved row — admin_set_running_
    // order takes an array for exactly that reason: two admin tabs cannot
    // interleave a read-modify-write into a shuffle.
    const ordered = rows.map((r) => r.id);
    const from = ordered.indexOf(id);
    const to = from + direction;
    if (to < 0 || to >= ordered.length) return;
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    void call("admin_set_running_order", { p_ids: ordered });
  }

  const outlets = useMemo(
    () => [...new Set(rows.map((r) => r.outlet))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = rows.filter(
    (r) =>
      (!outletFilter || r.outlet === outletFilter) &&
      (!categoryFilter || r.category === categoryFilter) &&
      (!performerFilter || r.performer_type === performerFilter),
  );

  // Reordering inside a filtered view would move an act past rows it cannot
  // see, so the arrows only appear on the full list.
  const filtering = Boolean(outletFilter || categoryFilter || performerFilter);

  const ties = useMemo(() => {
    const byAverage = new Map<string, AdminPerformanceRow[]>();
    for (const r of rows) {
      if (r.average_total === null) continue;
      const key = String(r.average_total);
      byAverage.set(key, [...(byAverage.get(key) ?? []), r]);
    }
    return [...byAverage.values()]
      .filter((group) => group.length > 1)
      .sort((a, b) => Number(b[0].average_total) - Number(a[0].average_total));
  }, [rows]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 size={24} strokeWidth={2} className="animate-spin text-gold" aria-label="Loading" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <p className="font-heavy text-caption uppercase tracking-[0.2em] text-gold/80">
          Stage management
        </p>
        <h1 className="mt-1 font-display text-section leading-tight text-text-on-glass">
          Nourish GOT <span className="text-gold">Talent</span> Admin
        </h1>
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

      {settings && (
        <SettingsPanel
          settings={settings}
          busy={busy}
          onLeaderboardState={(state) =>
            void call("admin_update_settings", { p_leaderboard_state: state })
          }
          onJudgeCount={(count) => void call("admin_update_settings", { p_judge_count: count })}
        />
      )}

      <section className="mt-8">
        <h2 className="font-display text-card-title text-text-on-glass">
          Running order
          <span className="ml-2 font-sans text-caption text-text-on-glass/60">
            {filtered.length} of {rows.length} acts
          </span>
        </h2>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Select
            id="filter-outlet"
            value={outletFilter}
            onChange={setOutletFilter}
            placeholder="All outlets"
            options={[
              { value: "", label: "All outlets" },
              ...outlets.map((o) => ({ value: o, label: o })),
            ]}
          />
          <Select
            id="filter-category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All categories"
            options={[{ value: "", label: "All categories" }, ...CATEGORY_OPTIONS]}
          />
          <Select
            id="filter-performer"
            value={performerFilter}
            onChange={setPerformerFilter}
            placeholder="All performer types"
            options={[
              { value: "", label: "All performer types" },
              ...PERFORMER_TYPE_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
            ]}
          />
        </div>

        {filtering && (
          <p className="mt-2 font-sans text-caption text-text-on-glass/60">
            Clear the filters to reorder acts.
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {filtered.map((row, index) => (
            <ActCard
              key={row.id}
              row={row}
              position={rows.indexOf(row) + 1}
              judgeCount={settings?.judge_count ?? 0}
              busy={busy}
              canMoveUp={!filtering && index > 0}
              canMoveDown={!filtering && index < filtered.length - 1}
              onMove={(direction) => move(row.id, direction)}
              onStatus={(status) => setStatus(row, status)}
              onUnlock={(slotNumber) =>
                void call("admin_unlock_scores", {
                  p_performance_id: row.id,
                  p_slot_number: slotNumber,
                })
              }
            />
          ))}
        </ul>

        {filtered.length === 0 && (
          <p className="mt-6 text-center font-sans text-body text-text-on-glass/60">
            {rows.length === 0 ? "No acts registered yet." : "No acts match those filters."}
          </p>
        )}
      </section>

      {ties.length > 0 && <TieBreakPanel ties={ties} />}
    </main>
  );
}

function SettingsPanel({
  settings,
  busy,
  onLeaderboardState,
  onJudgeCount,
}: {
  settings: EventSettings;
  busy: boolean;
  onLeaderboardState: (state: LeaderboardState) => void;
  onJudgeCount: (count: number) => void;
}) {
  return (
    <section className="glass-dense rounded-card p-4 sm:p-6">
      <h2 className="font-display text-card-title text-text-on-glass">Event</h2>

      <fieldset className="mt-4">
        <legend className="font-sans text-caption text-text-on-glass/60">Leaderboard</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEADERBOARD_STATE_OPTIONS.map((option) => {
            const active = settings.leaderboard_state === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={busy}
                aria-pressed={active}
                onClick={() => onLeaderboardState(option.value)}
                className={
                  "min-h-11 rounded-button px-4 font-sans text-button font-semibold transition-colors disabled:opacity-60 " +
                  (active
                    ? "bg-gold text-bg-base hover:bg-gold-light"
                    : "border border-glass-border text-text-on-glass hover:border-gold/60")
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="font-sans text-caption text-text-on-glass/60">Judges</legend>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || settings.judge_count <= 1}
            onClick={() => onJudgeCount(settings.judge_count - 1)}
            aria-label="One judge fewer"
            className="flex h-11 w-11 items-center justify-center rounded-button border border-glass-border text-text-on-glass transition-colors hover:border-gold/60 disabled:opacity-40"
          >
            <Minus size={20} strokeWidth={2} />
          </button>
          <span className="min-w-8 text-center font-heavy text-card-title text-text-on-glass">
            {settings.judge_count}
          </span>
          <button
            type="button"
            disabled={busy || settings.judge_count >= 10}
            onClick={() => onJudgeCount(settings.judge_count + 1)}
            aria-label="One judge more"
            className="flex h-11 w-11 items-center justify-center rounded-button border border-glass-border text-text-on-glass transition-colors hover:border-gold/60 disabled:opacity-40"
          >
            <Plus size={20} strokeWidth={2} />
          </button>
          <p className="flex-1 font-sans text-caption text-text-on-glass/60">
            Slots deactivate, they are never deleted — lowering this keeps scores already in.
          </p>
        </div>
      </fieldset>
    </section>
  );
}

const STATUS_STYLES: Record<PerformanceStatus, string> = {
  not_started: "border border-glass-border text-text-on-glass/70",
  on_stage: "bg-gold text-bg-base",
  scored: "border border-gold/60 text-gold-light",
  skipped: "border border-secondary/60 text-text-on-glass/60",
};

function ActCard({
  row,
  position,
  judgeCount,
  busy,
  canMoveUp,
  canMoveDown,
  onMove,
  onStatus,
  onUnlock,
}: {
  row: AdminPerformanceRow;
  position: number;
  judgeCount: number;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  onStatus: (status: PerformanceStatus) => void;
  onUnlock: (slotNumber: number) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={
        "glass-dense rounded-card p-4 sm:p-6" + (row.status === "on_stage" ? " border-gold" : "")
      }
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 font-sans text-caption tabular-nums text-text-on-glass/50">
          {position}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-card-title leading-tight text-text-on-glass">
              {actLabel(row)}
            </h3>
            <span
              className={
                "rounded-pill px-3 py-1 font-sans text-caption font-semibold " +
                STATUS_STYLES[row.status]
              }
            >
              {STATUS_LABELS[row.status]}
            </span>
          </div>

          <p className="mt-1 font-sans text-caption text-text-on-glass/60">
            {row.reference_code} · {row.outlet} · {categoryLabel(row)} ·{" "}
            {row.performer_type === "group"
              ? `Group of ${row.performer_count}`
              : row.performer_type === "duo"
                ? "Duo"
                : "Single"}
          </p>
          {row.act_name && (
            <p className="font-sans text-caption text-text-on-glass/60">Contact: {row.full_name}</p>
          )}

          <p className="mt-2 font-sans text-caption text-text-on-glass/70">
            {row.judges_scored} of {judgeCount} judges in
            {row.average_total !== null && (
              <>
                {" · "}
                <span className="text-gold-light">avg {row.average_total}</span>
              </>
            )}
          </p>

          {/* PRD §6.3's override. Unlock clears the lock and leaves the judge's
              numbers in place, so they correct the one they fat-fingered
              rather than re-entering the rubric from memory. */}
          {Object.keys(row.judge_totals).length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {Object.entries(row.judge_totals)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([slot, total]) => (
                  <li key={slot}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onUnlock(Number(slot))}
                      className="flex min-h-11 items-center gap-2 rounded-pill border border-glass-border px-3 font-sans text-caption text-text-on-glass transition-colors hover:border-gold/60 disabled:opacity-60"
                    >
                      Judge {slot}: {total}
                      <LockOpen size={16} strokeWidth={2} className="text-text-on-glass/60" />
                      <span className="sr-only">— unlock to let this judge score again</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {(canMoveUp || canMoveDown) && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={busy || !canMoveUp}
              onClick={() => onMove(-1)}
              aria-label={`Move ${actLabel(row)} earlier`}
              className="flex h-11 w-11 items-center justify-center rounded-button border border-glass-border text-text-on-glass transition-colors hover:border-gold/60 disabled:opacity-30"
            >
              <ChevronUp size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              disabled={busy || !canMoveDown}
              onClick={() => onMove(1)}
              aria-label={`Move ${actLabel(row)} later`}
              className="flex h-11 w-11 items-center justify-center rounded-button border border-glass-border text-text-on-glass transition-colors hover:border-gold/60 disabled:opacity-30"
            >
              <ChevronDown size={20} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {row.status === "on_stage" ? (
          <StatusButton busy={busy} primary onClick={() => onStatus("scored")}>
            <Square size={20} strokeWidth={2} />
            Mark scored
          </StatusButton>
        ) : (
          <StatusButton busy={busy} primary onClick={() => onStatus("on_stage")}>
            <Play size={20} strokeWidth={2} />
            On stage
          </StatusButton>
        )}
        {row.status !== "skipped" && (
          <StatusButton busy={busy} onClick={() => onStatus("skipped")}>
            <SkipForward size={20} strokeWidth={2} />
            Skip
          </StatusButton>
        )}
        {row.status !== "not_started" && (
          <StatusButton busy={busy} onClick={() => onStatus("not_started")}>
            <RotateCcw size={20} strokeWidth={2} />
            Reset
          </StatusButton>
        )}
      </div>
    </motion.li>
  );
}

function StatusButton({
  busy,
  primary = false,
  onClick,
  children,
}: {
  busy: boolean;
  primary?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={
        "flex min-h-11 items-center gap-2 rounded-button px-4 font-sans text-button font-semibold transition-colors disabled:opacity-60 " +
        (primary
          ? "bg-gold text-bg-base hover:bg-gold-light"
          : "border border-glass-border text-text-on-glass hover:border-gold/60")
      }
    >
      {children}
    </button>
  );
}

// Review only, by design: PRD §4 makes the tie-break "manual Admin review", so
// there is no override RPC to call. This surfaces the per-judge totals behind
// each tied average so Admin can settle it off-screen.
function TieBreakPanel({ ties }: { ties: AdminPerformanceRow[][] }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-card-title text-text-on-glass">
        <Scale size={20} strokeWidth={2} className="text-gold" />
        Ties to resolve
      </h2>
      <p className="mt-1 font-sans text-caption text-text-on-glass/60">
        These acts share an average. Nothing here changes the standings — it is the breakdown to
        decide on.
      </p>

      <ul className="mt-4 space-y-3">
        {ties.map((group) => (
          <li key={group[0].id} className="glass-dense rounded-card p-4 sm:p-6">
            <p className="font-heavy text-card-title text-gold">avg {group[0].average_total}</p>
            <ul className="mt-2 space-y-2">
              {group.map((row) => (
                <li key={row.id} className="font-sans text-body text-text-on-glass">
                  {actLabel(row)}
                  <span className="ml-2 font-sans text-caption text-text-on-glass/60">
                    {Object.entries(row.judge_totals)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([slot, total]) => `Judge ${slot}: ${total}`)
                      .join(" · ") || "no locked scores"}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
