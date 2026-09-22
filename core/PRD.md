# Nourish GOT Talent — Registration & Live Scoring
## Product Requirements Document (PRD)

**Status:** Locked — ready for implementation plan
**Prepared for:** Angel, HR Manager, Nourish Group Indonesia
**Companion apps for reference:** Nourish Badminton Tournament (bracket + live scoring), Nourish Barista Latte Art Battle (rubric scoring + leaderboard)

---

## 1. Overview

A standalone web app for the Nourish GOT Talent competition: staff register a performance act, judges score each act live on a rubric, and a leaderboard reveals the top 3 winners. Same shape as the Latte Art Battle app (registration → judged scoring → leaderboard), scaled up to handle five performance categories and three performer sizes across six outlets.

**Assumption:** treated as a standalone NourishFest 2026 sub-event, same as Badminton and Latte Art Battle — not wired into the main NourishFest committee tool. Flag if that's wrong.

---

## 2. Goals

- Zero-friction registration on a phone — a service crew member fills it out in under a minute.
- Judging that's fast for judges (one screen, one act at a time, no fumbling) and fair (rubric, not gut-feel).
- A leaderboard moment that lands — built for a big screen, not just a table on a laptop.
- Reusable pattern: same stack, same PIN-access model as your other event apps, so ops staff who ran Badminton/Latte Art already know how to use this one.

---

## 3. Scope, As You Gave It

| Item | Values |
|---|---|
| Performance Category | Dance, Sing, Band, Drama, Other (free text) |
| Outlets | Nourish Ungasan, Nourish Uluwatu, Nourish Berawa, Wholefood, The Bakery, BOH |
| Category Performer | Single, Duo, Group (headcount as number input) |
| User Roles | Participant, Judges (+ Admin, implied by "Performance Stage Management") |
| Core Features | Registration form, Stage management (admin), Scoring (judges), Leaderboard (Winner / 1st Runner-up / 2nd Runner-up) |
| Non-Functional | Mobile responsive, Real-time, Database |

---

## 4. Decisions Locked

| Decision | Answer |
|---|---|
| Scoring model | Multi-criteria rubric, not a single number |
| Judge access | Shared PIN (no individual judge accounts) |
| Duo/Group identity | Group/Act Name field added — a 5-person dance group shows as "The Movers," not one person's name |
| Leaderboard scope | One combined leaderboard across all categories — Dance, Band, Drama etc. ranked on the same rubric |
| Round format | Single round — every act performs once, gets scored once |
| Judge panel size | 3 judges, configurable by Admin |
| Tie-break rule | Manual Admin review — tied acts flagged, Admin resolves |
| Leaderboard visibility | Admin-controlled toggle — Hidden / Live / Final Reveal |
| PIN structure | Separate Admin PIN and Judge PIN |
| Branding | Standalone identity (not NourishFest 2026's) — palette below |

**Brand palette:**

| Swatch | Hex | Assigned role |
|---|---|---|
| Near-black maroon | `#210100` | Background |
| Dark red | `#8C0902` | Primary accent (headers, buttons) |
| Rust red | `#B14136` | Secondary accent |
| Gold | `#E6A341` | Highlight / winner accent |
| Light gold | `#FECE79` | Hover states / secondary highlight |

Reads as a stage-spotlight, red-curtain-and-gold-trophy palette — fits a talent-show theme well. I've assigned roles above by contrast logic (darkest = background, gold = the "you won" color); flag if you had specific roles in mind.

**One technical note on shared-PIN judging:** with a panel of judges scoring the *same* act, you still need to tell judge A's submission apart from judge B's — otherwise their scores overwrite each other instead of averaging. So: shared PIN gets a judge into the Judges area, then they pick a **Judge slot** (Judge 1 / Judge 2 / Judge 3) once per session — no password, no name displayed anywhere, nothing reported per-judge. It's a session tag, not an account. This keeps the "no attribution" spirit of your answer while making averaging possible at all.

---

## 5. User Roles & Access

| Role | Access | Scope |
|---|---|---|
| Participant | Public, no login | Registration form only |
| Judges | Shared PIN → pick Judge slot | Score whichever act Admin has marked "on stage" |
| Admin | Separate PIN | Manage running order, advance stage, toggle leaderboard state |

---

## 6. Functional Requirements

### 6.1 Participant Registration Form (public, mobile-first)

| Field | Type | Rule |
|---|---|---|
| Full Name | Text | Required. Label reads "Performer Name" (Single) or "Representative / Contact Name" (Duo, Group) |
| Outlet | Dropdown | Required. 6 fixed options |
| Performance Category | Dropdown | Required. Dance / Sing / Band / Drama / Other. "Other" reveals a required free-text box |
| Category Performer | Dropdown | Required. Single / Duo / Group |
| Group/Act Name | Text | Shown + required only if Performer = Duo or Group |
| Number of Performers | Number | Shown + required only if Performer = Group. Min 3 (2 = Duo) |

On submit: confirmation screen with a registration reference. No account creation, no login.

### 6.2 Performance Stage Management (Admin)

- Full list of registrations, filterable by Outlet / Category / Performer type.
- Set and reorder the stage running order (drag-and-drop or order number).
- Per-act status: `Not Started` → `On Stage` → `Scored` / `Skipped`.
- "On Stage" is the field that drives what judges see — advancing it pushes the new act to every judge's screen in real time.
- Toggle leaderboard state: `Hidden` / `Live` / `Final Reveal`.
- Configure judge count (adds/removes Judge slots).
- Manual tie-break resolution view — surfaces ties in the combined leaderboard for Admin to resolve.

### 6.3 Scoring (Judges)

- Enter shared PIN → select Judge slot (1/2/3) → land on the current "on stage" act automatically.
- Rubric (5 criteria × 20 pts = 100 pts total):
  1. Technical Skill
  2. Creativity / Originality
  3. Stage Presence
  4. Audience Engagement
  5. Overall Impression
- Submit locks that judge's score for that act (Admin can unlock/override if a judge fat-fingers a number).
- Screen updates in real time the instant Admin advances to the next act — judge never has to refresh or navigate.

### 6.4 Leaderboard / Award Display

- Ranking = average of all submitted judge totals per act, sorted descending.
- Three states, Admin-controlled: Hidden (nothing shown publicly) / Live (running leaderboard, optional) / Final Reveal (Top 3 highlighted as Winner, 1st Runner-up, 2nd Runner-up).
- Layout designed for a big screen/projector, not just a laptop — large type, works from across a room.

---

## 7. Data Model (high-level — schema detail belongs in the implementation plan)

| Table | Holds |
|---|---|
| `performances` | Full name / rep name, outlet, category (+ other-text), performer type, group/act name, headcount, running order, status |
| `criteria` | The 5 rubric criteria + point values (kept as data, not hardcoded — lets you edit the rubric without a code change) |
| `scores` | One row per (performance × judge slot × criterion) |
| `judge_slots` | Judge 1/2/3 session tags, active/inactive |
| `event_settings` | Current on-stage performance_id, leaderboard state, judge count |

Reusable-across-years design (like the Badminton app's `tournaments` table) is possible but not included by default — flag if you want this event's schema to support future GOT Talent seasons.

---

## 8. User Flows

**Participant:** Open link → fill form → conditional fields appear based on Performer type → submit → confirmation screen. Done.

**Judge:** Open link → enter shared PIN → pick Judge slot → see current act → score 5 criteria → submit → screen auto-advances when Admin moves to next act.

**Admin:** Open link → enter Admin PIN → see registration list → set running order → mark act "On Stage" (pushes to judges) → mark "Scored" once all judges submit → repeat for each act → flip leaderboard to Live/Final Reveal when ready.

---

## 9. Non-Functional Requirements

- **Mobile responsiveness:** all three surfaces (registration, judge scoring, admin) usable one-handed on a phone at the venue.
- **Real-time:** Supabase Realtime — stage advances, score submissions, and leaderboard changes push instantly with no manual refresh.
- **Database:** Supabase (PostgreSQL).
- **Stack:** React + Vite + TypeScript + Supabase, hosted on Vercel — matches Badminton Tournament and Latte Art Battle for consistency and reuse of your team's familiarity.
- **Network assumption:** venue wifi available throughout. No offline mode. Flag if the venue has known connectivity issues.
- **Performance target:** sub-2s load on outlet-tier mobile data.
- **Branding:** standalone visual identity, not NourishFest 2026's — palette in Section 4.

---

## 10. Out of Scope (this phase)

- Audience/public voting
- Photo or video upload per performance
- Participant accounts or post-event score lookup
- Multi-year schema reuse (unless flagged in Section 7)
- WhatsApp/phone number field on registration — considered, not requested; easy to add later if you want automated reminders sent when an act is coming up

---

## 11. Next Steps

Spec is locked. This splits into 4 independently-shippable build phases (schema+registration, admin, judging, leaderboard) — see chat for the proposed order and which one to build first.
