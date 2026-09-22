# Nourish GOT Talent — Design Guide

**Status:** Locked — ready for implementation
**Prepared for:** Angel, HR Manager, Nourish Group Indonesia
**Live reference:** interactive design system — https://claude.ai/artifact/MBtLcYo4NM7KgvkzKK68PF

---

A stage-spotlight aesthetic for NGI's internal talent show: deep reds and gold on near-black, full glassmorphism, and a denser scrim on the surfaces where legibility matters most.

## Foundation

- **Mood:** red-curtain-and-gold-trophy. Dramatic on the leaderboard, functional everywhere else.
- **Base:** everything sits on `bg-base` (`#210100`), a near-black maroon. There is no light theme — this app only runs dark.
- **Fonts:** Playfair Display (display) + Inter (body/UI). Both load from Google Fonts — no self-hosted font files needed.
- **Icons:** Lucide, outline style only.
- **Motion:** the `motion` library (formerly Framer Motion).

---

## Color

| Token | Value | Use |
|---|---|---|
| `bg-base` | `#210100` | Page background, every surface |
| `primary` | `#8C0902` | Headers, active nav, primary borders |
| `secondary` | `#B14136` | Supporting UI, dividers, inactive states |
| `gold` | `#E6A341` | Winner accent, primary CTAs — solid fill only, never glass |
| `gold-light` | `#FECE79` | Hover states, secondary highlight |
| `text-on-glass` | `#FBF3E7` | All text on any glass surface |
| `glass-standard` | `rgba(255,255,255,0.08)` | Glass fill — registration, leaderboard |
| `glass-dense` | `rgba(255,255,255,0.14)` | Glass fill — judge scoring, admin |
| `glass-border` | `rgba(255,255,255,0.15)` | 1px border, every glass surface |

**Rules:**

- Text on glass is always `text-on-glass`. Never gold-on-glass, never dark-on-glass — legibility is checked against the glass-plus-background composite, not a flat swatch. Against `bg-base`'s near-black, this holds comfortably above 4.5:1 everywhere in the app.
- `gold` never sits behind text on a glass surface. It's reserved for solid-fill moments: the Winner badge, primary buttons, active icon states — the one thing in an all-glass UI that stays unambiguous.
- Glass applies everywhere — registration, judge scoring, admin, leaderboard — with `glass-dense` reserved for judge scoring and admin, where a denser scrim keeps text readable under time pressure at a live event.

## Glassmorphism recipe

```css
/* Standard — registration, leaderboard */
background: var(--glass-standard);
backdrop-filter: blur(var(--blur-glass));
border: 1px solid var(--glass-border);

/* Dense — judge scoring, admin */
background: var(--glass-dense);
backdrop-filter: blur(var(--blur-glass));
border: 1px solid var(--glass-border);
```

`--blur-glass` = 16px.

---

## Typography

Display styles use Playfair Display; everything functional uses Inter.

| Style | Font | Weight | Size | Use |
|---|---|---|---|---|
| `hero-mobile` | Playfair Display | 700 | 40px | Event title, mobile |
| `hero-desktop` | Playfair Display | 700 | 64px | Event title, desktop |
| `section-header` | Playfair Display | 600 | 32px | Section headers |
| `card-title` | Playfair Display | 600 | 22px | Act names on cards |
| `winner-name` | Playfair Display | 700 | 48px | Final Reveal — rendered in `gold` |
| `body` | Inter | 400 | 16px | Forms, rubric, admin tables |
| `caption` | Inter | 400 | 13px | Hints, timestamps |
| `button` | Inter | 600 | 15px | Buttons and CTAs |

Playfair Display's thin serifs can get lost against blur at small sizes — it's a display face only, 22px and up. Everything smaller is Inter, no exceptions.

---

## Spacing & radius

4 / 8 / 12 / 16 / 24 / 32 / 48px scale. Card padding: 16px mobile, 24px desktop.

| Token | Value | Use |
|---|---|---|
| `space-1` | 4px | Micro gaps — icon to label |
| `space-2` | 8px | Tight stacks within a control |
| `space-3` | 12px | Compact card internals |
| `space-4` | 16px | Card padding, mobile |
| `space-6` | 24px | Card padding, desktop. Section-internal gaps |
| `space-8` | 32px | Section-to-section spacing |
| `space-12` | 48px | Page-level spacing, hero sections |

| Token | Value | Use |
|---|---|---|
| `radius-button` | 12px | Buttons and inputs |
| `radius-card` | 20px | Cards and glass panels |
| `radius-pill` | 999px | Badges and winner tags |

---

## Motion

Built with the `motion` library.

- **Card entrance:** fade + scale 0.96 → 1, 250ms ease-out
- **Final Reveal:** staggered curtain reveal — 2nd Runner-up → 1st Runner-up → Winner, 300ms stagger, gold pulse on the Winner card
- **Stage advance (judge screen):** new act slides in from the right, 200ms, no reload
- **Score submit:** 150ms checkmark micro-animation, card dims to a "locked" state
- **`prefers-reduced-motion`:** every animation above falls back to a plain opacity fade — no slides, no scale

---

## Icons

Lucide, outline style only.

- Stroke: 1.5px default, 2px under 20px so strokes don't vanish against glass
- Color: inherits surrounding text color; `gold` only for active, selected, or winner states
- Size: 16px inline, 20px in buttons, 24px decorative

---

## Accessibility

- Text-on-glass contrast is checked against the composite (glass fill over `bg-base`), not the flat swatch — it holds well above 4.5:1 throughout, since the base is near-black everywhere.
- `prefers-reduced-motion` is respected on every animation listed above.
- Touch targets ≥44px on mobile, across registration, judge scoring, and admin.
