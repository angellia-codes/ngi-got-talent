import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { Select, inputClass } from "../components/Select.tsx";
import { supabase } from "../lib/supabase.ts";
import {
  CATEGORY_OPTIONS,
  PERFORMER_TYPE_OPTIONS,
  nameLabel,
  type Outlet,
  type PerformanceCategory,
  type PerformerType,
} from "../lib/types.ts";

export default function Register() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);

  const [fullName, setFullName] = useState("");
  const [outletId, setOutletId] = useState("");
  const [category, setCategory] = useState<PerformanceCategory | "">("");
  const [categoryOther, setCategoryOther] = useState("");
  const [performerType, setPerformerType] = useState<PerformerType | "">("");
  const [actName, setActName] = useState("");
  const [performerCount, setPerformerCount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  useEffect(() => {
    void supabase
      .from("outlets")
      .select("*")
      .order("display_order")
      .then(({ data }) => setOutlets((data ?? []) as Outlet[]));
  }, []);

  function changeCategory(value: PerformanceCategory | "") {
    setCategory(value);
    if (value !== "other") setCategoryOther("");
  }

  function changePerformerType(value: PerformerType | "") {
    setPerformerType(value);
    if (value === "single" || value === "") setActName("");
    if (value !== "group") setPerformerCount("");
  }

  function validate(): string | null {
    if (fullName.trim().length < 2) return "Please enter a name of at least 2 characters.";
    if (!outletId) return "Please choose your outlet.";
    if (!category) return "Please choose a performance category.";
    if (category === "other" && !categoryOther.trim())
      return "Please say which kind of performance this is.";
    if (!performerType) return "Please choose Single, Duo or Group.";
    if (performerType !== "single" && !actName.trim())
      return "Please enter your group or act name.";
    if (performerType === "group") {
      const count = Number(performerCount);
      if (!Number.isInteger(count) || count < 3)
        return "A group needs at least 3 performers, so pick Duo for two.";
    }
    return null;
  }

  async function handleSubmit() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("submit_registration", {
      p_full_name: fullName,
      p_outlet_id: outletId,
      p_category: category,
      p_category_other: category === "other" ? categoryOther : null,
      p_performer_type: performerType,
      p_act_name: performerType === "single" ? null : actName,
      p_performer_count: performerType === "group" ? Number(performerCount) : null,
    });

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setReferenceCode(data as string);
  }

  if (referenceCode) {
    return (
      <Confirmation
        referenceCode={referenceCode}
        fullName={fullName.trim()}
        actName={actName.trim()}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:py-16">
      <header className="mb-8 text-center">
        <p className="font-heavy text-caption uppercase tracking-[0.2em] text-gold/80">
          Nourish Group Indonesia
        </p>
        <h1 className="mt-2 font-display text-hero leading-tight text-text-on-glass sm:text-[56px]">
          Nourish GOT <span className="text-gold">Talent</span>
        </h1>
        <p className="mt-3 font-sans text-body text-text-on-glass/70">
          Register your act. It takes about a minute.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        noValidate
        className="glass rounded-card p-4 sm:p-6"
      >
        <Field label={nameLabel(performerType)} htmlFor="fullName">
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={100}
            autoComplete="name"
            placeholder="e.g. Ayu Lestari"
            className={inputClass}
          />
        </Field>

        <Field label="Outlet" htmlFor="outlet">
          <Select
            id="outlet"
            value={outletId}
            onChange={setOutletId}
            placeholder="Choose your outlet"
            options={outlets.map((o) => ({ value: o.id, label: o.name }))}
          />
        </Field>

        <Field label="Performance Category" htmlFor="category">
          <Select
            id="category"
            value={category}
            onChange={(v) => changeCategory(v as PerformanceCategory | "")}
            placeholder="Choose a category"
            options={CATEGORY_OPTIONS}
          />
        </Field>

        <Reveal show={category === "other"}>
          <Field
            label="Please specify"
            htmlFor="categoryOther"
            hint="What kind of performance is it?"
          >
            <input
              id="categoryOther"
              type="text"
              value={categoryOther}
              onChange={(e) => setCategoryOther(e.target.value)}
              maxLength={100}
              placeholder="e.g. Stand-up comedy"
              className={inputClass}
            />
          </Field>
        </Reveal>

        <Field label="Category Performer" htmlFor="performerType">
          <Select
            id="performerType"
            value={performerType}
            onChange={(v) => changePerformerType(v as PerformerType | "")}
            placeholder="Single, Duo or Group"
            options={PERFORMER_TYPE_OPTIONS.map((p) => ({
              value: p.value,
              label: p.label + " — " + p.hint,
            }))}
          />
        </Field>

        <Reveal show={performerType === "duo" || performerType === "group"}>
          <Field
            label="Group / Act Name"
            htmlFor="actName"
            hint="This is the name shown on the leaderboard."
          >
            <input
              id="actName"
              type="text"
              value={actName}
              onChange={(e) => setActName(e.target.value)}
              maxLength={80}
              placeholder="e.g. The Movers"
              className={inputClass}
            />
          </Field>
        </Reveal>

        <Reveal show={performerType === "group"}>
          <Field
            label="Number of Performers"
            htmlFor="performerCount"
            hint="Minimum 3. Two performers is a Duo."
          >
            <input
              id="performerCount"
              type="number"
              inputMode="numeric"
              min={3}
              max={50}
              value={performerCount}
              onChange={(e) => setPerformerCount(e.target.value)}
              placeholder="3"
              className={inputClass}
            />
          </Field>
        </Reveal>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-button border border-secondary/50 bg-secondary/15 p-3 font-sans text-caption text-text-on-glass"
            >
              <TriangleAlert size={16} strokeWidth={2} className="mt-px shrink-0 text-gold-light" />
              <span>{error}</span>
            </motion.p>
          )}
        </AnimatePresence>

        {/* Gold is solid fill only, never glass (design guide). */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-gold font-sans text-button font-semibold text-bg-base transition-colors hover:bg-gold-light disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={20} strokeWidth={2} className="animate-spin" />
              Submitting
            </>
          ) : (
            "Register my act"
          )}
        </button>

        <p className="mt-3 text-center font-sans text-caption text-text-on-glass/50">
          No account needed. You get a reference code on the next screen.
        </p>
      </form>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Confirmation({
  referenceCode,
  fullName,
  actName,
}: {
  referenceCode: string;
  fullName: string;
  actName: string;
}) {
  const reduced = useReducedMotion();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4 py-12">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="glass w-full rounded-card p-6 text-center sm:p-8"
      >
        <motion.span
          initial={reduced ? { opacity: 0 } : { scale: 0 }}
          animate={reduced ? { opacity: 1 } : { scale: 1 }}
          transition={
            reduced
              ? { duration: 0.15 }
              : { type: "spring", stiffness: 260, damping: 18, delay: 0.1 }
          }
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-gold"
        >
          <Check size={28} strokeWidth={2} className="text-bg-base" />
        </motion.span>

        <h1 className="mt-6 font-display text-section leading-tight text-text-on-glass">
          You are registered
        </h1>
        <p className="mt-2 font-sans text-body text-text-on-glass/70">
          {actName || fullName} is on the list for Nourish GOT Talent.
        </p>

        <div className="mt-8 rounded-button border border-glass-border bg-glass-standard px-4 py-5">
          <p className="font-heavy text-caption uppercase tracking-[0.2em] text-text-on-glass/60">
            Your reference
          </p>
          <p className="mt-2 font-heavy text-winner leading-none tracking-wide text-gold">
            {referenceCode}
          </p>
        </div>

        <p className="mt-6 font-sans text-caption text-text-on-glass/60">
          Screenshot this screen. Quote your reference if you need to change anything.
        </p>
      </motion.div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-sans text-caption font-semibold uppercase tracking-wider text-text-on-glass/75"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 font-sans text-caption text-text-on-glass/50">{hint}</p>}
    </div>
  );
}

function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
