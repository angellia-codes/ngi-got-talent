import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  BOUNCY,
  Caption,
  Chapter,
  ChapterTag,
  Curtains,
  Glyphs,
  IN,
  OUT,
  OUT_EXP,
  Phone,
  SMOOTH,
  StageLights,
  bump,
  cam,
  logTrack,
  ph,
  ramp,
  sp,
  track,
} from "./kit";
import {
  ADVANCE_BTN,
  AdminDesktop,
  AdminJudges,
  CRIT_STRIDE,
  JudgeLocked,
  JudgeScore,
  JudgeSlot,
  Leaderboard,
  Projector,
  RegisterDone,
  RegisterForm,
  WINNER_NAME,
} from "./screens";
import { C, F, b, goldA, textA } from "./tokens";

// The 30 s reel from core/shotlist.md. Every number passed to ramp/sp/track
// is a shotlist beat (112 bpm), so each line can be checked against its row.

export function Reel() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.base, color: C.text, fontFamily: F.inter, overflow: "hidden" }}>
      <StageLights f={f} />
      {f < b(4) && <Hook f={f} />}
      {f >= b(3.5) && f < b(16) && <RegisterScene f={f} />}
      {f >= b(15) && f < b(24.2) && <AdminScene f={f} />}
      {f >= b(24) && f < b(30) && <ProjectorScene f={f} />}
      {f >= b(29.2) && f < b(44.2) && <JudgeScene f={f} />}
      {f >= b(43.4) && f < b(52) && <LeaderboardScene f={f} />}
      {f >= b(51.4) && <EndCard f={f} />}
      <Curtains closed={curtain(f)} />
      <Caption f={f} />
    </AbsoluteFill>
  );
}

/** Curtains: close into b4 and part on it (1 → 2); close on b47, part on b48 (11 → 12). */
function curtain(f: number) {
  return Math.max(
    Math.min(ramp(f, 3, 3.6, [0, 1], IN), ramp(f, 4, 4.8, [1, 0], OUT)),
    Math.min(ramp(f, 46.8, 47.5, [0, 1], IN), ramp(f, 48, 48.8, [1, 0], OUT)),
  );
}

/* 1 · Hook, b0–4 ------------------------------------------------------ */

function Hook({ f }: { f: number }) {
  // Starts mid-spring on frame 0: the glyphs were already moving.
  const eyebrow = ramp(f, -0.3, 0.8, [0, 1], OUT);
  const beam = ramp(f, 0, 4, [18, 78]);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse 26% 80% at ${beam}% 30%, rgb(254 206 121 / 0.2), transparent 70%)` }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div
          style={{
            fontFamily: F.inter,
            fontWeight: 600,
            fontSize: 30,
            letterSpacing: `${0.5 - 0.2 * eyebrow}em`,
            textTransform: "uppercase",
            color: C.gold,
            opacity: eyebrow,
          }}
        >
          Nourish GOT Talent
        </div>
        <Glyphs
          text="How the night runs"
          f={f}
          at={-0.35}
          stagger={1.3}
          style={{ marginTop: 26, fontFamily: F.playfair, fontWeight: 700, fontSize: 160, lineHeight: 1.05 }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* 2–4 · Register → Duo → Confirmation, b4–16 -------------------------- */

const BTN_Y = 906; // Register button centre in the form's content, before scroll
const ACT_Y = 600; // Group / Act Name field centre

function RegisterScene({ f }: { f: number }) {
  // Card springs up as the curtains part, squashes as it lands.
  const rise = sp(f, 3.8, BOUNCY);
  const land = interpolate(f - b(3.8), [7, 10, 17], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const flip = ramp(f, 8, 8.35);
  const duo = sp(f, 8.9);
  const typed = ramp(f, 9.6, 10.9, [0, 1], (t) => t);
  const scroll = ramp(f, 10.6, 11.8, [0, 150]);
  const press = bump(f, 12);
  const done = f >= b(12.7);

  // Camera: log push in on the new field, carry on down to the button, release on the press.
  const s = logTrack(f, [9.1, 11, 11.9, 12.2, 12.9], [1, 1.45, 1.6, 1.6, 1]);
  const k = track(f, [9.1, 11, 12.2, 12.9], [0, 0.8, 0.8, 0]);
  const [fx, fy] = ph(195, track(f, [11, 11.9], [ACT_Y, BTN_Y - 150]));

  // Gold fill grows out of the pressed button and wipes into the confirmation.
  const fill = ramp(f, 12.15, 12.75, [0, 1], IN);
  const reveal = ramp(f, 12.7, 13.05);

  // Whip out left as admin comes in from the right.
  const out = ramp(f, 15, 15.9, [0, 1], IN);

  return (
    <AbsoluteFill style={{ transform: `translateX(${-1500 * out}px) scale(${1 - 0.2 * out})`, opacity: 1 - out * 0.6 }}>
      <AbsoluteFill style={cam(s, fx, fy, k)}>
        <Chapter f={f} at={4.1} num={1} title="Register" />
        <Phone
          style={{
            transform: `translateY(${(1 - rise) * 1000}px) scale(${1.06 * (1 + 0.035 * land)}, ${1.06 * (1 - 0.05 * land)})`,
            transformOrigin: "50% 100%",
          }}
        >
          {!done && <RegisterForm flip={flip} duo={duo} typed={typed} press={press} scroll={scroll} />}
          {fill > 0 && !done && (
            <AbsoluteFill style={{ background: C.gold, clipPath: `circle(${fill * 1000}px at 195px ${BTN_Y - scroll}px)` }} />
          )}
          {done && (
            <>
              <AbsoluteFill style={{ background: C.gold }} />
              <AbsoluteFill style={{ opacity: reveal }}>
                <RegisterDone check={sp(f, 12.8, BOUNCY)} stamp={sp(f, 13)} />
              </AbsoluteFill>
            </>
          )}
        </Phone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* 5–6 · Admin: reorder, then advance, b16–24 -------------------------- */

const ADMIN = { x: 132, y: 74, s: 1.15 }; // admin canvas placement in frame

function AdminScene({ f }: { f: number }) {
  const enter = ramp(f, 15.2, 16, [1920, 0], OUT_EXP);

  const lift = sp(f, 18) * (1 - sp(f, 19));
  const move = ramp(f, 18.3, 19);
  const press = bump(f, 22);
  const advanced = ramp(f, 22.15, 22.5);

  // Camera: drift right to the On-stage panel, then log zoom onto the button.
  const fx = ADMIN.x + ADVANCE_BTN.x * ADMIN.s;
  const fy = ADMIN.y + ADVANCE_BTN.y * ADMIN.s;
  const zoom = 2.3;
  const s = logTrack(f, [20, 21.8], [1, zoom], OUT_EXP);
  const k = track(f, [19.4, 20.4, 21.8], [0, 0.3, 1]);

  // The gold button grows to fill the frame and becomes the projector's spotlight.
  const grow = ramp(f, 22.7, 23.8);
  const bw = ADVANCE_BTN.w * ADMIN.s * zoom;
  const bh = ADVANCE_BTN.h * ADMIN.s * zoom;
  const w = interpolate(grow, [0, 1], [bw, 1960]);
  const h = interpolate(grow, [0, 1], [bh, 1120]);

  return (
    <AbsoluteFill style={{ transform: `translateX(${enter}px)` }}>
      <AbsoluteFill style={cam(s, fx, fy, k)}>
        <div style={{ position: "absolute", left: ADMIN.x, top: ADMIN.y, width: 1440, height: 810, transform: `scale(${ADMIN.s})`, transformOrigin: "0 0", borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 120px rgb(0 0 0 / 0.6)" }}>
          <AdminDesktop lift={lift} move={move} press={press} advanced={advanced} />
        </div>
      </AbsoluteFill>
      {grow > 0 && (
        <div
          style={{
            position: "absolute",
            left: 960 - w / 2,
            top: 540 - h / 2,
            width: w,
            height: h,
            borderRadius: interpolate(grow, [0, 1], [12 * ADMIN.s * zoom, 0]),
            background: C.gold,
          }}
        />
      )}
      <ChapterTag f={f} at={16.2} until={22.7} num={2} title="Set the stage" />
    </AbsoluteFill>
  );
}

/* 7 · Projector, b24–30 ----------------------------------------------- */

function ProjectorScene({ f }: { f: number }) {
  const s = logTrack(f, [24, 26], [1.12, 1], OUT_EXP);
  const flash = ramp(f, 24, 24.8, [1, 0], OUT);
  const pulse = ramp(f, 26, 26.9, [0, 1], OUT);
  const out = ramp(f, 29.3, 30, [0, 1], IN);
  return (
    <AbsoluteFill style={{ transform: `translateX(${-1920 * out}px)` }}>
      <AbsoluteFill style={{ transform: `scale(${s})` }}>
        <Projector t={f - b(24)} pulse={f >= b(26) ? pulse : 0} />
      </AbsoluteFill>
      {/* The gold from the advance button shrinks into the projector's spotlight. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${C.gold} ${flash * 100}%, ${goldA(0)} ${flash * 100 + 40}%)`,
          opacity: Math.min(1, flash * 1.5),
        }}
      />
      <ChapterTag f={f} at={24.6} until={29.3} num={3} title="Now on stage" />
    </AbsoluteFill>
  );
}

/* 8–10 · Judge: slot, rubric, lock, admin 3/3, b30–44 ------------------ */

function JudgeScene({ f }: { f: number }) {
  const enter = ramp(f, 29.3, 30, [1500, 0], OUT_EXP);
  const out = ramp(f, 43.4, 44.1, [0, 1], IN);

  const pick = sp(f, 30, BOUNCY);
  const slide = ramp(f, 31.6, 32.1, [0, 1], OUT);

  // Camera travels down the rubric, one criterion per half beat.
  const scroll = track(f, [33.4, 34, 34.5, 35, 35.5], [0, 0, CRIT_STRIDE - 40, 2 * CRIT_STRIDE - 40, 600]);
  const ticks = [0, 1, 2, 3, 4].map((i) => (f >= b(34 + i * 0.5) ? sp(f, 34 + i * 0.5) : 0));
  const punch = f >= b(37) ? sp(f, 37) : 0;
  const press = bump(f, 38);
  const lock = f >= b(38.5) ? sp(f, 38.5, { damping: 22, stiffness: 320 }) : 0;
  const lit = [0, 1, 2].map((i) => (f >= b(40 + i * 0.5) ? sp(f, 40 + i * 0.5, BOUNCY) : 0));

  return (
    <AbsoluteFill style={{ transform: `translateX(${enter - 1500 * out}px)`, opacity: 1 - out }}>
      <Chapter f={f} at={30} num={4} title="Judges score" />
      <Phone>
        {f < b(40) ? (
          <>
            {slide < 1 && (
              <AbsoluteFill style={{ transform: `translateX(${-120 * slide}px)`, opacity: 1 - slide }}>
                <JudgeSlot pick={pick} />
              </AbsoluteFill>
            )}
            {slide > 0 && (
              <AbsoluteFill style={{ transform: `translateX(${(1 - slide) * 390}px)` }}>
                <AbsoluteFill style={{ opacity: 1 - 0.65 * lock, filter: `blur(${3 * lock}px)` }}>
                  <JudgeScore ticks={ticks} punch={punch} press={press} scroll={scroll} />
                </AbsoluteFill>
                {lock > 0 && <JudgeLocked pop={lock} />}
              </AbsoluteFill>
            )}
          </>
        ) : (
          <AdminJudges lit={lit} />
        )}
      </Phone>
    </AbsoluteFill>
  );
}

/* 11–12 · Leaderboard live → curtains → final reveal, b44–52 ------------ */

const BOARD_S = 4 / 3; // 1440×810 canvas → full-bleed 1920×1080

function LeaderboardScene({ f }: { f: number }) {
  const final = f >= b(47.7);
  const head = ramp(f, 43.6, 44.3);
  const rows = [0, 1, 2, 3, 4].map((i) => sp(f, 44.2 + i * 0.4, SMOOTH));
  const podium: [number, number, number] = [
    sp(f, 48.1, { damping: 16, stiffness: 160 }),
    sp(f, 49, { damping: 16, stiffness: 160 }),
    sp(f, 50, { damping: 11, stiffness: 170 }),
  ];
  const pulse = track(f, [50.5, 50.9, 52], [0, 1, 0.4], OUT);

  // Log push-in on the winner, through to an empty gold-on-maroon frame.
  const fx = WINNER_NAME.x * BOARD_S;
  const fy = WINNER_NAME.y * BOARD_S;
  const s = logTrack(f, [50.9, 52], [1, 7], IN);
  const k = ramp(f, 50.9, 51.7);

  return (
    <AbsoluteFill style={{ opacity: head }}>
      <AbsoluteFill style={cam(s, fx, fy, k)}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1440, height: 810, transform: `scale(${BOARD_S})`, transformOrigin: "0 0" }}>
          <Leaderboard final={final} rows={rows} podium={podium} pulse={pulse} />
        </div>
      </AbsoluteFill>
      <ChapterTag f={f} at={44.2} until={46.8} num={5} title="The reveal" />
    </AbsoluteFill>
  );
}

/* 13 · End card, b52–56 ----------------------------------------------- */

function EndCard({ f }: { f: number }) {
  const bg = ramp(f, 51.4, 52);
  const line = ramp(f, 52.5, 53.5, [0, 1], OUT);
  const sub = ramp(f, 53, 53.8, [0, 1], OUT);
  return (
    <AbsoluteFill
      style={{
        opacity: bg,
        background: `radial-gradient(ellipse 55% 60% at 50% 50%, ${goldA(0.2)}, transparent 70%), ${C.base}`,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div style={{ position: "absolute", inset: 40, border: `2px solid ${goldA(0.35)}`, borderRadius: 28 }} />
      <div style={{ fontFamily: F.playfair, fontWeight: 700, fontSize: 150, lineHeight: 1.05 }}>
        <Glyphs text="Nourish GOT " f={f} at={52} stagger={1.1} />
        <Glyphs text="Talent" f={f} at={52.7} stagger={1.1} style={{ color: C.gold }} />
      </div>
      <div style={{ height: 4, width: 640 * line, background: C.gold, margin: "34px auto 30px" }} />
      <div
        style={{
          fontFamily: F.inter,
          fontSize: 40,
          letterSpacing: "0.04em",
          color: textA(0.85),
          opacity: sub,
          transform: `translateY(${(1 - sub) * 20}px)`,
        }}
      >
        NourishFest 2026 · 8 December
      </div>
    </AbsoluteFill>
  );
}
