import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { supabase } from "../lib/supabase.ts";
import { inputClass } from "./Select.tsx";

export type PinRole = "admin" | "judge";

export function storedPin(role: PinRole): string {
  return sessionStorage.getItem(`gt_${role}_pin`) ?? "";
}

export function clearPin(role: PinRole) {
  sessionStorage.removeItem(`gt_${role}_pin`);
}

export default function PinGate({
  role,
  title,
  children,
}: {
  role: PinRole;
  title: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(() => storedPin(role) !== "");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checking) return;
    void supabase
      .rpc("verify_pin", { p_pin: storedPin(role), p_role: role })
      .then(({ data }) => {
        if (data === true) setUnlocked(true);
        else clearPin(role);
        setChecking(false);
      });
  }, [checking, role]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("verify_pin", {
      p_pin: pin,
      p_role: role,
    });

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (data !== true) {
      setError("That PIN is not right. Check with whoever set it up.");
      setPin("");
      return;
    }

    sessionStorage.setItem(`gt_${role}_pin`, pin);
    setUnlocked(true);
  }

  if (unlocked) return <>{children}</>;

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 size={24} strokeWidth={2} className="animate-spin text-gold" aria-label="Checking" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm items-center px-4 py-12">
      <motion.form
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
  
        className="glass-dense w-full rounded-card p-6"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-gold">
          <KeyRound size={24} strokeWidth={2} className="text-bg-base" />
        </span>

        <h1 className="mt-5 text-center font-display text-card-title leading-tight text-text-on-glass">
          {title}
        </h1>
        <p className="mt-2 text-center font-sans text-caption text-text-on-glass/60">
          Enter the {role} PIN to continue.
        </p>

        <label htmlFor="pin" className="sr-only">
          {role} PIN
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={4}
          placeholder="••••"
          className={inputClass + " mt-6 text-center tracking-[0.4em]"}
        />

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-button border border-secondary/50 bg-secondary/15 p-3 font-sans text-caption text-text-on-glass"
          >
            <TriangleAlert size={16} strokeWidth={2} className="mt-px shrink-0 text-gold-light" />
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || pin.length === 0}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-gold font-sans text-button font-semibold text-bg-base transition-colors hover:bg-gold-light disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={20} strokeWidth={2} className="animate-spin" />
              Checking
            </>
          ) : (
            "Unlock"
          )}
        </button>
      </motion.form>
    </main>
  );
}
