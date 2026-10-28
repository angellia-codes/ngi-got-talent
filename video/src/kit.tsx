import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, type SpringConfig } from "remotion";
import { C, F, FPS, R, b, goldA, textA } from "./tokens";

/* ------------------------------------------------------------------ */
/* Timing helpers. Every argument named a "beat" is a shotlist beat.   */

type Ease = (t: number) => number;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const IN = Easing.in(Easing.cubic);
export const OUT = Easing.out(Easing.cubic);
export const INOUT = Easing.inOut(Easing.cubic);
export const OUT_EXP = Easing.out(Easing.exp);

export const SNAPPY: Partial<SpringConfig> = { damping: 20, stiffness: 200 };
export const BOUNCY: Partial<SpringConfig> = { damping: 12 };
export const SMOOTH: Partial<SpringConfig> = { damping: 200 };

/** Clamped interpolate between two beats. */
export function ramp(f: number, from: number, to: number, out: [number, number] = [0, 1], easing: Ease = INOUT) {
  return interpolate(f, [b(from), b(to)], out, { ...clamp, easing });
}

/** Clamped interpolate across several beats. */
export function track(f: number, beats: number[], values: number[], easing: Ease = INOUT) {
  return interpolate(f, beats.map(b), values, { ...clamp, easing });
}

/** Zoom that moves at constant perceived speed: interpolates in log space. */
export function logTrack(f: number, beats: number[], scales: number[], easing: Ease = INOUT) {
  return Math.exp(track(f, beats, scales.map(Math.log), easing));
}

/** Spring that starts on a beat. 0 before it. */
export function sp(f: number, beat: number, config: Partial<SpringConfig> = SNAPPY) {
  return spring({ frame: f - b(beat), fps: FPS, config });
}

/** 0 → 1 → 0 hump starting on a beat: button presses, squashes, pulses. */
export function bump(f: number, beat: number, up = 3, down = 8) {
  const at = b(beat);
  return interpolate(f, [at, at + up, at + up + down], [0, 1, 0], clamp);
}

/** Camera on a 1920×1080 layer: scale `s` about frame point (fx, fy), and move
    that point a fraction `k` of the way to frame centre. */
export function cam(s: number, fx: number, fy: number, k: number): CSSProperties {
  return {
    transformOrigin: `${fx}px ${fy}px`,
    transform: `translate(${(960 - fx) * k}px, ${(540 - fy) * k}px) scale(${s})`,
  };
}

/* ------------------------------------------------------------------ */
/* Reel furniture.                                                     */

/** Per-glyph spring rise, staggered by `stagger` frames. */
export function Glyphs({ text, f, at, stagger = 1.4, style }: {
  text: string;
  f: number;
  at: number;
  stagger?: number;
  style?: CSSProperties;
}) {
  return (
    <span style={{ display: "inline-block", whiteSpace: "pre", ...style }}>
      {[...text].map((ch, i) => {
        const s = spring({ frame: f - b(at) - i * stagger, fps: FPS, config: { damping: 14, stiffness: 140 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: Math.min(1, s * 1.6),
              transform: `translateY(${(1 - s) * 0.7}em) rotate(${(1 - s) * 10}deg)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

/** Drifting stage light behind everything. */
export function StageLights({ f }: { f: number }) {
  const x = 50 + 28 * Math.sin(f / 70);
  return (
    <AbsoluteFill
      style={{
        background: [
          `radial-gradient(ellipse 30% 75% at ${x}% -8%, rgb(254 206 121 / 0.14), transparent 70%)`,
          "radial-gradient(ellipse 90% 55% at 50% -10%, rgb(140 9 2 / 0.55), transparent 70%)",
          "radial-gradient(ellipse 70% 45% at 50% 105%, rgb(177 65 54 / 0.22), transparent 70%)",
          C.base,
        ].join(", "),
      }}
    />
  );
}

/** Two red curtain panels. `closed` 0 = open, 1 = fully drawn. */
export function Curtains({ closed }: { closed: number }) {
  if (closed <= 0.001) return null;
  const fabric = [
    "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.32) 0px, rgb(0 0 0 / 0) 36px, rgb(255 255 255 / 0.07) 64px, rgb(0 0 0 / 0) 92px, rgb(0 0 0 / 0.32) 128px)",
    "linear-gradient(180deg, #a40e04, #730801 65%, #3a0300)",
  ].join(", ");
  const panel = (side: "left" | "right") => (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: "51%",
        [side]: 0,
        background: fabric,
        boxShadow: "0 0 90px rgb(0 0 0 / 0.65)",
        transform: `translateX(${(side === "left" ? -1 : 1) * (1 - closed) * 102}%)`,
      }}
    />
  );
  return (
    <AbsoluteFill>
      {panel("left")}
      {panel("right")}
      {/* Valance with a gold fringe, drops with the panels. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 84,
          background: "linear-gradient(180deg, #4d0400, #7a0902)",
          borderBottom: `6px solid ${C.gold}`,
          boxShadow: "0 12px 40px rgb(0 0 0 / 0.55)",
          transform: `translateY(${-(1 - closed) * 110}%)`,
        }}
      />
    </AbsoluteFill>
  );
}

const CAPTIONS: [number, number, string][] = [
  [9, 12, "Duo or Group? Add the act name."],
  [13, 15.6, "A reference. No login."],
  [16.5, 20, "Set the order."],
  [20.5, 23.6, "One tap sends an act on stage."],
  [24.6, 29.4, "Projector updates live."],
  [30.4, 34, "Shared PIN. Pick a slot."],
  [34, 38, "5 criteria. 100 points."],
  [38.5, 43.6, "Scores lock. Admin sees 3 of 3."],
  [44.5, 47, "Admin flips Live, then Final."],
];

/** One caption line at a time, lower-left band. */
export function Caption({ f }: { f: number }) {
  const c = CAPTIONS.find(([s, e]) => f >= b(s) && f < b(e));
  if (!c) return null;
  const [s, e, text] = c;
  const enter = interpolate(f, [b(s), b(s) + 9], [0, 1], { ...clamp, easing: OUT });
  const exit = interpolate(f, [b(e) - 6, b(e)], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 132,
        bottom: 44,
        padding: "16px 30px",
        borderRadius: R.pill,
        background: "rgb(33 1 0 / 0.78)",
        border: "1px solid rgb(255 255 255 / 0.15)",
        backdropFilter: "blur(16px)",
        fontFamily: F.inter,
        fontWeight: 600,
        fontSize: 32,
        color: C.text,
        opacity: Math.min(enter, exit),
        transform: `translateY(${(1 - enter) * 24}px)`,
      }}
    >
      {text}
    </div>
  );
}

/** Rolling digit column: rolls from 0 up to `n` as `p` goes 0 → 1. Each cell
    is taller than the glyph so Playfair's descenders don't peek into the next. */
const CELL = 1.25;
function Roll({ n, p }: { n: number; p: number }) {
  return (
    <span style={{ display: "block", height: `${CELL}em`, overflow: "hidden" }}>
      <span style={{ display: "block", transform: `translateY(${-p * n * CELL}em)` }}>
        {Array.from({ length: n + 1 }, (_, i) => (
          <span key={i} style={{ display: "block", height: `${CELL}em`, lineHeight: `${CELL}em` }}>
            {i}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Large chapter title left of the phone card: number rolls in, title rises. */
export function Chapter({ f, at, num, title }: { f: number; at: number; num: number; title: string }) {
  const roll = sp(f, at, SMOOTH);
  const line = ramp(f, at + 0.3, at + 1.2, [0, 1], OUT);
  return (
    <div style={{ position: "absolute", left: 150, top: 300, width: 760, color: C.text }}>
      {/* Lining figures: Playfair's default old-style digits descend into the next roll cell. */}
      <div style={{ display: "flex", fontFamily: F.playfair, fontWeight: 700, fontSize: 200, color: C.gold, marginTop: -50, fontVariantNumeric: "lining-nums" }}>
        <Roll n={0} p={0} />
        <Roll n={num} p={roll} />
      </div>
      <div style={{ height: 4, width: 220 * line, background: C.gold, margin: "0 0 32px" }} />
      <Glyphs
        text={title}
        f={f}
        at={at + 0.25}
        stagger={1}
        style={{ fontFamily: F.playfair, fontWeight: 600, fontSize: 92, lineHeight: 1.05 }}
      />
    </div>
  );
}

/** Small chapter tag for full-bleed screens, top-left. */
export function ChapterTag({ f, at, until, num, title }: {
  f: number;
  at: number;
  until: number;
  num: number;
  title: string;
}) {
  const enter = sp(f, at, SNAPPY);
  const exit = ramp(f, until - 0.4, until, [1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: 132,
        top: 12,
        display: "flex",
        alignItems: "baseline",
        gap: 16,
        padding: "8px 26px",
        borderRadius: R.pill,
        background: "rgb(33 1 0 / 0.78)",
        border: `1px solid ${goldA(0.5)}`,
        opacity: Math.min(enter, exit),
        transform: `translateY(${(1 - enter) * -30}px)`,
      }}
    >
      <span style={{ fontFamily: F.playfair, fontWeight: 700, fontSize: 32, color: C.gold, fontVariantNumeric: "lining-nums" }}>
        {String(num).padStart(2, "0")}
      </span>
      <span style={{ fontFamily: F.playfair, fontWeight: 600, fontSize: 30, color: textA(0.95) }}>{title}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phone card. 390×844 screen, placed right of centre in 16x9.         */

export const PHONE_X = 1300;
export const PHONE_SCALE = 1.06;

/** Screen point inside the phone → frame point, for camera targets. */
export function ph(sx: number, sy: number): [number, number] {
  return [PHONE_X + (sx - 195) * PHONE_SCALE, 540 + (sy - 422) * PHONE_SCALE];
}

export function Phone({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        left: PHONE_X - 195,
        top: 540 - 422,
        width: 390,
        height: 844,
        transform: `scale(${PHONE_SCALE})`,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 46,
          overflow: "hidden",
          boxShadow: "0 0 0 10px #0d0000, 0 0 0 11px rgb(255 255 255 / 0.14), 0 50px 140px rgb(0 0 0 / 0.65)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lucide outline icons, inlined (the reel has no lucide dependency).  */

const ICONS = {
  check: <path d="M20 6 9 17l-5-5" />,
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  grip: (
    <>
      {[5, 12, 19].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />))}
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  play: <path d="M6 3l14 9-14 9z" />,
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
};

export function Icon({ name, size = 20, stroke = 2, style }: {
  name: keyof typeof ICONS;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {ICONS[name]}
    </svg>
  );
}
