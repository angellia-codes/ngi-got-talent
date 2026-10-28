# Nourish GOT Talent, how the night runs: shot list
30 s · 112 bpm (1 beat = 0.536 s) · 56 beats · formats: 16x9 (primary), 9x16
Music: synthesized house, D minor, intro b0–8, main b8–52, end b52–56 · VO: none
Audience: judges and stage crew. One example act, **Salt & Sambal** (Drama · Duo · Nourish Uluwatu), is followed from registration to the win, so the five screens read as one night, not five demos.
Screens: example screens built from the PRD + design guide with example data (`assets/shots/*.png`). Any of them can be swapped for a real screenshot of the same name later.

Type: Playfair Display for chapter titles and the hook, Inter for captions. One accent: gold. No VO, so each chapter carries one caption line (max ~6 words).

| # | beats | time | shot | on screen (asset) | motion | out (transition) | sound (hits) |
|---|-------|------|------|-------------------|--------|------------------|--------------|
| 1 | 0–4 | 0.00–2.14 | **Hook.** "How the night runs" in Playfair, already springing in on frame 0; "Nourish GOT Talent" eyebrow above in gold | Type + stage-light background | Per-glyph spring up, staggered; spotlight drifts across | Two red curtain panels
 sweep in from the sides and part on b4, revealing shot 2 behind them | impact b0, pop b0.5, pop b1 |
| 2 | 4–8 | 2.14–4.29 | **01 Register.** Phone card rises into frame | `reg_single.png` | Card springs up with a settle squash; chapter number "01" counts in | Hold | whoosh b3.5, thud b4 |
| 3 | 8–12 | 4.29–6.43 | **Conditional field.** Performer dropdown flips Single → Duo; the label changes and the Group / Act Name field drops in | `reg_duo.png` over `reg_single.png` | Wipe down from the dropdown row reveals the Duo state; camera pushes in (log zoom) on the new gold-outlined field | Push continues into the gold Register button | tick b8, pop b9 (field), caption "Duo or Group? Add the act name." |
| 4 | 12–16 | 6.43–8.57 | **Confirmation.** Register button press; confirmation card replaces the form; GOT-004 stamps in | `reg_done.png` | Button squash on b12, gold fill expands to wipe into the confirmation; reference number scales down from 1.3 with a thud | Card shrinks back and slides left as admin slides in from right (whip, both on screen) | click b12, thud b13, caption "A reference. No login." |
| 5 | 16–20 | 8.57–10.71 | **02 Set the stage.** Admin Stage Control | `admin_desktop.png` (16x9) · `admin_mobile.png` (9x16) | Screen lands; the Salt & Sambal row is lifted out (real crop of that row) and dropped into slot 4 to show drag-to-reorder | Camera drifts right to the On-stage panel | whoosh b15.5, thud b16, pop b18 (row lift), click b19 (row drop), caption "Set the order." |
| 6 | 20–24 | 10.71–12.86 | **Send it on stage.** Push in to "Advance to next act" | `admin_desktop.png` crop on right panel | Log zoom to the gold button; press on b22 (squash) | The gold button grows to fill the frame and becomes shot 7's spotlight (match on gold) | click b22, riser into b24, caption "One tap sends an act on stage." |
| 7 | 24–30 | 12.86–16.07 | **03 Now on stage.** Projector, full-bleed | `projector.png` | Comes in at 1.12 scale and settles to 1.0 (log dolly out); the "Now on stage" pill pulses once on b26 | Projector slides left as the judge phone slides in from right (the app's own stage-advance motion) | impact b24, blip b26, caption "Projector updates live." |
| 8 | 30–34 | 16.07–18.21 | **04 Judges score.** Judge slot picker, then the scoring screen | `judge_slot.png` → `judge_score.png` | Judge 2 highlight pops on b30; scoring screen slides in from right on b32 | Camera travels down the rubric | pop b30, whoosh b31.5, caption "Shared PIN. Pick a slot." |
| 9 | 34–38 | 18.21–20.36 | **Rubric.** Five criteria, one tick each on the half-beat; total 93 / 100 lands | `judge_score.png` | Camera tracks down row by row; total punched in on b37 | Submit press on b38 | tick b34, b34.5, b35, b35.5, b36; thud b37, caption "5 criteria. 100 points." |
| 10 | 38–44 | 20.36–23.57 | **Lock.** Submit → locked state; then admin sees 3 / 3 | `judge_locked.png` → `admin_mobile.png` crop on "Judges submitted 3 / 3" | Card dims, lock badge pops in (150 ms check from the design guide); cut on b40 to the admin's 3 / 3 counter, dots light up one by one | Dots row carries into the leaderboard rows | click b38, pop b38.5 (lock), blip b40, b40.5, b41, caption "Scores lock. Admin sees 3 of 3." |
| 11 | 44–48 | 23.57–25.71 | **05 The reveal.** Live leaderboard, then curtains close | `leader_live.png` | Rows slide in staggered; curtain panels close on b47 | Curtains closed = cover for the swap | whoosh b44, tick ×3, swell into b48, caption "Admin flips Live, then Final." |
| 12 | 48–52 | 25.71–27.86 | **Final Reveal.** Curtains part; 2nd Runner-up → 1st Runner-up → Winner, staggered as in the design guide; push in on the Winner | `leader_final.png` (three cards cropped and revealed in order) | Each card rises on its beat (b48, b49, b50); gold pulse on the Winner card; log push-in on "Salt & Sambal 92.0" | Push continues to an empty gold-on-maroon frame | pop b48, pop b49, impact b50, bell b50.5 |
| 13 | 52–56 | 27.86–30.00 | **End card.** "Nourish GOT Talent" (Playfair), "NourishFest 2026 · 8 December" (Inter) | Type only | Per-glyph rise, line under it draws in gold | Hold 2.1 s | impact b52, bell b52.5 |

Formats:
- **16x9:** phone shots (2–4, 8–10) sit as a tall card right of centre with the chapter number and title large on the left. Desktop screens (5–7, 11–12) run near full-bleed.
- **9x16:** phone shots fill the frame (card ~86% wide), chapter title stacks above. Shot 5–6 uses `admin_mobile.png` instead of the desktop screen; the row-lift happens in the mobile list. Shot 7 crops the projector to the act name and "Now on stage" pill, then pans to "Up next". Shot 11 crops the leaderboard rows. Shot 12 stacks the three result cards vertically (2nd, 1st, Winner on top) rather than side by side.
- Captions sit in a lower band clear of the 9x16 social UI safe area.

Longest gap without a new event: b24–b26 and b52–b56 (end card hold), 1.1 s and 2.1 s.
