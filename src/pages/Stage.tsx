import { Fragment, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, stagger, useReducedMotion, type Variants } from "motion/react";
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
  const reduced = useReducedMotion();

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
        <AnimatePresence>
          {act && (
            <motion.span
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={reduced ? { duration: 0.2 } : { type: "spring", stiffness: 400, damping: 22 }}
              className="flex items-center gap-2 rounded-pill bg-gold px-4 py-1.5 font-heavy text-caption uppercase tracking-[0.2em] text-bg-base sm:text-[15px]"
            >
              <span className="size-2 animate-pulse rounded-pill bg-primary" aria-hidden />
              On stage
            </motion.span>
          )}
        </AnimatePresence>
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

// The judge phone's 200ms slide reads as a hard cut from the back of a hall,
// so the projector stages its own reveal: the spotlight blooms, the act number
// tracks in, the name rises out of a blur, then the detail pills land — about
// 1.1s end to end. Exits are short and accelerate away so the next act is not
// kept waiting. Under prefers-reduced-motion every piece is an opacity fade
// and the ambient loops are dropped.
const EASE_REVEAL = [0.05, 0.7, 0.1, 1] as const;
const EASE_EXIT = [0.3, 0, 1, 1] as const;

const fade: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.3 } },
};

const SCENE_VARIANTS = {
  full: {
    scene: {
      hidden: {},
      shown: { transition: { delayChildren: stagger(0.12) } },
      exit: { opacity: 0, y: -24, scale: 0.98, transition: { duration: 0.25, ease: EASE_EXIT } },
    },
    glow: {
      hidden: { opacity: 0, scale: 0.5 },
      shown: { opacity: 1, scale: 1, transition: { duration: 1, ease: EASE_REVEAL } },
    },
    eyebrow: {
      hidden: { opacity: 0, y: 16, letterSpacing: "0.6em" },
      shown: {
        opacity: 1,
        y: 0,
        letterSpacing: "0.3em",
        transition: { duration: 0.6, ease: EASE_REVEAL },
      },
    },
    words: {
      hidden: {},
      shown: { transition: { delayChildren: stagger(0.05) } },
    },
    word: {
      hidden: { opacity: 0, y: 48, filter: "blur(12px)" },
      shown: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.7, ease: EASE_REVEAL },
      },
    },
    hero: {
      hidden: { opacity: 0, y: 48, scale: 0.92, filter: "blur(12px)" },
      shown: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: 0.7, ease: EASE_REVEAL },
      },
    },
    rise: {
      hidden: { opacity: 0, y: 16 },
      shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_REVEAL } },
    },
    pills: {
      hidden: {},
      shown: { transition: { delayChildren: stagger(0.08, { startDelay: 0.15 }) } },
    },
    pill: {
      hidden: { opacity: 0, y: 20, scale: 0.9 },
      shown: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 24 } },
    },
    badge: {
      hidden: { opacity: 0, scale: 0, rotate: -45 },
      shown: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: { type: "spring", stiffness: 260, damping: 16 },
      },
    },
  },
  reduced: {
    scene: { hidden: {}, shown: {}, exit: { opacity: 0, transition: { duration: 0.2 } } },
    glow: fade,
    eyebrow: fade,
    words: { hidden: {}, shown: {} },
    word: fade,
    hero: fade,
    rise: fade,
    pills: { hidden: {}, shown: {} },
    pill: fade,
    badge: fade,
  },
} satisfies Record<string, Record<string, Variants>>;

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

// The ambient loops run indefinitely, so they stop while the projector tab is
// hidden (window minimised, operator switched away) instead of burning GPU.
function usePageVisible() {
  return useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible");
}

function useSceneVariants() {
  const reduced = useReducedMotion() ?? false;
  const visible = usePageVisible();
  return {
    ambient: !reduced && visible,
    v: reduced ? SCENE_VARIANTS.reduced : SCENE_VARIANTS.full,
  };
}

function Spotlight({ act }: { act: OnStage }) {
  const { ambient, v } = useSceneVariants();
  const label = actLabel(act);

  const lineup =
    act.performer_type === "group"
      ? `Group of ${act.performer_count}`
      : act.performer_type === "duo"
        ? "Duo"
        : "Solo";

  return (
    <motion.section
      variants={v.scene}
      initial="hidden"
      animate="shown"
      exit="exit"
      className="relative isolate w-full max-w-6xl text-center"
    >
      {/* Gold spotlight behind the act: blooms in, then breathes while they perform. */}
      <motion.div
        variants={v.glow}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[min(110vw,1000px)] -translate-x-1/2 -translate-y-1/2"
      >
        <motion.div
          animate={ambient ? { scale: [1, 1.06, 1], opacity: [1, 0.7, 1] } : { scale: 1, opacity: 1 }}
          transition={ambient ? { duration: 5, ease: "easeInOut", repeat: Infinity } : { duration: 0.3 }}
          className="size-full rounded-pill bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-gold)_22%,transparent),transparent)]"
        />
      </motion.div>

      {act.running_order !== null && (
        <motion.p
          variants={v.eyebrow}
          className="font-heavy text-[15px] uppercase tracking-[0.3em] text-gold sm:text-[22px]"
        >
          Act {act.running_order}
        </motion.p>
      )}

      {/* Word by word, so a long act name builds across the screen rather than
          landing as one block. The heading's accessible name stays whole. */}
      <motion.h1
        variants={v.words}
        aria-label={label}
        className="mt-4 font-heavy text-[clamp(44px,9vw,148px)] uppercase leading-[0.95] text-text-on-glass [overflow-wrap:anywhere] [text-shadow:5px_5px_0_var(--color-primary)]"
      >
        {label.split(/\s+/).map((word, i) => (
          <Fragment key={i}>
            {i > 0 && " "}
            <motion.span variants={v.word} aria-hidden className="inline-block">
              {word}
            </motion.span>
          </Fragment>
        ))}
      </motion.h1>

      <motion.ul
        variants={v.pills}
        className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
      >
        {[act.outlet?.name, categoryLabel(act), lineup].filter(Boolean).map((item) => (
          <motion.li
            key={item}
            variants={v.pill}
            className="glass rounded-pill px-5 py-2 font-display text-[20px] uppercase tracking-wide text-text-on-glass sm:px-7 sm:text-[32px]"
          >
            {item}
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}

function Intermission() {
  const { ambient, v } = useSceneVariants();

  return (
    <motion.section
      variants={v.scene}
      initial="hidden"
      animate="shown"
      exit="exit"
      className="text-center"
    >
      <motion.div variants={v.badge} className="mx-auto w-fit">
        {/* Idle float plus a halo ring, so the room can tell the screen is live. */}
        <motion.div
          animate={ambient ? { y: [0, -8, 0] } : { y: 0 }}
          transition={ambient ? { duration: 4, ease: "easeInOut", repeat: Infinity } : { duration: 0.3 }}
          className="relative flex size-16 items-center justify-center rounded-pill bg-gold sm:size-20"
        >
          {ambient && (
            <motion.span
              aria-hidden
              animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
              transition={{ duration: 2.4, ease: "easeOut", repeat: Infinity, repeatDelay: 0.4 }}
              className="absolute inset-0 rounded-pill border-2 border-gold"
            />
          )}
          <Sparkles size={32} strokeWidth={1.5} className="text-bg-base" aria-hidden />
        </motion.div>
      </motion.div>

      <motion.h1
        variants={v.hero}
        className="mt-8 font-heavy text-[clamp(40px,7vw,112px)] uppercase leading-[0.95] text-text-on-glass [text-shadow:5px_5px_0_var(--color-primary)]"
      >
        Up <span className="text-gold">next</span>
      </motion.h1>
      <motion.p
        variants={v.rise}
        className="mt-6 font-display text-[20px] uppercase tracking-[0.2em] text-text-on-glass/70 sm:text-[28px]"
      >
        The next act is getting ready
      </motion.p>
    </motion.section>
  );
}
