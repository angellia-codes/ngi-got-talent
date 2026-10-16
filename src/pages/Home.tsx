import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { ClipboardPen, Monitor, Settings, Star, Trophy, type LucideIcon } from "lucide-react";

type Screen = {
  to: string;
  title: string;
  hint: string;
  icon: LucideIcon;
};

const SCREENS: Screen[] = [
  { to: "/register", title: "Register", hint: "Sign up your act for the show", icon: ClipboardPen },
  { to: "/judge", title: "Judge", hint: "Score the act on stage", icon: Star },
  { to: "/stage", title: "Stage", hint: "Live projector display", icon: Monitor },
  { to: "/leaderboard", title: "Leaderboard", hint: "Live standings and the reveal", icon: Trophy },
  { to: "/admin", title: "Admin", hint: "Running order, stage and scores", icon: Settings },
];

export default function Home() {
  const reduceMotion = useReducedMotion();

  // Design guide: card entrance is fade + scale 0.96 → 1 over 250ms, falling
  // back to a plain fade under prefers-reduced-motion.
  const enter = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 },
    animate: reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 },
    transition: { duration: 0.25, ease: "easeOut" as const, delay },
  });

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center px-4 py-12 sm:py-16">
      {/* Stage-floor dot grid, faded out toward the edges. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(rgb(251_243_231/0.07)_1px,transparent_1px)] bg-size-[22px_22px] mask-[radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"
      />

      <motion.header {...enter(0)} className="text-center">
        <h1 className="font-heavy text-[48px] uppercase leading-[0.95] tracking-tight sm:text-[80px]">
          <span className="block text-text-on-glass [text-shadow:4px_4px_0_var(--color-primary)]">
            Nourish
          </span>
          <span className="block text-gold [text-shadow:4px_4px_0_var(--color-primary)]">
            GOT Talent
          </span>
        </h1>

        <p className="mt-8 inline-block -rotate-2 bg-gold px-5 py-2 font-display text-[22px] uppercase tracking-wide text-bg-base sm:text-section">
          Take the stage.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <span aria-hidden className="h-px w-8 bg-gold/70 sm:w-12" />
          <p className="font-display text-[15px] uppercase tracking-[0.25em] text-gold sm:text-[17px]">
            Nourish Group Indonesia
          </p>
          <span aria-hidden className="h-px w-8 bg-gold/70 sm:w-12" />
        </div>
      </motion.header>

      <nav aria-labelledby="open-a-screen" className="mt-12">
        <h2
          id="open-a-screen"
          className="mb-4 text-center font-heavy text-caption uppercase tracking-[0.3em] text-text-on-glass/60"
        >
          Open a screen
        </h2>

        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {SCREENS.map(({ to, title, hint, icon: Icon }, i) => (
            <motion.li key={to} {...enter(0.1 + i * 0.06)}>
              <Link
                to={to}
                className="glass group flex min-h-11 items-start gap-4 rounded-card p-4 transition-colors hover:bg-glass-dense sm:flex-col sm:gap-3 sm:p-6"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-button border border-glass-border bg-primary/40 text-text-on-glass transition-colors group-hover:border-gold group-hover:bg-gold group-hover:text-bg-base">
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </span>
                <span>
                  <span className="block font-sans text-[18px] font-semibold text-text-on-glass">
                    {title}
                  </span>
                  <span className="mt-1 block font-sans text-caption text-text-on-glass/70">
                    {hint}
                  </span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
