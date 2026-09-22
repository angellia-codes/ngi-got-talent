
export type PerformanceCategory = "dance" | "sing" | "band" | "drama" | "other";
export type PerformerType = "single" | "duo" | "group";
export type PerformanceStatus = "not_started" | "on_stage" | "scored" | "skipped";
export type LeaderboardState = "hidden" | "live" | "final_reveal";

export type Outlet = {
  id: string;
  name: string;
  display_order: number;
};

export type Performance = {
  id: string;
  reference_code: string;
  full_name: string;
  outlet_id: string;
  category: PerformanceCategory;
  category_other: string | null;
  performer_type: PerformerType;
  act_name: string | null;
  performer_count: number | null;
  running_order: number | null;
  status: PerformanceStatus;
  created_at: string;
};

export type Criterion = {
  id: string;
  name: string;
  max_points: number;
  display_order: number;
  is_active: boolean;
};

export type JudgeSlot = {
  id: string;
  slot_number: number;
  is_active: boolean;
};

export type Score = {
  id: string;
  performance_id: string;
  judge_slot_id: string;
  criterion_id: string;
  points: number;
  // null until the judge submits; an admin unlock sets it back to null.
  locked_at: string | null;
  updated_at: string;
};

export type EventSettings = {
  id: number;
  leaderboard_state: LeaderboardState;
  judge_count: number;
  updated_at: string;
};

export const CATEGORY_OPTIONS: { value: PerformanceCategory; label: string }[] = [
  { value: "dance", label: "Dance" },
  { value: "sing", label: "Sing" },
  { value: "band", label: "Band" },
  { value: "drama", label: "Drama" },
  { value: "other", label: "Other" },
];

export const PERFORMER_TYPE_OPTIONS: { value: PerformerType; label: string; hint: string }[] = [
  { value: "single", label: "Single", hint: "One performer" },
  { value: "duo", label: "Duo", hint: "Two performers" },
  { value: "group", label: "Group", hint: "Three or more" },
];

export function nameLabel(performerType: PerformerType | ""): string {
  return performerType === "duo" || performerType === "group"
    ? "Representative / Contact Name"
    : "Performer Name";
}

export type AdminPerformanceRow = Performance & {
  outlet: string;
  judges_scored: number;
  average_total: number | null;
  // { "1": 88, "2": 86 } — judge slot number to that judge's locked total.
  judge_totals: Record<string, number>;
};

// The `leaderboard` view, which returns nothing at all while the state is
// hidden — the visibility gate lives in the SQL, not here.
export type LeaderboardRow = {
  performance_id: string;
  reference_code: string;
  full_name: string;
  act_name: string | null;
  category: PerformanceCategory;
  category_other: string | null;
  performer_type: PerformerType;
  outlet: string;
  judges_scored: number;
  average_total: number | null;
};

export const LEADERBOARD_STATE_OPTIONS: { value: LeaderboardState; label: string }[] = [
  { value: "hidden", label: "Hidden" },
  { value: "live", label: "Live" },
  { value: "final_reveal", label: "Final Reveal" },
];

export const STATUS_LABELS: Record<PerformanceStatus, string> = {
  not_started: "Not started",
  on_stage: "On stage",
  scored: "Scored",
  skipped: "Skipped",
};

export function actLabel(p: Pick<Performance, "act_name" | "full_name">): string {
  return p.act_name ?? p.full_name;
}

export function categoryLabel(p: Pick<Performance, "category" | "category_other">): string {
  if (p.category === "other") return p.category_other ?? "Other";
  return CATEGORY_OPTIONS.find((c) => c.value === p.category)?.label ?? p.category;
}
