import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./kit";
import { C, F, R, glass, glassDense, goldA, screenBg, textA } from "./tokens";

// Mock screens: the app's own pages (src/pages/*) rebuilt as dumb, prop-driven
// components with example data, so the reel can drive every state per frame.
// Markup and styles mirror the real pages; nothing here talks to Supabase.

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */

const eyebrow: CSSProperties = {
  fontFamily: F.heavy,
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  color: goldA(0.8),
};

const labelStyle: CSSProperties = {
  fontFamily: F.inter,
  fontSize: 13,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: textA(0.75),
  marginBottom: 8,
  height: 18,
  position: "relative",
};

const inputStyle: CSSProperties = {
  height: 48,
  boxSizing: "border-box",
  borderRadius: R.button,
  border: "1px solid rgb(255 255 255 / 0.15)",
  background: "rgb(255 255 255 / 0.08)",
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
  fontFamily: F.inter,
  fontSize: 16,
  color: C.text,
  overflow: "hidden",
};

function goldButton(height = 48): CSSProperties {
  return {
    height,
    borderRadius: R.button,
    background: C.gold,
    color: C.base,
    fontFamily: F.inter,
    fontSize: 15,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };
}

function Brand({ size }: { size: number }) {
  return (
    <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: size, lineHeight: 1.15, color: C.text }}>
      Nourish GOT <span style={{ color: C.gold }}>Talent</span>
    </span>
  );
}

function Screen({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: screenBg, color: C.text, fontFamily: F.inter, ...style }}>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={labelStyle}>{label}</div>
      {children}
      {hint && <div style={{ marginTop: 6, height: 18, fontSize: 13, color: textA(0.5) }}>{hint}</div>}
    </div>
  );
}

function Select({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...inputStyle, justifyContent: "space-between" }}>
      <div style={{ flex: 1, height: 48, overflow: "hidden", position: "relative" }}>{children}</div>
      <Icon name="chevron" size={18} style={{ color: textA(0.6) }} />
    </div>
  );
}

/** Two labels stacked; `p` crossfades a → b. */
function Swap({ a, b, p }: { a: string; b: string; p: number }) {
  return (
    <>
      <span style={{ position: "absolute", left: 0, opacity: 1 - p, transform: `translateY(${-8 * p}px)` }}>{a}</span>
      <span style={{ position: "absolute", left: 0, opacity: p, transform: `translateY(${8 * (1 - p)}px)` }}>{b}</span>
    </>
  );
}

function Row48({ children }: { children: ReactNode }) {
  return <div style={{ height: 48, display: "flex", alignItems: "center" }}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Register (src/pages/Register.tsx)                                    */

/** Height of the Group / Act Name field when fully dropped in. */
export const ACT_FIELD_H = 116;

export function RegisterForm({ flip, duo, typed, press, scroll }: {
  flip: number; // performer dropdown Single → Duo, label swap
  duo: number; // act name field drops in
  typed: number; // act name typed out
  press: number; // button squash
  scroll: number;
}) {
  const act = "Salt & Sambal";
  const shown = act.slice(0, Math.round(typed * act.length));
  return (
    <Screen>
      <div style={{ padding: "52px 16px 32px", transform: `translateY(${-scroll}px)` }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={eyebrow}>Nourish Group Indonesia</div>
          <div style={{ marginTop: 8 }}>
            <Brand size={40} />
          </div>
          <div style={{ marginTop: 10, fontSize: 16, color: textA(0.7) }}>Register your act. It takes about a minute.</div>
        </div>

        <div style={{ ...glass, borderRadius: R.card, padding: 16 }}>
          <Field label={<Swap a="Performer Name" b="Representative / Contact Name" p={flip} />}>
            <div style={inputStyle}>Putu Wirawan</div>
          </Field>
          <Field label="Outlet">
            <Select>
              <Row48>Nourish Uluwatu</Row48>
            </Select>
          </Field>
          <Field label="Performance Category">
            <Select>
              <Row48>Drama</Row48>
            </Select>
          </Field>
          <Field label="Category Performer">
            <Select>
              <div style={{ transform: `translateY(${-48 * flip}px)` }}>
                <Row48>Single — One performer</Row48>
                <Row48>Duo — Two performers</Row48>
              </div>
            </Select>
          </Field>

          <div style={{ height: ACT_FIELD_H * duo, overflow: "hidden", opacity: Math.min(1, duo * 1.4) }}>
            <Field label="Group / Act Name" hint="This is the name shown on the leaderboard.">
              <div
                style={{
                  ...inputStyle,
                  borderColor: C.gold,
                  boxShadow: `0 0 0 3px ${goldA(0.3)}`,
                }}
              >
                {shown}
                {typed > 0 && typed < 1 && <span style={{ width: 2, height: 20, marginLeft: 1, background: C.gold }} />}
              </div>
            </Field>
          </div>

          <div style={{ marginTop: 8, paddingTop: 20, borderTop: "1px solid rgb(255 255 255 / 0.15)" }}>
            <div style={labelStyle}>Rules &amp; Regulations</div>
            <div
              style={{
                borderRadius: R.button,
                border: "1px solid rgb(255 255 255 / 0.15)",
                background: "rgb(255 255 255 / 0.08)",
                padding: "12px 14px",
                fontSize: 13,
                lineHeight: 1.5,
                color: textA(0.85),
              }}
            >
              1. Each performance must not exceed 5 minutes, including the introduction and closing.
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "flex-start" }}>
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: C.gold,
                  color: C.base,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Icon name="check" size={14} stroke={3} />
              </span>
              <span style={{ fontSize: 15, lineHeight: 1.4 }}>I have read and agree to the Rules &amp; Regulations.</span>
            </div>
          </div>

          <div style={{ ...goldButton(48), marginTop: 22, transform: `scale(${1 - 0.07 * press})` }}>Register my act</div>
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: textA(0.5) }}>
            No account needed. You get a reference code next.
          </div>
        </div>
      </div>
    </Screen>
  );
}

export function RegisterDone({ check, stamp }: { check: number; stamp: number }) {
  return (
    <Screen style={{ display: "flex", alignItems: "center", padding: "0 16px" }}>
      <div style={{ ...glass, borderRadius: R.card, padding: 24, textAlign: "center", width: "100%", boxSizing: "border-box" }}>
        <span
          style={{
            margin: "0 auto",
            width: 56,
            height: 56,
            borderRadius: R.pill,
            background: C.gold,
            color: C.base,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${check})`,
          }}
        >
          <Icon name="check" size={28} />
        </span>
        <div style={{ marginTop: 22, fontFamily: F.display, fontWeight: 600, fontSize: 32 }}>You are registered</div>
        <div style={{ marginTop: 8, fontSize: 16, color: textA(0.7) }}>Salt &amp; Sambal is on the list for Nourish GOT Talent.</div>
        <div
          style={{
            marginTop: 28,
            borderRadius: R.button,
            border: "1px solid rgb(255 255 255 / 0.15)",
            background: "rgb(255 255 255 / 0.08)",
            padding: "20px 16px",
          }}
        >
          <div style={{ ...eyebrow, color: textA(0.6) }}>Your reference</div>
          <div
            style={{
              marginTop: 10,
              fontFamily: F.heavy,
              fontSize: 48,
              lineHeight: 1,
              letterSpacing: "0.03em",
              color: C.gold,
              opacity: stamp,
              transform: `scale(${1.3 - 0.3 * stamp})`,
            }}
          >
            GOT-004
          </div>
        </div>
        <div style={{ marginTop: 22, fontSize: 13, color: textA(0.6) }}>
          Screenshot this screen. Quote your reference if you need to change anything.
        </div>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Admin, desktop (src/pages/Admin.tsx). Canvas 1440×810.               */

const ORDER = [
  { name: "Kitchen Beats", outlet: "Nourish Ungasan", cat: "Band", status: "Scored" },
  { name: "Ayu Lestari", outlet: "The Bakery", cat: "Sing", status: "Scored" },
  { name: "The Movers", outlet: "Nourish Berawa", cat: "Dance", status: "On stage" },
  { name: "Berawa Voices", outlet: "Nourish Berawa", cat: "Sing", status: "Not started" },
  { name: "BOH Crew", outlet: "BOH", cat: "Dance", status: "Not started" },
  { name: "Salt & Sambal", outlet: "Nourish Uluwatu", cat: "Drama", status: "Not started" },
  { name: "Wholefood Trio", outlet: "Wholefood", cat: "Band", status: "Not started" },
];
const SS = 5; // Salt & Sambal's index, dragged up to slot 4 (index 3)
const ROW_H = 78;

/** Centre of the "Advance to next act" button on the admin canvas. */
export const ADVANCE_BTN = { x: 1166, y: 346, w: 436, h: 52 };

function StatusPill({ status }: { status: string }) {
  const onStage = status === "On stage";
  return (
    <span
      style={{
        padding: "5px 12px",
        borderRadius: R.pill,
        fontSize: 13,
        fontWeight: 600,
        background: onStage ? C.gold : "rgb(255 255 255 / 0.08)",
        color: onStage ? C.base : textA(status === "Scored" ? 0.85 : 0.55),
        border: onStage ? "none" : "1px solid rgb(255 255 255 / 0.15)",
      }}
    >
      {status}
    </span>
  );
}

export function AdminDesktop({ lift, move, press, advanced }: {
  lift: number; // Salt & Sambal row lifted off the list
  move: number; // its trip from slot 6 to slot 4
  press: number; // advance button squash
  advanced: number; // on-stage card swaps to Salt & Sambal
}) {
  return (
    <Screen style={{ width: 1440, height: 810, inset: undefined }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          borderBottom: "1px solid rgb(255 255 255 / 0.12)",
        }}
      >
        <Brand size={26} />
        <div style={{ display: "flex", gap: 32, fontSize: 15, fontWeight: 600 }}>
          {["Registrations", "Stage control", "Judging", "Leaderboard"].map((t) => (
            <span
              key={t}
              style={{
                color: t === "Stage control" ? C.text : textA(0.55),
                paddingBottom: 6,
                borderBottom: t === "Stage control" ? `2px solid ${C.gold}` : "2px solid transparent",
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <span style={{ ...eyebrow, color: textA(0.6) }}>Admin</span>
      </div>

      {/* Running order */}
      <div style={{ ...glassDense, position: "absolute", left: 32, top: 96, width: 868, height: 682, borderRadius: R.card }}>
        <div style={{ padding: "22px 24px 0" }}>
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 28 }}>Running order</div>
          <div style={{ marginTop: 4, fontSize: 14, color: textA(0.6) }}>Drag to reorder. Judges see whoever is On stage.</div>
        </div>
        {ORDER.map((r, i) => {
          const isSS = i === SS;
          const pos = isSS ? SS - 2 * move : i === 3 || i === 4 ? i + move : i;
          const status =
            advanced > 0.5 && isSS ? "On stage" : advanced > 0.5 && r.status === "On stage" ? "Scored" : r.status;
          return (
            <div
              key={r.name}
              style={{
                position: "absolute",
                left: 20,
                right: 20,
                top: 112 + pos * ROW_H,
                height: ROW_H - 12,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "0 18px",
                borderRadius: 14,
                // Lifted row goes opaque so it reads above the rows it passes over.
                background: isSS ? `rgb(${66 + 14 * lift} 24 19)` : "rgb(255 255 255 / 0.06)",
                border: `1px solid ${isSS && lift > 0.05 ? goldA(0.4 + 0.6 * lift) : "rgb(255 255 255 / 0.12)"}`,
                boxShadow: isSS ? `0 ${24 * lift}px ${60 * lift}px rgb(0 0 0 / ${0.55 * lift})` : "none",
                transform: isSS ? `translateX(${14 * lift}px) scale(${1 + 0.035 * lift})` : "none",
                zIndex: isSS ? 2 : 1,
              }}
            >
              <Icon name="grip" size={20} style={{ color: textA(0.45) }} />
              <span style={{ width: 34, fontFamily: F.heavy, fontSize: 22, color: C.gold }}>{Math.round(pos) + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 22 }}>{r.name}</div>
                <div style={{ fontSize: 13, color: textA(0.6) }}>
                  {r.outlet} · {r.cat}
                </div>
              </div>
              <StatusPill status={status} />
            </div>
          );
        })}
      </div>

      {/* On stage */}
      <div style={{ ...glassDense, position: "absolute", left: 924, top: 96, width: 484, height: 300, borderRadius: R.card, overflow: "hidden" }}>
        <div style={{ padding: 24 }}>
          <div style={eyebrow}>On stage</div>
          <div style={{ position: "relative", height: 44, marginTop: 6, overflow: "hidden" }}>
            {[
              { name: "The Movers", p: 1 - advanced, dir: -1 },
              { name: "Salt & Sambal", p: advanced, dir: 1 },
            ].map(({ name, p, dir }) => (
              <div
                key={name}
                style={{
                  position: "absolute",
                  fontFamily: F.display,
                  fontWeight: 600,
                  fontSize: 34,
                  transform: `translateY(${(1 - p) * 46 * dir}px)`,
                }}
              >
                {name}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 4, fontSize: 14, color: textA(0.6) }}>
            {advanced > 0.5 ? "Nourish Uluwatu · Drama · Duo" : "Nourish Berawa · Dance · Group of 5"}
          </div>
          <div style={{ marginTop: 18, fontSize: 14, color: textA(0.75) }}>
            Up next · <b style={{ color: C.text }}>{advanced > 0.5 ? "BOH Crew" : "Salt & Sambal"}</b>
          </div>
        </div>
        <div
          style={{
            ...goldButton(ADVANCE_BTN.h),
            position: "absolute",
            left: 24,
            right: 24,
            bottom: 24,
            transform: `scale(${1 - 0.06 * press})`,
          }}
        >
          <Icon name="play" size={18} />
          Advance to next act
        </div>
      </div>

      {/* Judges */}
      <div style={{ ...glassDense, position: "absolute", left: 924, top: 412, width: 484, height: 150, borderRadius: R.card, boxSizing: "border-box", padding: 24 }}>
        <div style={{ ...labelStyle, height: "auto" }}>Judges submitted</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 6 }}>
          <span style={{ fontFamily: F.heavy, fontSize: 44 }}>
            3 <span style={{ color: textA(0.5) }}>/ 3</span>
          </span>
          <Dots lit={[1, 1, 1]} size={18} />
        </div>
      </div>

      {/* Leaderboard state */}
      <div style={{ ...glassDense, position: "absolute", left: 924, top: 578, width: 484, height: 200, borderRadius: R.card, boxSizing: "border-box", padding: 24 }}>
        <div style={{ ...labelStyle, height: "auto" }}>Leaderboard</div>
        <div style={{ display: "flex", marginTop: 12, borderRadius: R.button, border: "1px solid rgb(255 255 255 / 0.15)", overflow: "hidden" }}>
          {["Hidden", "Live", "Final Reveal"].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 600,
                background: s === "Hidden" ? C.gold : "transparent",
                color: s === "Hidden" ? C.base : textA(0.7),
              }}
            >
              {s}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 13, color: textA(0.5) }}>Standings stay hidden until you flip Live.</div>
      </div>
    </Screen>
  );
}

function Dots({ lit, size }: { lit: number[]; size: number }) {
  return (
    <div style={{ display: "flex", gap: size * 0.6 }}>
      {lit.map((l, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: R.pill,
            border: `2px solid ${l > 0 ? C.gold : "rgb(255 255 255 / 0.3)"}`,
            background: l > 0 ? C.gold : "transparent",
            boxShadow: l > 0 ? `0 0 ${size}px ${goldA(0.6 * l)}` : "none",
            transform: `scale(${l > 0 ? 0.6 + 0.4 * l : 1})`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Projector (src/pages/Stage.tsx). Native 1920×1080.                   */

const REVEAL = (t: number, from: number, len: number) => {
  const x = Math.min(1, Math.max(0, (t - from) / len));
  // EASE_REVEAL from Stage.tsx, approximated as a strong ease-out.
  return 1 - Math.pow(1 - x, 4);
};

export function Projector({ t, pulse }: { t: number; pulse: number }) {
  const glow = REVEAL(t, 0, 30);
  const eyebrowP = REVEAL(t, 4, 18);
  const words = ["SALT", "&", "SAMBAL"];
  const pills = ["Nourish Uluwatu", "Drama", "Duo"];
  return (
    <Screen style={{ width: 1920, height: 1080, inset: undefined }}>
      <div style={{ position: "absolute", left: 96, right: 96, top: 92, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: F.heavy, fontSize: 22, letterSpacing: "0.2em" }}>
          NOURISH GOT <span style={{ color: C.gold }}>TALENT</span>
        </span>
        <span style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: R.pill,
              border: `3px solid ${C.gold}`,
              opacity: pulse > 0 ? 1 - pulse : 0,
              transform: `scale(${1 + pulse * 0.6})`,
            }}
          />
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 20px",
              borderRadius: R.pill,
              background: C.gold,
              color: C.base,
              fontFamily: F.heavy,
              fontSize: 16,
              letterSpacing: "0.2em",
              transform: `scale(${1 + 0.14 * Math.sin(Math.PI * Math.min(1, pulse * 2))})`,
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: R.pill, background: C.primary }} />
            ON STAGE
          </span>
        </span>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center" }}>
        <div
          style={{
            position: "absolute",
            width: 1000,
            height: 1000,
            borderRadius: R.pill,
            background: `radial-gradient(closest-side, ${goldA(0.22)}, transparent)`,
            opacity: glow,
            transform: `scale(${0.5 + 0.5 * glow + 0.04 * Math.sin(t / 24)})`,
          }}
        />
        <div
          style={{
            fontFamily: F.heavy,
            fontSize: 26,
            color: C.gold,
            letterSpacing: `${0.6 - 0.3 * eyebrowP}em`,
            opacity: eyebrowP,
            transform: `translateY(${(1 - eyebrowP) * 16}px)`,
          }}
        >
          ACT 4
        </div>
        <div style={{ marginTop: 20, fontFamily: F.heavy, fontSize: 168, lineHeight: 0.95, textShadow: `6px 6px 0 ${C.primary}` }}>
          {words.map((w, i) => {
            const p = REVEAL(t, 8 + i * 3, 21);
            return (
              <span
                key={w}
                style={{
                  display: "inline-block",
                  margin: "0 0.12em",
                  opacity: p,
                  filter: `blur(${(1 - p) * 12}px)`,
                  transform: `translateY(${(1 - p) * 48}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: 52, display: "flex", gap: 20 }}>
          {pills.map((p, i) => {
            const s = REVEAL(t, 22 + i * 3, 12);
            return (
              <span
                key={p}
                style={{
                  ...glass,
                  borderRadius: R.pill,
                  padding: "10px 32px",
                  fontFamily: F.display,
                  fontWeight: 600,
                  fontSize: 34,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  opacity: s,
                  transform: `translateY(${(1 - s) * 20}px) scale(${0.9 + 0.1 * s})`,
                }}
              >
                {p}
              </span>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Judge (src/pages/Judge.tsx)                                          */

export function JudgeSlot({ pick }: { pick: number }) {
  return (
    <Screen style={{ display: "flex", alignItems: "center", padding: "0 20px" }}>
      <div style={{ ...glassDense, borderRadius: R.card, padding: 24, width: "100%", boxSizing: "border-box" }}>
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 24 }}>Pick your judge slot</div>
        <div style={{ marginTop: 6, fontSize: 13, color: textA(0.6) }}>Which judge are you?</div>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((n) => {
            const on = n === 2 ? pick : 0;
            return (
              <div
                key={n}
                style={{
                  height: 52,
                  borderRadius: R.button,
                  border: `1px solid ${on > 0.02 ? C.gold : "rgb(255 255 255 / 0.15)"}`,
                  boxShadow: on > 0.02 ? `0 0 0 ${3 * on}px ${goldA(0.3)}` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 16px",
                  fontSize: 16,
                  fontWeight: 600,
                  transform: `scale(${1 + 0.05 * Math.sin(Math.PI * Math.min(1, on))})`,
                }}
              >
                Judge {n}
                {on > 0.02 && <Icon name="check" size={20} style={{ color: C.gold, opacity: on }} />}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 22, fontSize: 13, color: textA(0.5), lineHeight: 1.5 }}>
          Nothing is reported per judge. The slot only keeps your scores apart so they can be averaged.
        </div>
      </div>
    </Screen>
  );
}

export const CRITERIA = ["Technical Skill", "Creativity / Originality", "Stage Presence", "Audience Engagement", "Overall Impression"];
export const MY_SCORES = [19, 18, 19, 18, 19]; // 93
/** Content y where criterion card i starts, and each card's stride. */
export const CRIT_TOP = 236;
export const CRIT_STRIDE = 216;

export function JudgeScore({ ticks, punch, press, scroll }: {
  ticks: number[]; // per criterion, spring progress of its chip tap
  punch: number; // total lands
  press: number; // submit squash
  scroll: number;
}) {
  return (
    <Screen>
      <div style={{ padding: "52px 16px 160px", transform: `translateY(${-scroll}px)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={eyebrow}>Judging</div>
            <div style={{ marginTop: 4 }}>
              <Brand size={30} />
            </div>
          </div>
          <div
            style={{
              height: 44,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 14px",
              borderRadius: R.button,
              border: "1px solid rgb(255 255 255 / 0.15)",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            <Icon name="user" size={18} />
            Judge 2
          </div>
        </div>

        <div style={{ ...glassDense, borderRadius: R.card, padding: 16, marginTop: 20 }}>
          <div style={eyebrow}>On stage</div>
          <div style={{ marginTop: 4, fontFamily: F.display, fontWeight: 600, fontSize: 22 }}>Salt &amp; Sambal</div>
          <div style={{ marginTop: 2, fontSize: 13, color: textA(0.6) }}>GOT-004 · Drama · Duo</div>
        </div>

        <div style={{ position: "relative", height: CRIT_STRIDE * 5, marginTop: 16 }}>
          {CRITERIA.map((name, i) => {
            const p = ticks[i];
            const value = MY_SCORES[i];
            return (
              <div
                key={name}
                style={{
                  ...glassDense,
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: i * CRIT_STRIDE,
                  height: CRIT_STRIDE - 16,
                  boxSizing: "border-box",
                  borderRadius: R.card,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 20 }}>{name}</span>
                  <span style={{ fontSize: 13, color: textA(0.6) }}>
                    <span style={{ fontFamily: F.heavy, fontSize: 22, color: C.gold }}>{p > 0 ? value : "–"}</span> / 20
                  </span>
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                  {Array.from({ length: 21 }, (_, n) => {
                    const on = n === value && p > 0;
                    return (
                      <div
                        key={n}
                        style={{
                          height: 40,
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          fontWeight: 600,
                          background: on ? C.gold : "rgb(255 255 255 / 0.06)",
                          color: on ? C.base : textA(0.75),
                          border: on ? "none" : "1px solid rgb(255 255 255 / 0.12)",
                          transform: on ? `scale(${1 + 0.3 * Math.sin(Math.PI * Math.min(1, p))})` : "none",
                          zIndex: on ? 1 : 0,
                        }}
                      >
                        {n}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky footer, as in the app: total and submit stay in reach. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "14px 16px 26px",
          background: "rgb(33 1 0 / 0.85)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgb(255 255 255 / 0.1)",
        }}
      >
        <div style={{ textAlign: "center", fontSize: 13, color: textA(0.6), height: 30, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          Total
          <span
            style={{
              display: "inline-block",
              fontFamily: F.heavy,
              fontSize: 26,
              color: C.gold,
              opacity: punch > 0 ? 1 : 0.5,
              transform: `scale(${punch > 0 ? 1.8 - 0.8 * punch : 1})`,
            }}
          >
            {punch > 0 ? 93 : "–"}
          </span>
          / 100
        </div>
        <div style={{ ...goldButton(48), marginTop: 10, transform: `scale(${1 - 0.07 * press})` }}>Submit scores</div>
      </div>
    </Screen>
  );
}

export function JudgeLocked({ pop }: { pop: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 16px" }}>
      <div
        style={{
          ...glassDense,
          background: "rgb(60 8 4 / 0.92)",
          borderRadius: R.card,
          padding: 24,
          width: "100%",
          boxSizing: "border-box",
          textAlign: "center",
          opacity: Math.min(1, pop * 2),
          transform: `translateX(${(1 - pop) * 24}px)`,
          boxShadow: "0 30px 80px rgb(0 0 0 / 0.5)",
        }}
      >
        <span
          style={{
            margin: "0 auto",
            width: 56,
            height: 56,
            borderRadius: R.pill,
            background: C.gold,
            color: C.base,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${pop})`,
          }}
        >
          <Icon name="check" size={28} />
        </span>
        <div style={{ marginTop: 18, fontFamily: F.display, fontWeight: 600, fontSize: 24 }}>Scores submitted</div>
        <div style={{ marginTop: 6, fontSize: 16, color: textA(0.6) }}>Salt &amp; Sambal — you gave 93.</div>
        <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center", alignItems: "center", fontSize: 13, color: textA(0.5) }}>
          <Icon name="lock" size={16} />
          Locked. Ask the admin to unlock if a number is wrong.
        </div>
      </div>
    </div>
  );
}

/** Admin on a phone, cropped in on the judges-submitted counter. */
export function AdminJudges({ lit }: { lit: number[] }) {
  const count = lit.filter((l) => l > 0).length;
  const totals = [91, 93, 92];
  return (
    <Screen style={{ padding: "52px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand size={24} />
        <span style={{ ...eyebrow, color: textA(0.6) }}>Admin</span>
      </div>
      <div style={{ ...glassDense, borderRadius: R.card, padding: 20, marginTop: 24 }}>
        <div style={eyebrow}>On stage</div>
        <div style={{ marginTop: 4, fontFamily: F.display, fontWeight: 600, fontSize: 28 }}>Salt &amp; Sambal</div>
        <div style={{ marginTop: 2, fontSize: 13, color: textA(0.6) }}>Nourish Uluwatu · Drama · Duo</div>
      </div>
      <div style={{ ...glassDense, borderRadius: R.card, padding: 20, marginTop: 16 }}>
        <div style={{ ...labelStyle, height: "auto" }}>Judges submitted</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontFamily: F.heavy, fontSize: 84, lineHeight: 1 }}>
            {count}
            <span style={{ color: textA(0.45), fontSize: 48 }}> / 3</span>
          </span>
          <Dots lit={lit} size={26} />
        </div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {totals.map((tot, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: R.button,
                border: "1px solid rgb(255 255 255 / 0.12)",
                fontSize: 15,
                opacity: lit[i] > 0 ? 1 : 0.35,
              }}
            >
              <span>Judge {i + 1}</span>
              <span style={{ fontFamily: F.heavy }}>{lit[i] > 0 ? tot : "…"}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 15, color: textA(0.75), opacity: count === 3 ? 1 : 0 }}>
          Average <b style={{ fontFamily: F.heavy, color: C.text }}>92.0</b>
        </div>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Leaderboard (src/pages/Leaderboard.tsx). Canvas 1440×810.            */

const BOARD = [
  { name: "Salt & Sambal", outlet: "Nourish Uluwatu", cat: "Drama", avg: "92.0" },
  { name: "The Movers", outlet: "Nourish Berawa", cat: "Dance", avg: "89.3" },
  { name: "Ayu Lestari", outlet: "The Bakery", cat: "Sing", avg: "87.7" },
  { name: "Kitchen Beats", outlet: "Nourish Ungasan", cat: "Band", avg: "85.0" },
  { name: "Berawa Voices", outlet: "Nourish Berawa", cat: "Sing", avg: "82.3" },
];

/** Winner card centre on the leaderboard canvas, for the push-in. */
export const WINNER_NAME = { x: 720, y: 470 };

export function Leaderboard({ final, rows, podium, pulse }: {
  final: boolean;
  rows: number[]; // live: per row entrance progress
  podium: [number, number, number]; // final: 2nd runner-up, 1st runner-up, winner rise progress
  pulse: number; // gold pulse on the winner
}) {
  return (
    <Screen style={{ width: 1440, height: 810, inset: undefined }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 44, textAlign: "center" }}>
        <div style={eyebrow}>Nourish Group Indonesia</div>
        <div style={{ marginTop: 6 }}>
          <Brand size={60} />
        </div>
        <div style={{ marginTop: 6, fontSize: 18, color: textA(0.7) }}>{final ? "And the winners are" : "Live standings"}</div>
      </div>

      {!final &&
        BOARD.map((r, i) => (
          <div
            key={r.name}
            style={{
              ...glass,
              position: "absolute",
              left: 270,
              width: 900,
              top: 236 + i * 106,
              height: 92,
              boxSizing: "border-box",
              borderRadius: R.card,
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "0 28px",
              opacity: rows[i],
              transform: `translateX(${(1 - rows[i]) * 120}px) scale(${0.96 + 0.04 * rows[i]})`,
            }}
          >
            <span style={{ width: 44, fontFamily: F.heavy, fontSize: 32, color: C.gold }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 26 }}>{r.name}</div>
              <div style={{ fontSize: 14, color: textA(0.6) }}>
                {r.outlet} · {r.cat} · 3 judges
              </div>
            </div>
            <span style={{ fontFamily: F.heavy, fontSize: 28 }}>{r.avg}</span>
          </div>
        ))}

      {final &&
        (
          [
            { r: BOARD[1], label: "1st Runner-up", left: 110, p: podium[1] },
            { r: BOARD[0], label: "Winner", left: 520, p: podium[2] },
            { r: BOARD[2], label: "2nd Runner-up", left: 930, p: podium[0] },
          ] as const
        ).map(({ r, label, left, p }) => {
          const win = label === "Winner";
          return (
            <div
              key={label}
              style={{
                ...glass,
                position: "absolute",
                left,
                width: win ? 400 : 400,
                top: win ? 250 : 300,
                height: win ? 420 : 340,
                boxSizing: "border-box",
                borderRadius: R.card,
                borderColor: win ? C.gold : "rgb(255 255 255 / 0.15)",
                padding: 28,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                opacity: Math.min(1, p * 1.5),
                transform: `translateY(${(1 - p) * 80}px)`,
                boxShadow: win ? `0 0 ${120 * pulse}px ${goldA(0.55 * pulse)}, inset 0 0 ${60 * pulse}px ${goldA(0.25 * pulse)}` : "none",
              }}
            >
              {win && (
                <span
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: R.pill,
                    background: C.gold,
                    color: C.base,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                    transform: `scale(${1 + 0.15 * pulse})`,
                  }}
                >
                  <Icon name="trophy" size={32} />
                </span>
              )}
              <div style={eyebrow}>{label}</div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: F.display,
                  fontWeight: 600,
                  fontSize: win ? 52 : 34,
                  lineHeight: 1.1,
                  color: win ? C.gold : C.text,
                }}
              >
                {r.name}
              </div>
              <div style={{ marginTop: 8, fontSize: 16, color: textA(0.7) }}>
                {r.outlet} · {r.cat}
              </div>
              <div style={{ marginTop: 18, fontFamily: F.heavy, fontSize: win ? 44 : 32 }}>{r.avg}</div>
            </div>
          );
        })}
    </Screen>
  );
}
