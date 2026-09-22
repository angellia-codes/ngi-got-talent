# Nourish GOT Talent

Registration, live rubric scoring and a leaderboard for NGI's internal talent
show. Standalone NourishFest 2026 sub-event, same shape as the Badminton
Tournament and Latte Art Battle apps.

Specs: [`core/PRD.md`](core/PRD.md) and
[`core/design_guide.md`](core/design_guide.md). Both are locked — decisions
taken since are recorded here, not by editing them.

**All four phases are built:** schema + registration, admin, judging,
leaderboard.

## Stack

- React 19 + Vite + TypeScript, `react-router-dom` for routing
- Tailwind v4, CSS-first — tokens live in `src/index.css`, there is no
  `tailwind.config.js`
- `motion` for animation, `lucide-react` for icons
- Supabase (PostgreSQL + Realtime), project ref `cijrhzcgooqthoiitita`,
  region `ap-southeast-1`
- Deploys to Vercel as an SPA

## Running it

```
cp .env.example .env.local     # then fill in the two values
npm install
npm run dev
```

`npm run build` type-checks and builds; `npm run lint` runs oxlint.

## Routes

| Route | Who | Access | Holds |
|---|---|---|---|
| `/` | Participants | Public, no login | The registration form |
| `/admin` | Admin | Admin PIN | Running order, stage advance, leaderboard state, judge count, ties, score unlock |
| `/judge` | Judges | Judge PIN, then a judge slot | The rubric for whatever act is on stage |
| `/leaderboard` | Everyone | Public, gated by leaderboard state | The big-screen standings and reveal |

## How access works

There is no Supabase Auth. Access is by PIN, and the PINs never reach the
browser bundle — they live in `private.app_secrets` and are checked by the
`verify_pin` RPC.

The anon key is **read-only**, enforced twice over:

1. **RLS.** Every table has row level security on and no `INSERT`, `UPDATE` or
   `DELETE` policy at all. The absence of a policy is the boundary.
2. **Grants.** The default write grants Supabase hands to `anon` and
   `authenticated` are revoked, including on future tables. So a permissive
   policy added by mistake later cannot open a hole on its own.

Every write therefore goes through a `SECURITY DEFINER` function, which runs as
the owner and is unaffected by either lock:

| Function | Callable by | Does |
|---|---|---|
| `submit_registration(...)` | anyone | Validates and inserts a registration, returns its reference code |
| `verify_pin(pin, role)` | anyone | Checks a PIN against `private.app_secrets` for role `admin` or `judge` |
| `admin_list_performances(pin)` | Admin PIN | The full roster, including the `not_started` rows anon cannot see, with per-judge totals |
| `admin_set_running_order(pin, ids)` | Admin PIN | Writes `running_order` 1..n from the whole ordered array |
| `admin_set_status(pin, id, status)` | Admin PIN | Stage advance; closes out the live act in the same transaction |
| `admin_update_settings(pin, state, count)` | Admin PIN | Leaderboard state and judge count; activates/deactivates slots |
| `admin_unlock_scores(pin, id, slot)` | Admin PIN | Clears the submit lock on one judge's scores for one act |
| `judge_submit_scores(pin, id, slot, points)` | Judge PIN | Validates the whole rubric and locks it in one transaction |

Supabase's security advisor flags these as publicly executable `SECURITY
DEFINER` functions. That is intentional — the PIN they each take is the check,
and `submit_registration` is deliberately open as the public registration
endpoint. There are no other findings.

What the public can read: outlets, criteria, judge slots, event settings,
scores, and performances whose status is **not** `not_started`. The pre-event
roster stays private, so staff names are not listable from the public URL; the
admin reads it through `admin_list_performances`.

### Setting the PINs

PINs are 4 digits — the gate accepts no more, and the seed ships placeholders
of `0000`. **Change them before the event:**

```sql
update private.app_secrets set value = '<admin pin>' where key = 'admin_pin';
update private.app_secrets set value = '<judge pin>' where key = 'judge_pin';
```

## Registration

Six fields (PRD §6.1), three of which appear conditionally:

- **Other** category reveals a required "please specify" box
- **Duo** or **Group** reveals a required Group / Act Name, and switches the
  name field's label from "Performer Name" to "Representative / Contact Name"
- **Group** additionally reveals a headcount, minimum 3 — two performers is a Duo

Those rules are enforced three times: in the form, in `submit_registration`,
and as `CHECK` constraints on the table. A registration that breaks one is
rejected whether it arrives from the UI, the RPC, or the Supabase dashboard.

On submit the participant gets a reference code — `GT-001`, `GT-002`, … from a
Postgres sequence. Codes can have gaps: `nextval` is not transactional, so a
rejected insert still consumes one. Uniqueness and ordering are unaffected.

## Judging

A judge enters the Judge PIN, picks a judge slot, and lands on whatever act
Admin has marked `on_stage`. The slot is a session tag, not an account (PRD
§4): it lives in `sessionStorage` under `gt_judge_slot`, nothing is reported
per judge, and it exists only so three judges' scores can be told apart and
averaged. A slot that already holds a submitted score for the current act is
labelled as such in the picker but stays selectable — Admin can unlock, and
blocking it would strand a judge whose phone died mid-act.

Each criterion is a row of tap chips from 0 to its `max_points`. Chosen over a
slider (no drag precision on a phone) and over a ± stepper (17 taps to reach
17); the exact value is always on screen, which is what matters under stage
lighting.

The whole rubric submits as one set, which is what makes the PRD §6.3 lock a
single fact rather than five. `judge_submit_scores` rejects a rubric that is
missing a criterion, carries an unknown one, or holds a value above that
criterion's `max_points` — and that ceiling check exists **only** there, since
a `CHECK` on `scores` cannot reach `criteria`.

Once submitted, the rubric is locked. Admin reopens it from the act card on
`/admin`: `admin_unlock_scores` clears `locked_at` and leaves the numbers, so
the judge corrects the one they fat-fingered instead of re-entering five from
memory. Both the leaderboard view and `admin_list_performances` count only
locked scores, so an unlocked act leaves the standings on its own.

The judge screen never needs a refresh: it subscribes to `performances`,
`scores` and `event_settings`, so a stage advance slides the new act in and a
judge-count change re-reads the slots.

## Leaderboard

`/leaderboard` is public and ungated in React on purpose — the Hidden / Live /
Final Reveal gate is inside the `leaderboard` view. Hidden returns zero rows to
everyone, including anyone hitting the REST API directly.

- **Hidden** — a holding screen. The page branches on
  `event_settings.leaderboard_state`, not on "no rows came back": an empty
  board during Live means nothing is scored yet, which is a different screen.
- **Live** — the full ranked list, with acts that have no locked scores counted
  under a "Not scored yet" line rather than ranked.
- **Final Reveal** — Winner / 1st Runner-up / 2nd Runner-up revealed bottom-up
  on a 300ms stagger, the rest of the field below.

Tied acts share a rank position and nothing here picks between them — PRD §4
makes that Admin's manual call, and Admin's tie-break panel shows the per-judge
breakdown behind each tied average.

## Layout

```
core/                        PRD and design guide (locked)
src/
  index.css                  @theme design tokens + the glass recipe
  App.tsx                    routes
  components/
    PinGate.tsx              the shared Admin/Judge PIN gate
    Select.tsx               the styled select + the shared input class
  lib/
    supabase.ts              the client
    types.ts                 hand-written row types, mirroring the DB enums
  pages/
    Register.tsx             the public registration form
    Admin.tsx                stage management
    Judge.tsx                slot picker + rubric
    Leaderboard.tsx          standings and the reveal
supabase/
  migrations/                one concern per file, applied in order
  tests/
    registration_rules_test.sql
    admin_rules_test.sql
    judging_rules_test.sql
```

## Checks

The three files in `supabase/tests/` are the self-tests: run them in the
Supabase SQL editor. Every block expects the database to *reject* something, so
**silence means it passed**.

| File | Covers |
|---|---|
| `registration_rules_test.sql` | The conditional-field constraints, the `CHECK`-passes-on-NULL trap, the RPC's trimming and validation, the one-act-on-stage index, PIN verification |
| `admin_rules_test.sql` | Wrong-PIN rejection on every admin RPC, the hidden roster, running order, stage advance, judge count, standings while the leaderboard is hidden |
| `judging_rules_test.sql` | Wrong-PIN rejection, scoring an act that is not on stage, an inactive slot, every bad-payload shape, the submit lock, the unlock, and the averages the view and the admin RPC agree on |

Each cleans up after itself but consumes values from
`performance_reference_seq`; each file's header has the `setval` to rewind it.
`judging_rules_test.sql` puts an act on stage, so do not run it during a show.

There is no JS test runner — neither sibling app has one either.

## Out of scope

Per PRD §10: audience voting, media upload, participant accounts, multi-year
schema reuse, phone number capture.

## Architecture decisions

Each entry records what was chosen *and* what was rejected.

1. **Single-event schema, no `events` parent table.** PRD §7 left this open;
   Angel closed it. Rejected: the Badminton app's `tournaments` pattern. A 2027
   season means a data migration, and that trade was made knowingly.

2. **PIN-checked `SECURITY DEFINER` RPCs.** Rejected: the Latte Art app's
   model, where anon has full CRUD and the PIN gate is frontend-only — there,
   anyone with the public URL and devtools can rewrite scores. Also rejected:
   the Badminton app's Edge Function with a `jose`-signed JWT, which is
   stronger but adds a Deno deploy target; GOT Talent's privileged writes are
   simple upserts with no bracket-routing logic to host.

   Consequence, stated plainly: the PIN is held in `sessionStorage` and passed
   to each write RPC, rather than exchanged for a short-lived token. For a
   one-day internal event with a rotated PIN that is an accepted trade.

3. **`performances.status` is the only record of what is on stage.** PRD §7
   sketched a `current_on_stage_performance_id` on `event_settings`, but §6.2
   makes status the driver. Rejected: keeping both — two columns for one fact
   drift the first time someone edits a row in the dashboard. A partial unique
   index guarantees exactly one act can hold `on_stage`.

4. **Registration goes through an RPC, not a direct table insert.** Rejected:
   the Badminton app's anon `INSERT` policy. PostgREST needs a `SELECT` policy
   to return an inserted row, and not_started registrations are deliberately
   hidden from the public; routing through a function means no anon write
   policy has to exist anywhere.

5. **A sequence-based reference code.** Rejected: the Latte Art app's raw UUID
   receipt, which nobody can read back over the phone. `GT-007` is legible,
   collision-free and doubles as arrival order.

6. **`running_order` is nullable and not unique.** Rejected: a unique
   constraint, which turns drag-reordering into a shuffle of conflicting
   updates. Callers order by `(running_order nulls last, created_at)`.

7. **Tokens are used, not just declared.** The Latte Art app defines a full
   `@theme` block and then writes raw hex in nearly every component. Here a raw
   hex literal in a component is treated as a bug.

8. **The leaderboard's visibility gate lives in the SQL view, not the UI.**
   Rejected: filtering in the leaderboard page's React. Otherwise anon can read
   the standings straight off the REST API while Admin believes they are
   hidden.

9. **The rubric submits as a whole set, and the ceiling is checked in the RPC.**
   Rejected: a per-criterion autosave, which would make the submit lock five
   facts instead of one and let a half-entered rubric move an average. Note
   that `points <= criteria.max_points` is enforced *only* in
   `judge_submit_scores` — a `CHECK` on `scores` cannot reach another table, so
   a direct dashboard insert is not validated against it.

10. **No judge-slot claim RPC.** Rejected: locking a slot to a session. The
    slot is a session tag (PRD §4), and the submit lock is already what stops
    two judges colliding on one slot's scores. A claim would also lock out a
    judge whose phone died with no way back in.

11. **Oswald + Archivo Black + Inter, replacing the guide's Playfair pairing.**
    Angel changed the pairing after the guide was locked: Oswald is the
    condensed title face (`font-display`, weight 600 set once in `index.css`),
    Archivo Black is the heavy supporting voice (`font-heavy` — eyebrow labels,
    scores, ranks, the reference code). Inter stays for body and UI: Archivo
    Black ships a single weight and is unreadable at 13–16px, so the guide's
    "everything functional is Inter" rule still holds.

12. **Unlock clears `locked_at`; it never deletes score rows.** Rejected:
    deleting the judge's rows, which hands them a blank rubric to re-enter from
    memory when the point was to fix a single mis-tapped number.

### Correction to PRD §9

The PRD says the React + Vite stack "matches Badminton Tournament and Latte Art
Battle." Only Badminton does. Latte Art is Next.js 16 App Router with Server
Actions and `@supabase/ssr`, so its scaffolding does not transfer — it is
referenced here for patterns only.

## Conventions

- Commit subjects are sentence-case imperative, no prefixes and no emoji.
- Non-obvious lines carry a *why* comment naming the rejected alternative.
- A `ponytail:` comment marks a deliberate shortcut together with the condition
  that should trigger revisiting it.
