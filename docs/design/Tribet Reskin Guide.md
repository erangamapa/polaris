# Tribet Design System — Ultimate Reskin Specification (v1)

**Status:** Authoritative. Overrides any prior visual guidance.
**Scope:** Full visual reskin of the existing Tribet product. No changes to composition, layout, routing, state, hooks, api calls, or business logic.
**Audience:** Cursor agent + human reviewer.
**Version:** 1.0 · 2026.07.26
**Direction:** Combined v1 — cool graphite chrome, Halo pearl accent, whispered arena tints.

---

## 0. How to read this document

- Every §1–§14 section is normative. Ignore nothing.
- Token names are canonical. **Rename nothing.** Only change values.
- Where a table has both a Figma name and a CSS variable, the CSS variable is the source of truth in code.
- "Never" means never. If you find a rule blocking an existing feature, stop and ask before diverging.
- All hex values are 6-digit lowercase; add alpha as an 8th/9th pair only when noted.
- Every measurement is in device-independent pixels (`px`) unless it says `rem`, `%`, `em`, or `ms`.
- The word "arena" = one of the three verticals: Casino, Predictions, Sports.

---

## 1. Color tokens

### 1.1 Surface (background) scale

Cool graphite. No warmth. No pure black.

| Token | Hex | HSL | Role |
| --- | --- | --- | --- |
| `--bg` | `#0a0c10` | 220 22% 5% | Root page background |
| `--surface-0` | `#0e1116` | 218 22% 7% | Recessed: inputs, code, search field, embedded frames |
| `--surface-1` | `#131720` | 222 24% 10% | **Default surface** — cards, panels, sidebar |
| `--surface-2` | `#1a1f2a` | 220 24% 13% | Raised: active nav item, hovered card, modal body |
| `--surface-3` | `#242a37` | 222 21% 18% | Floating: dropdowns, popovers, tooltip |
| `--surface-4` | `#2e3543` | 221 19% 22% | Special: game tile overlay, empty state pattern |

**Rules.**
- Elevation is a tonal step, never a shadow (see §5 for the two exceptions).
- Adjacent surfaces must differ by exactly one step. Never skip.
- Never mix warm and cool grays. Warm brown is banned.
- Body/root always `--bg`. Do not wrap the entire app in `--surface-1`.

### 1.2 Ink (foreground text)

| Token | Hex | Role | Contrast on `--surface-1` |
| --- | --- | --- | --- |
| `--ink-high` | `#eceef2` | Headlines, primary body, numeric values | 15.6:1 (AAA) |
| `--ink-dim` | `#8f97a8` | Secondary body, labels, inactive nav | 6.7:1 (AA large + normal) |
| `--ink-quiet` | `#545c6e` | Fine print, disabled text, timestamps | 3.6:1 (AA large only) |
| `--ink-inverse` | `#0a0c10` | Text on Halo, text on `--ink-high` fills | 15.6:1 |

Never introduce a fourth text tone. Do not create per-surface ink overrides.

### 1.3 Rules & borders

| Token | Hex | Weight | Use |
| --- | --- | --- | --- |
| `--rule` | `#242a37` | 1px | Default borders on cards, inputs, table rows |
| `--rule-quiet` | `#1b2029` | 1px | Nested table rows, dense grids |
| `--rule-focus` | `#e6e4da` | 1px + 2px outer ring | Keyboard focus only |
| `--rule-danger` | `#d9605a` | 1px | Destructive confirm borders (rare) |

One weight. One style (solid). Never dashed except for empty-state placeholders. Never doubled.

### 1.4 Primary — Tribet Halo

Halo is the single "brand" accent. Owned by Tribet itself. **Never** used as an arena identifier.

| Token | Hex | Role |
| --- | --- | --- |
| `--halo` | `#e6e4da` | Primary button fill, active toggle, focus ring, logo tile |
| `--halo-hover` | `#f2f0e6` | Primary hover |
| `--halo-dim` | `#b8b5a8` | Loading state, subtle brand accents |
| `--halo-quiet` | `#7a7869` | Divider with intent, disabled primary text |
| `--halo-alpha-24` | `#e6e4da3d` | Focus ring outer glow only |

**Rules.**
- One Halo-filled button visible per screen at any time.
- Never place Halo next to yellow/amber — the eye reads Halo as "off-white gold" already.
- Never gradient Halo.

### 1.5 Vertical identifiers

Each arena has a deep and a light variant. Deep is default; light is used only on already-light surfaces where deep would fail contrast.

**Casino — Ultraviolet**
| Token | Hex | Role |
| --- | --- | --- |
| `--casino` | `#8b6dd0` | Default: dot, rail, chart anchor |
| `--casino-light` | `#b69ee8` | Rails on `--surface-3+` |
| `--casino-deep` | `#7454c0` | Rails on `--bg` |
| `--casino-alpha-12` | `#8b6dd01f` | Diagnostic tint only (behavior overlay, never chrome) |

**Predictions — Racing green**
| Token | Hex | Role |
| --- | --- | --- |
| `--pred` | `#4fa37a` | Default: dot, rail, chart anchor, YES button tint |
| `--pred-light` | `#7cc69a` | Rails on `--surface-3+` |
| `--pred-deep` | `#3d8562` | Rails on `--bg` |
| `--pred-alpha-12` | `#4fa37a1f` | YES button fill in prediction markets |
| `--pred-alpha-24` | `#4fa37a3d` | YES button border |

**Sports — Cobalt**
| Token | Hex | Role |
| --- | --- | --- |
| `--sports` | `#5a87d4` | Default: dot, rail, chart anchor |
| `--sports-light` | `#8aaae4` | Rails on `--surface-3+` |
| `--sports-deep` | `#4670bf` | Rails on `--bg` |
| `--sports-alpha-12` | `#5a87d41f` | Diagnostic tint only |

**Global rules for arena color.**
1. Total arena-color pixel budget: ≤ 3% per screen per arena.
2. Allowed placements: (a) small dot (5–10px) next to a label, (b) 2px vertical rail on the active branch surface, (c) single anchor point on a chart/schematic, (d) tint fill on prediction-market YES/NO buttons only.
3. Banned placements: card backgrounds, page backgrounds, promo hero washes, button fills (except YES/NO), text color, borders, gradients, badges/pills unless the pill's job is to identify the arena.
4. When in doubt: leave it monochrome.

### 1.6 Semantic states

| Token | Hex | Role |
| --- | --- | --- |
| `--ok` | `#4fa37a` | Positive P&L, up-tick arrows, success toast |
| `--ok-fg` | `#7cc69a` | Success text on `--surface-1` |
| `--warn` | `#d9a55a` | Pending, warning banner |
| `--warn-fg` | `#e5bc7a` | Warning text |
| `--err` | `#d9605a` | Negative P&L, down-tick, error toast, destructive |
| `--err-fg` | `#e58279` | Error text |
| `--info` | `#5a87d4` | Neutral notification (reuses `--sports`) |

Positive shares the same green as Predictions — intentional.

### 1.7 Overlay & scrim

| Token | Value | Use |
| --- | --- | --- |
| `--overlay-modal` | `rgba(10,12,16,0.72)` | Modal backdrop |
| `--overlay-toast` | `rgba(10,12,16,0.90)` | Toast scrim (rarely visible) |
| `--overlay-blur` | `blur(8px)` | Applied to `--overlay-modal` backdrop-filter |
| `--overlay-loading` | `rgba(10,12,16,0.60)` | Full-view loading state |

### 1.8 Chart palette

For data visualizations that must go beyond one arena color:

```
--chart-1: #eceef2 (ink)
--chart-2: #8f97a8 (dim)
--chart-3: #545c6e (quiet)
--chart-4: #4fa37a (pred)
--chart-5: #5a87d4 (sports)
--chart-6: #8b6dd0 (casino)
--chart-7: #d9a55a (warn)
```

Never introduce new chart colors. If more than 7 series are needed, dedupe or switch to a mono ramp.

---

## 2. Typography

### 2.1 Family stack

```css
--font-display: "Söhne", "Onest", ui-sans-serif, system-ui, -apple-system,
                "Segoe UI", Roboto, "Helvetica Neue", sans-serif;

--font-ui:      "Söhne", "Onest", ui-sans-serif, system-ui, -apple-system,
                "Segoe UI", Roboto, "Helvetica Neue", sans-serif;

--font-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo,
                Monaco, Consolas, "Liberation Mono", monospace;
```

**Söhne** is the licensed target. **Onest** is the free stand-in with the closest character (Google Fonts). Never fall back to Inter — Inter is the identity being replaced. Never use Helvetica Neue in production; it's only in the stack for last-resort environments.

Include Onest via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 2.2 Weight ramp

| Role | Weight | Notes |
| --- | --- | --- |
| Display | 500 | Never 600+ in chrome |
| Heading | 500 | |
| Body | 400 | |
| Emphasis | 500 | Reserved for numeric emphasis, active nav, primary button label |
| Caption / label | 400 | |
| Mono body | 400 | |
| Mono emphasis | 500 | Balances, headline numbers |

Never use 700+. Never italic. Never oblique.

### 2.3 Type scale (square-shaped, not condensed)

Sizes are the on-screen sizes at 1× device pixel ratio. Line-heights are unitless.

| Token | Size | Line-height | Letter-spacing | Weight | Font | Use |
| --- | --- | --- | --- | --- | --- | --- |
| `--text-display-xl` | 96 | .92 | -.045em | 500 | display | Marketing hero only (rare in product) |
| `--text-display-l` | 72 | .94 | -.04em | 500 | display | Wallet balance, big number screens |
| `--text-display-m` | 56 | .95 | -.035em | 500 | display | Section hero on lobby |
| `--text-display-s` | 44 | .98 | -.03em | 500 | display | Small hero, empty-state title |
| `--text-title-l` | 32 | 1.05 | -.02em | 500 | display | Page title |
| `--text-title-m` | 24 | 1.1 | -.015em | 500 | display | Card title, dialog title |
| `--text-title-s` | 20 | 1.15 | -.015em | 500 | display | Sub-section title |
| `--text-heading` | 17 | 1.3 | -.005em | 500 | ui | Card heading, form group title |
| `--text-body-l` | 16 | 1.55 | 0 | 400 | ui | Long-form body |
| `--text-body` | 15 | 1.55 | 0 | 400 | ui | **Default body** |
| `--text-body-s` | 14 | 1.5 | 0 | 400 | ui | Dense body |
| `--text-caption` | 12 | 1.45 | .01em | 400 | ui | Captions, helper text |
| `--text-label` | 11 | 1.2 | .14em | 500 | mono | Uppercase data labels |
| `--text-label-s` | 10 | 1.2 | .16em | 500 | mono | Tightest labels (chips, breadcrumbs) |
| `--text-mono-l` | 22 | 1 | -.01em | 500 | mono | Big numbers on cards |
| `--text-mono` | 14 | 1.75 | 0 | 400 | mono | Odds tables, ledgers |
| `--text-mono-s` | 12 | 1.6 | 0 | 400 | mono | Timestamps, IDs |
| `--text-mono-xs` | 11 | 1.5 | 0 | 400 | mono | Micro data |

### 2.4 Numerics — the tabular rule

Every number the user might read, compare or track uses `--font-mono` with `font-variant-numeric: tabular-nums`:

- Wallet balances (main + per-asset)
- Odds (decimal, fractional, American — the digits)
- Chances (percentages)
- Volumes, prize pools, race positions
- P&L values
- Timestamps (session IDs, place-time, settle-time)
- Market and match IDs
- Player counts, jackpot totals, RTP percentages

Inline percent, `USDT`, `24H`, `%` unit suffixes stay mono. Currency symbols (`$`) stay mono. Ordinal suffixes (`st`, `nd`, `rd`, `th`) stay sans.

### 2.5 Case rules

Sentence case everywhere except:

- Mono data labels (STAKE, ODDS, MATCH.04128, LIVE) — always uppercase
- Engraved pills (see §5.3)
- Enum-like keys in code UIs (`YES`, `NO`, `1`, `X`, `2` in odds cells)

**Never uppercase:**
- Buttons (except retained legal capitals like `USDT`)
- Nav items
- Section titles
- Body copy
- Card titles

### 2.6 Letter-spacing rules

- Display 40–96px: `-.045em` down to `-.03em` as size drops
- Title 20–32px: `-.02em`
- Heading 17px: `-.005em`
- Body 12–16px: `0`
- Mono labels (uppercase): `.14em` (small), `.16em` (smallest)
- Mono body (numbers): `0`

Never manually track type below `-.045em`. Never expand tracking on lowercase.

### 2.7 Optical sizing / OpenType

If Söhne is used, enable optical sizing (`font-optical-sizing: auto`). If Onest, no action.

For mono, enable:
```css
font-variant-numeric: tabular-nums slashed-zero;
```

Slashed zero on wallets/IDs; regular zero elsewhere is fine — but if the mono font is a fixed subset, keep slashed globally.

---

## 3. Spacing & layout

### 3.1 Base grid

4px base. Do not use values outside this ramp:

| Token | Value | Common use |
| --- | --- | --- |
| `--space-2xs` | 4px | Inline gap between glyph and label |
| `--space-xs` | 8px | Small stack gap, dense list rows |
| `--space-sm` | 12px | Between related items in a card |
| `--space-md` | 16px | **Default gap**, card padding, form field spacing |
| `--space-lg` | 24px | Section title → content, sidebar item |
| `--space-xl` | 32px | Between major sections in a column |
| `--space-2xl` | 48px | Page gutter (medium) |
| `--space-3xl` | 64px | Page gutter (large) |
| `--space-4xl` | 96px | Between chapters on a marketing page |

### 3.2 Container widths

| Token | Value | Use |
| --- | --- | --- |
| `--container-sm` | 640px | Auth, focused flows |
| `--container-md` | 960px | Documents, settings |
| `--container-lg` | 1280px | Standard product |
| `--container-xl` | 1440px | Lobby, dense dashboards |
| `--container-2xl` | 1600px | Full-bleed sports book |

Composition is frozen; use existing containers. Only replace token values if they map cleanly.

---

## 4. Corner radii

| Token | Value | Applied to |
| --- | --- | --- |
| `--radius-none` | 0 | Data grid cells, image tiles that must square-fit |
| `--radius-xs` | 2px | Engraved data pills |
| `--radius-sm` | 4px | Buttons inside a dense card (odds cell), inner elements |
| `--radius-md` | 6px | **Default** — cards, inputs, buttons, modals |
| `--radius-lg` | 10px | Hero cards, large promo panels |
| `--radius-xl` | 14px | Game tiles (preserve current artwork silhouette) |
| `--radius-pill` | 999px | Chips, arena dots, avatars, toggle track |

Rules:
- Nested elements never have larger radius than their parent.
- Buttons and inputs of the same visual weight share a radius.
- Bring existing >12px promo card radii down to `--radius-lg` (10px).

---

## 5. Elevation & shadow

Flat surfaces have no shadow. Elevation is achieved by stepping the surface value up.

**Allowed shadows** (exhaustive list):

| Token | Value | Applied to |
| --- | --- | --- |
| `--shadow-overlay` | `0 24px 48px -12px rgba(0,0,0,.7), 0 2px 4px rgba(0,0,0,.4)` | Modal, popover, dropdown menu |
| `--shadow-toast` | `0 12px 32px -8px rgba(0,0,0,.6), 0 1px 2px rgba(0,0,0,.4)` | Toast |
| `--shadow-focus` | `0 0 0 2px var(--halo)` | Keyboard focus ring on interactive elements |
| `--shadow-focus-danger` | `0 0 0 2px var(--err)` | Focus on destructive controls |

**Banned:**
- Any inset shadow
- Any glow behind a card
- Any drop shadow on nav items, sidebar, top bar, or in-page cards
- Colored shadows other than the focus rings above

---

## 6. Motion

| Token | Value | Use |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Exit |
| `--ease-inout` | `cubic-bezier(0.65, 0, 0.35, 1)` | State toggle |
| `--dur-instant` | 80ms | Icon color change |
| `--dur-fast` | 120ms | Hover, focus |
| `--dur-medium` | 200ms | Modal enter, dropdown enter |
| `--dur-slow` | 320ms | Page transition |
| `--dur-flash` | 400ms | Live value flash (odds change, balance update) |

Rules:
- Odds/balance changes: text color flashes to `--ok` (up) or `--err` (down), decays back to `--ink-high` over 400ms. The **card itself** does not move, scale, or highlight.
- No parallax, no ambient loops.
- No hover transforms (no scale, no translate). Color only.
- `prefers-reduced-motion: reduce` disables all non-essential animation.

---

## 7. Iconography

### 7.1 Set

Adopt **Lucide** at the "regular" weight. If Lucide is unavailable in the project, use **Phosphor regular**. Never mix libraries.

### 7.2 Specifications

- Grid: 22px on a 24 viewBox
- Stroke: 1.6px
- Cap: round
- Join: round
- Fill: none (except when a token like a filled star signals state)
- Colors: `--ink-dim` at rest, `--ink-high` on hover/active, `--halo` for the filled-star favorite state
- Semantic icons (ok/error): use `--ok` and `--err` and nothing else

### 7.3 Pairing rule

Icons at rest are always paired with a text label (visible or `aria-label`). Icon-only buttons must always carry an `aria-label` and, if visible, a tooltip.

### 7.4 Banned

- Filled solid icons (except state indicators)
- Dual-tone icons
- Colorful branded icons
- Emoji in the product chrome (allowed only in user-generated content, never in TS/JSX literals)

---

## 8. Components — reskin rules

Structure of each component is frozen. Only the token values and stylistic accents below change.

### 8.1 Buttons

**Primary (Halo).**
```css
background: var(--halo);
color: var(--ink-inverse);
font: 500 14px/1 var(--font-ui);
padding: 12px 22px;
border-radius: var(--radius-md);
border: 1px solid transparent;
transition: background var(--dur-fast) var(--ease-out);

/* hover */    background: var(--halo-hover);
/* active */   background: var(--halo-dim);
/* disabled */ background: var(--surface-3); color: var(--ink-quiet); cursor: not-allowed;
/* focus */    box-shadow: var(--shadow-focus);
/* loading */  opacity: .85; pointer-events: none; /* spinner: 12px, 1.5px stroke, --ink-inverse */
```

One per screen. Assign to: Connect wallet, Claim bonus, Confirm bet, Place bet, Deposit, Confirm.

**Secondary (tonal).**
```css
background: var(--surface-3);
color: var(--ink-high);
/* hover */    background: var(--surface-4);
/* disabled */ color: var(--ink-quiet);
```

**Outline.**
```css
background: transparent;
color: var(--ink-high);
border: 1px solid var(--rule);
/* hover */ background: var(--surface-1); border-color: var(--rule-focus);
```

**Ghost / text link.**
```css
background: transparent;
color: var(--ink-high);
padding: 12px 0;
text-decoration: underline;
text-underline-offset: 6px;
text-decoration-thickness: 1px;
/* hover */ opacity: .7;
```

**Destructive.**
- Structural same as secondary; text color `--err`. Never use `--err` as a fill.

**Size ramp.**
| Size | Font | Padding | Radius |
| --- | --- | --- | --- |
| Small | 12/1 | 8×14 | `--radius-sm` |
| Default | 14/1 | 12×22 | `--radius-md` |
| Large | 15/1 | 14×26 | `--radius-md` |

Buttons are never pill-shaped by default (that visual is retired). If a pill button existed for a specific brand cue, remove the pill.

### 8.2 Cards

Structure, size, aspect ratio, image slot: unchanged.

- Background: `--surface-1`
- Border: `1px solid var(--rule)`
- Radius: `--radius-md` (default) or `--radius-lg` (hero) or `--radius-xl` (game tile)
- Padding: unchanged
- Shadow: **none**

Hover (only if the card is interactive):
- Background steps up to `--surface-2`
- No transform, no shadow
- Transition: `background var(--dur-fast) var(--ease-out)`

Elevated variant (e.g., live-match card):
- Background: `--surface-2`
- Adds a 2px arena rail on the left edge (see §8.6)

Retire the maroon promo washes on the two right hero cards. Replace with `--surface-1`. The "Welcome offer" gets a 2px `--casino` rail on its left edge; the "Weekly Race" gets no rail (Halo pearl in the progress bar is enough).

### 8.3 Chips, pills, badges

**Category chip (pill).**
```css
padding: 7px 14px;
border-radius: var(--radius-pill);
border: 1px solid var(--rule);
font: var(--text-body-s);
```
- Active: `background: var(--surface-2); color: var(--ink-high);`
- Inactive: `background: var(--surface-1); color: var(--ink-dim);`

Retire the current maroon "Lobby" active state.

**Arena chip (pill with dot).**
```html
<span class="arena-chip">
  <span class="dot" style="background: var(--casino)"></span>
  Casino
</span>
```
Structure identical for all three arenas. Dot: 6px, `border-radius: 50%`.

**Engraved data pill.**
```css
background: var(--surface-2);
color: var(--ink-high);
font: 500 10px/1 var(--font-mono);
letter-spacing: .14em;
text-transform: uppercase;
padding: 4px 9px;
border-radius: var(--radius-xs);
border-top: 1px solid rgba(255,255,255,.03);
border-bottom: 1px solid rgba(0,0,0,.5);
```
Applied to: `LIVE`, `MATCH.04128`, `ID 91.BTC`, `RTP 98.2`, promo codes, session IDs.

**State badge (delta).**
```css
padding: 4px 10px;
border-radius: var(--radius-sm);
font: 500 11px/1 var(--font-mono);
letter-spacing: .06em;
background: transparent;
border: 1px solid;
```
- Positive: `color: var(--ok); border-color: rgba(79,163,122,.4);`
- Negative: `color: var(--err); border-color: rgba(217,96,90,.4);`

**"New" ribbon badge.**
- `background: var(--halo); color: var(--ink-inverse); font: 500 10px/1 var(--font-mono); letter-spacing: .16em; text-transform: uppercase; padding: 4px 10px; border-radius: var(--radius-sm);`

### 8.4 Inputs

**Text input, number input, search.**
```css
background: var(--surface-0);
color: var(--ink-high);
border: 1px solid var(--rule);
border-radius: var(--radius-md);
padding: 12px 14px;
font: var(--text-body);
transition: border-color var(--dur-fast) var(--ease-out),
            box-shadow var(--dur-fast) var(--ease-out);
```
- Placeholder: `color: var(--ink-dim);`
- Focus: `border-color: var(--halo); box-shadow: 0 0 0 2px var(--halo-alpha-24);`
- Error: `border-color: var(--err); box-shadow: 0 0 0 2px rgba(217,96,90,.24);`
- Disabled: `background: var(--surface-1); color: var(--ink-quiet);`
- Trailing hint (`⌘K`): `font: var(--text-mono-xs); color: var(--ink-quiet);`

**Numeric input.** Same as text but content in `--font-mono`, right-aligned when it represents money.

**Textarea.** Same tokens, `min-height: 88px`, `resize: vertical`.

### 8.5 Toggles & segmented

**Toggle switch.**
- Track (off): `background: var(--surface-3); width: 36px; height: 20px; border-radius: 999px;`
- Knob (off): `background: var(--ink-dim); width: 16px; height: 16px; left: 2px;`
- Track (on): `background: var(--halo);`
- Knob (on): `background: var(--bg); right: 2px;`

**Segmented control.**
- Container: `background: var(--surface-0); border: 1px solid var(--rule); border-radius: var(--radius-md); padding: 3px;`
- Segment (selected): `background: var(--surface-2); color: var(--ink-high); border-radius: var(--radius-sm);`
- Segment (unselected): `color: var(--ink-dim);`

**Checkbox.**
- Unchecked: `20×20`, `background: var(--surface-0)`, `border: 1px solid var(--rule)`, `border-radius: 3px`.
- Checked: `background: var(--halo)`, `border-color: var(--halo)`, `color: var(--ink-inverse)` for the check glyph.

**Radio.**
- Same as checkbox but `border-radius: 50%`; checked shows an inner dot of `--halo` at 8px.

### 8.6 Rails (arena identifier)

Applied to the active branch surface — a page-level card, a nav item inside the current vertical, or the confirm-bet dialog when arena context is required.

```css
position: relative;
padding-left: 16px;
/* the rail element */
::before {
  content: "";
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 2px;
  background: var(--casino); /* or --pred / --sports */
  border-radius: 0 2px 2px 0;
}
```

One rail per screen at most.

### 8.7 Navigation — sidebar

Structure unchanged. Rekey:

- Section headings (PERSONAL, GAMES): `--text-label`, `color: var(--ink-quiet); margin-bottom: 8px;`
- Item at rest: `padding: 8px 12px; color: var(--ink-dim); border-radius: var(--radius-sm);`
- Item hover: `background: var(--surface-1);`
- Item active: `background: var(--surface-2); color: var(--ink-high);`
- Item icon: 22px line icon, `color: var(--ink-dim)` at rest, `--ink-high` when active
- Item count/badge on the right: `--text-mono-xs`, `color: var(--ink-quiet)`

Do not add the arena rail to sidebar items unless the app already tracks "active vertical" state. If unclear, skip.

### 8.8 Navigation — top bar

Structure unchanged. Rekey:

- Logo tile: `22×22`, `background: var(--halo)`, `border-radius: 5px`, glyph is a T at weight 500 in `--ink-inverse`.
- Wordmark: `--text-title-s` in `--ink-high`, `letter-spacing: -.015em`.
- Arena switch (Casino / Predictions / Sports): three pill chips (see §8.3, arena chip variant), gap 4px.
- Search field: `width: 340px`, background `--surface-0`, inline `⌘K` hint on the right in `--text-mono-xs`.
- Balance display: `--text-mono`, mono digits `--ink-high`, unit (`USDT`) in `--ink-dim`.
- Deposit / Wallet button: primary Halo.
- Avatar: `32×32`, `background: var(--surface-2)`, `border-radius: 50%`.

### 8.9 Dialog / modal

- Body: `background: var(--surface-2); border-radius: var(--radius-lg); padding: 32px; max-width: 540px;`
- Backdrop: `--overlay-modal` with `backdrop-filter: var(--overlay-blur);`
- Shadow: `--shadow-overlay`
- Close (X): 22px line icon, top-right, `--ink-dim`, hover `--ink-high`
- Title: `--text-title-m` in `--ink-high`
- Body copy: `--text-body` in `--ink-dim` (secondary) or `--ink-high` (primary)
- Actions area: right-aligned, `gap: 10px`, primary Halo on the right, secondary/outline on the left, ghost link as leftmost if any

### 8.10 Table (data grid)

- Header row: `--text-label`, `color: var(--ink-quiet)`, `padding: 10px 12px`, `border-bottom: 1px solid var(--rule)`
- Body row: `padding: 12px`, `border-bottom: 1px solid var(--rule-quiet)`, hover `background: var(--surface-1)`
- Cell numbers: `--font-mono`, tabular
- Cell text: `--text-body-s`
- Zebra: none — do not stripe
- Row selected: `background: var(--surface-2)`

### 8.11 Toast / notification

- Body: `background: var(--surface-2); border: 1px solid var(--rule); border-radius: var(--radius-md); padding: 12px 16px;`
- Shadow: `--shadow-toast`
- Icon slot: 22px line icon, color by state (`--ok`, `--warn`, `--err`, `--info`)
- Enter: slide from top 12px + fade over `--dur-medium` `--ease-out`

### 8.12 Empty state

- Icon: 32px line icon in `--ink-quiet`
- Title: `--text-title-s` in `--ink-high`
- Body: `--text-body-s` in `--ink-dim`, max-width `--container-sm`
- Actions: primary Halo if resolvable, ghost link otherwise
- Border (optional): `1px dashed var(--rule)` at `--radius-md`

### 8.13 Skeleton loader

- Background: `--surface-1`
- Shimmer: `linear-gradient(90deg, --surface-1 0%, --surface-2 50%, --surface-1 100%)` swept over 1200ms
- Never use color in the shimmer

### 8.14 Tooltip

- `background: var(--surface-4); color: var(--ink-high); font: var(--text-caption); padding: 6px 10px; border-radius: var(--radius-sm);`
- Shadow: `--shadow-overlay`
- Delay in: 400ms

### 8.15 Progress

- Track: `background: var(--surface-3); height: 3px; border-radius: 2px;`
- Fill: `background: var(--halo);` (default) or arena-specific in charts
- Height ramps: 2px (inline metadata), 3px (default), 6px (hero)

---

## 9. Iconography — specific replacements

| Current | Replacement |
| --- | --- |
| Filled yellow star | Line star, `--halo` when filled, `--ink-dim` when empty |
| Solid maroon "hot" badge | Engraved pill `LIVE` or `TRENDING` |
| Chunky wallet icon | Lucide `wallet` at 22px |
| Search magnifier (any style) | Lucide `search` |
| Bell notification | Lucide `bell`, dot indicator in `--err` when unread |
| Category icons in sidebar | Lucide equivalents; keep the same icon slot geometry |

---

## 10. Imagery

- Retain game tile artwork exactly as it is — games bring their own personality.
- Remove all maroon/red hero photography and washes on promo cards.
- No new photography introduced. If a promo genuinely needs a hero image later, use duotone (Halo → surface-2) of a still-life physical material (stone edge, brushed metal, court paint). Never fantasy render.
- Star favorite → line icon (see above).

---

## 11. Accessibility

- Every color pair listed in §1 has been verified for contrast on `--surface-1`. Do not use a text/background combo not present in this document without checking WCAG contrast.
- Interactive minimum size: 32×32.
- Focus ring is always visible on keyboard focus, never on click (`:focus-visible`).
- All icon-only buttons carry `aria-label`.
- Number values that flash on change use both color and an inline `▲` / `▼` glyph so color is not the only signal.
- Motion respects `prefers-reduced-motion`.

---

## 12. Content voice (secondary — only if copy needs a light pass)

Not the focus, but if copy touches occur:
- Sentence case
- Direct, product-first, no boasting
- "Connect wallet" not "🚀 Get Started!"
- "Confirm bet" not "SLAM IT IN"
- No emoji in chrome
- No superlatives ("best", "premium", "exclusive") in UI microcopy

---

## 13. Files a token drop should touch (project-agnostic)

| Framework | Likely target(s) |
| --- | --- |
| Tailwind | `tailwind.config.{js,ts}` (theme.colors, theme.fontFamily, theme.borderRadius, theme.spacing), global `@layer base` for @font-face |
| CSS-in-JS (styled-components / emotion) | Theme object export, usually `src/theme/index.ts` |
| CSS Modules / vanilla | `src/styles/tokens.css` or `:root` block in global.css |
| Design tokens JSON | `tokens/*.json` if using Style Dictionary or similar |
| Chakra / Radix | `theme.ts` or `stitches.config.ts` |

Update in that order:
1. Tokens file(s)
2. Font imports (Google Fonts link or self-hosted @font-face)
3. Base styles (`html`, `body`)
4. Component styles that reference tokens
5. Icons imported from a new library (aliased so JSX doesn't change)

---

## 14. Rules of engagement (reprise, non-negotiable)

1. Never touch layout, spacing, composition, hierarchy, routing, state, hooks, api calls, or business logic.
2. Never rename a token — only replace its value.
3. Never introduce a token not in this document.
4. Never introduce a new component, page, or route.
5. Never use warm brown / tan / leather tones anywhere.
6. Never use Inter in the product.
7. Never uppercase body copy.
8. Never use a shadow on a flat surface.
9. Never use a gradient in chrome.
10. Never use color as the only signal (see §11).
11. Never emit more than one Halo-filled button on a screen at once.
12. Never fill a card or background with arena color.
13. Never mix icon libraries.
14. If unsure, stop and ask — divergence is not authorized.

---

## Appendix A — Token dump (copy-paste)

```css
:root {
  /* Surface */
  --bg:         #0a0c10;
  --surface-0:  #0e1116;
  --surface-1:  #131720;
  --surface-2:  #1a1f2a;
  --surface-3:  #242a37;
  --surface-4:  #2e3543;

  /* Ink */
  --ink-high:    #eceef2;
  --ink-dim:     #8f97a8;
  --ink-quiet:   #545c6e;
  --ink-inverse: #0a0c10;

  /* Rules */
  --rule:        #242a37;
  --rule-quiet:  #1b2029;
  --rule-focus:  #e6e4da;
  --rule-danger: #d9605a;

  /* Halo (primary) */
  --halo:         #e6e4da;
  --halo-hover:   #f2f0e6;
  --halo-dim:     #b8b5a8;
  --halo-quiet:   #7a7869;
  --halo-alpha-24:#e6e4da3d;

  /* Casino */
  --casino:        #8b6dd0;
  --casino-light:  #b69ee8;
  --casino-deep:   #7454c0;
  --casino-alpha-12: #8b6dd01f;

  /* Predictions */
  --pred:        #4fa37a;
  --pred-light:  #7cc69a;
  --pred-deep:   #3d8562;
  --pred-alpha-12: #4fa37a1f;
  --pred-alpha-24: #4fa37a3d;

  /* Sports */
  --sports:        #5a87d4;
  --sports-light:  #8aaae4;
  --sports-deep:   #4670bf;
  --sports-alpha-12: #5a87d41f;

  /* Semantic */
  --ok:      #4fa37a;
  --ok-fg:   #7cc69a;
  --warn:    #d9a55a;
  --warn-fg: #e5bc7a;
  --err:     #d9605a;
  --err-fg:  #e58279;
  --info:    #5a87d4;

  /* Overlay */
  --overlay-modal:   rgba(10,12,16,0.72);
  --overlay-toast:   rgba(10,12,16,0.90);
  --overlay-loading: rgba(10,12,16,0.60);
  --overlay-blur:    blur(8px);

  /* Radii */
  --radius-none: 0;
  --radius-xs:   2px;
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   10px;
  --radius-xl:   14px;
  --radius-pill: 999px;

  /* Spacing */
  --space-2xs: 4px;
  --space-xs:  8px;
  --space-sm:  12px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --space-4xl: 96px;

  /* Motion */
  --ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:    cubic-bezier(0.7, 0, 0.84, 0);
  --ease-inout: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-instant: 80ms;
  --dur-fast:    120ms;
  --dur-medium:  200ms;
  --dur-slow:    320ms;
  --dur-flash:   400ms;

  /* Shadows */
  --shadow-overlay:      0 24px 48px -12px rgba(0,0,0,.7), 0 2px 4px rgba(0,0,0,.4);
  --shadow-toast:        0 12px 32px -8px rgba(0,0,0,.6), 0 1px 2px rgba(0,0,0,.4);
  --shadow-focus:        0 0 0 2px var(--halo);
  --shadow-focus-danger: 0 0 0 2px var(--err);

  /* Fonts */
  --font-display: "Söhne", "Onest", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-ui:      "Söhne", "Onest", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

## Appendix B — Tailwind mapping (if applicable)

```js
// tailwind.config.js — theme.extend
colors: {
  bg:        '#0a0c10',
  surface: {
    0: '#0e1116',
    1: '#131720',
    2: '#1a1f2a',
    3: '#242a37',
    4: '#2e3543',
  },
  ink: {
    high:    '#eceef2',
    dim:     '#8f97a8',
    quiet:   '#545c6e',
    inverse: '#0a0c10',
  },
  rule:     '#242a37',
  'rule-q': '#1b2029',
  halo: {
    DEFAULT: '#e6e4da',
    hover:   '#f2f0e6',
    dim:     '#b8b5a8',
    quiet:   '#7a7869',
  },
  casino: { DEFAULT: '#8b6dd0', light: '#b69ee8', deep: '#7454c0' },
  pred:   { DEFAULT: '#4fa37a', light: '#7cc69a', deep: '#3d8562' },
  sports: { DEFAULT: '#5a87d4', light: '#8aaae4', deep: '#4670bf' },
  ok:   '#4fa37a',
  warn: '#d9a55a',
  err:  '#d9605a',
},
fontFamily: {
  display: ['Söhne', 'Onest', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  ui:      ['Söhne', 'Onest', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  mono:    ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
},
borderRadius: {
  none: '0',
  xs:   '2px',
  sm:   '4px',
  DEFAULT: '6px',
  md:   '6px',
  lg:   '10px',
  xl:   '14px',
  pill: '9999px',
},
```

---

## Appendix C — Implementation deviations log (final product-language unification pass)

Per the "Product quality > visual consistency > simplicity > design system integrity > existing implementation > written design guide" authority ordering given for this pass, the following diverge from a literal reading of this spec. Each is a deliberate simplification, not an oversight.

**Typography — collapsed to one practical system, not the full §2.3 scale.**
The 18-row type scale (`--text-display-xl` through `--text-mono-xs`) was implemented as real CSS classes in an earlier pass, but only ever had 2-4 real call sites (a promo headline, a dialog title, one market question) — everything else in the app already used plain Tailwind (`text-lg font-bold`, etc.), which already renders in Onest at the same weight-500 cap. Maintaining two parallel systems for a handful of call sites was exactly the "several visual systems mixed together" problem this pass exists to remove. All real call sites were collapsed onto the one plain recipe; `.font-display-xl`, `.text-title-m`, `.text-title-s`, `.font-heading` and the now-unused `--font-display`/`--font-heading`/`--font-ui` tokens were deleted as dead code. A genuine hero/marketing moment (`--text-display-xl` at 96px) still doesn't exist anywhere in this app's audited surfaces — nothing was forced into that role.

**Promo card rail — removed entirely, not "Welcome Offer only."**
§8.2 says the Welcome Offer card keeps a 2px `--casino` rail and Weekly Race doesn't. In practice the rail read as a selected/focus/validation state or a rendering bug, not "this card is special" — so it's removed from both cards, and from the ONE shared `PromoCard` component all three arenas now render through (previously Casino's promo tile and Sports/Predictions' `ArenaPromoTile` were two separate implementations with different borders, backgrounds, CTA colors and focus rings).

**CTA color bugs fixed, not just promo cards.** Casino's on-chain "Place bet" buttons (`BetSwirlGame.jsx`, `GameLauncher.jsx`) and the game-launch "Try again" button were filled with `--casino-primary` instead of Halo — both are explicitly named in this doc's own §8.1 button table ("Place bet", "Confirm") as Halo CTAs. Fixed. Two text links (`GameInfoPanel.jsx`, `CasinoSearch.jsx`) used arena color as text color, banned by §1.5 rule 3 — fixed to neutral.

**Sports emoji → Lucide icons, approximate mapping.** Lucide (the icon library this app already uses everywhere else) has no soccer/tennis/basketball/baseball/football-specific glyphs. `Goal`/`CircleDot`/`Activity`/`Target`/`Shield` were chosen as distinct, reasonable line-icon stand-ins — not a literal per-sport match, since none exists in the installed set.

**Predictions rainbow blocks — flattened to neutral, not recolored.** The market-icon swatch (`bg-gradient-to-br ${market.hue}`, 8 arbitrary Tailwind gradient pairs in `predictionsData.js`) sat beside a Yes-chip and a No-chip using two more unrelated hues on the same card. Rather than pick a "correct" single hue, the swatch is now a plain neutral fill — the doc's own §1.5 arena-color rules don't have a placement for "a market's own decorative icon" at all, and a flat swatch is the more restrained reading of "everything else becomes quieter." Two genuinely stale hex values (`rgba(79,167,184,*)`, `rgba(214,90,112,*)` — a pre-recolor Predictions steel-cyan and an untokenized rose, both frozen into `MarketCard.jsx`/`OrderBook.jsx`/two decorative artwork SVGs since before Predictions moved to racing-green) were bugs, not decisions — fixed to `color-mix()` expressions derived from the live `--outcome-affirmative`/`--outcome-negative` tokens so they can't drift out of sync again.

**Design debt removed:** `src/lib/promoTitleParts.js` + its test (an abandoned mono-splitting experiment from an earlier calibration pass, superseded once promo headlines went back to plain text), the four dead CSS classes and three vestigial font tokens above, two pre-existing unused imports (`fmt` in `ActivityDialog.jsx`, `Clock` in `MarketCard.jsx`), and the string-icon branch in both `Sidebar.jsx`/`MobileFullScreenMenu.jsx`'s `ItemIcon` (dead once Sports' icons became Lucide components like every other arena's).

**Not touched this pass (flagged, not silently skipped):** a full app-wide sweep of every hand-rolled `<button>` onto the shared `ui/button.jsx` component (only the ones causing the reported CTA-color inconsistency were migrated); Casino's `CategoryNav` vs. Sports' in-page pill-tab styling divergence (cosmetically different recipes, not restyled — no Predictions equivalent exists at all); BetSwirlGame's face/number-picker selection-state fills and the native `<input type="range">` accent color (left as legitimate restrained interactive-state signals, same category as Sports' odds-button selected state).

*End of Appendix C.*
