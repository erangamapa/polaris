# Tribet Theme-Readiness

**⚠ SUPERSEDED (ONE-BRAND UNIFICATION).** The premise of this whole document — that Casino/Predictions/Sports would each get an approved, distinct "Branch" accent color dropped into §4 — did not happen. The product decision went the other way: Tribet is one brand color (`#10C7B2`) everywhere, no per-arena accent at all. The "Branch" layer (§4, `--casino-accent`/`--predictions-accent`/`--sports-accent` and friends) has been **deleted** from `src/index.css`, not filled in. See `docs/design/Tribet Reskin Guide.md`'s **Appendix D** for the authoritative current state (what was removed, what's kept for decorative artwork only, the Prediction Markets YES/NO exception). The rest of this document (Foundation/Semantic layers, §1–3, §5+) is still accurate — only §4 and any reference to a future per-arena palette are obsolete.

Status: **infrastructure only** — no final visual direction has been chosen or applied here. This document describes the token plumbing added so the eventual Figma-approved theme can be dropped in centrally, and inventories what's still hardcoded, placeholder, or inconsistent. It is not a design spec and contains no approved final colors beyond the three named brand identities (see §4).

## 1. Token Architecture

Four layers, smallest first, all living in `src/index.css` unless noted:

1. **Foundation** — raw neutral scale (`--neutral-950`…`--neutral-300`), elevation/shadow scale (`--elevation-*`), motion durations/easing (`--motion-*`/`--ease-*`, added in the prior motion-quality pass).
2. **Semantic** — background/surface/border/text/status roles. Mostly the *existing* shadcn tokens (`--background`, `--card`, `--popover`, `--secondary`, `--muted`, `--accent`, `--border`, `--ring`), extended with roles that had no home before this pass (`--surface-overlay-panel`, `--surface-interactive`, `--surface-tooltip`, `--surface-gameplay`, `--surface-inset`, `--border-subtle/standard/emphasized/interactive/selected/focus`, `--info`, `--pending`, `--outcome-affirmative`/`--outcome-negative`, `--danger-foreground`).
3. **Branch** — `--casino-accent`/`--predictions-accent`/`--sports-accent` (+ `-hover`/`-active`/`-muted`/`-subtle`/`-foreground`), aliased onto the existing `--casino-primary`/`--predictions-primary`/`--sports-primary` families rather than duplicating values.
4. **Component** — only where a shared component genuinely needs a stable contract: `--badge-*` (pre-existing), `--surface-game-card`/`--surface-game-card-fallback` (new, CasinoGameCard), `.text-label` (new, the one verbatim-repeated typography pattern).

New color tokens are also registered in Tailwind's `@theme inline` block, so they're real utility classes (`bg-surface-raised`, `text-outcome-affirmative`, etc.), not just `var()` references — the same mechanism `--color-background`/`--color-card` already used.

## 2. Foundation Roles

| Token | Value | Role |
|---|---|---|
| `--neutral-950`…`--neutral-300` | zinc-equivalent hex | Named stops matching the ~190 `bg-zinc-*`/`text-zinc-*` utilities already in use, so semantic roles have something to point at |
| `--elevation-none/low/medium/high/focus` | `none` / shadow values | Named the handful of box-shadows already shipping (Toaster card, Dev Panel edge) |
| `--motion-fast/standard/layout`, `--ease-out/emphasized` | ms / cubic-bezier | Carried over unchanged from the motion-quality pass — see §16 |

## 3. Semantic Roles

Surface: `--surface-base` (=`--background`), `--surface-raised` (=`--card`), `--surface-overlay-panel`, `--surface-interactive`(+`-hover`), `--surface-tooltip`, `--surface-gameplay`, `--surface-inset`.
Border: `--border-subtle/standard/emphasized/interactive/selected/focus`.
Status (independent of branch — see §13): `--success`/`--warning`/`--danger` (pre-existing) + `--info`, `--pending`, `--danger-foreground` (new).
Outcome/direction (a third category, distinct from both branch and win/loss status): `--outcome-affirmative`/`--outcome-negative` — Predictions' Yes/Bid vs. No/Ask, Sports odds' down-movement.

## 4. Branch Roles

```
--casino-accent / -hover / -active / -muted / -subtle / -foreground
--predictions-accent / -hover / -active / -muted / -subtle / -foreground
--sports-accent / -hover / -active / -muted / -subtle / -foreground
```

**Current values are TEMPORARY** — the existing rose/steel-cyan/chartreuse accents, not the approved future palette. The approved future identities are:

- Casino → **ultraviolet**
- Predictions → **racing green**
- Sports → **cobalt blue**

These are **not applied anywhere in this pass**. See §14 for how to apply them later.

## 5. Component Roles

`--badge-neutral/live/attention/pending/success/muted` (pre-existing, StatusBadge). `--surface-game-card`/`--surface-game-card-fallback` (new — CasinoGameCard's own surface, kept distinct from `--card` since the exact hex differs and merging them is a design decision, not this pass's to make). `.text-label` (new — the uppercase/tracking-wide section-label pattern, 5 verbatim call sites consolidated).

## 6. Active-Arena Application

The active arena was **already** tracked as a single source of truth before this pass — `product` state in `App.jsx`, reflected onto the root shell via `data-product={product}`, with `index.css`'s `[data-product="casino"|"predictions"|"sports"]` blocks mapping it to `--product-*` CSS variables (already existed, not new).

This pass adds `data-arena={product}` as an **alias on the same attribute value** (not a second state store — `App.jsx`'s root div now carries both `data-product` and `data-arena`, both reflecting the identical `product` value). `data-product` stays because existing CSS selectors and two component comments (`ArenaPromoTile.jsx`, `PromoStrip.jsx`) already reference it by that name; `data-arena` exists to match this task's requested vocabulary and as the preferred name for new consumers going forward.

## 7. Dark-Theme-Only Reality

`index.html` hardcodes `<html class="dark">` — this is unconditional; there is no toggle and none was added. `index.css`'s `:root { --background: oklch(1 0 0); ... }` block (shadcn's default generator output) defines LIGHT-theme values that are **completely overridden** by the later `.dark { }` block on the same element (both target `:root`/`<html>`, equal specificity, `.dark` wins by source order) — meaning **the light values are inert, unreachable scaffolding today, not a working, supported light theme**. No light-theme values were removed (low value, some risk, not asked for) but this reality is now documented so a future contributor doesn't assume light mode already works because the block exists.

## 8. Placeholder Inventory

| Item | Classification |
|---|---|
| Per-market/per-game "hue" gradient fallback data (`lib/mockData.js`, `lib/predictionsData.js`) | Acceptable for prototype — deliberately varied per-item for visual distinction in a grid; not a design-system candidate |
| Game card artwork (`game.image`) | Production-ready mechanism (real `<img>`, lazy-loaded, broken-image fallback to a neutral icon tile) — the *art itself* may still be placeholder imagery, not evaluated here |
| Hero/promo art (`.hero-bg--fallback` gradient) | Acceptable for prototype / must replace before public launch — an explicit CSS gradient fallback, not real hero photography |
| `ActivityDialog.jsx` arena chip colors | Technical/developer-adjacent inconsistency (see §13) — not user-facing placeholder content, but a real color-system debt item |
| Testnet language (~11 files reference "testnet"/"Testnet") | Production-ready *for a testnet build* — must be revisited before any mainnet/public-launch copy pass, not before internal team presentation |
| Provider references (`ProviderTiles`, dormant Providers category) | Technical/developer-only — already documented elsewhere as intentionally dormant, not user-visible today |
| KYC modal (`KycModal.jsx`) | Technical/developer-only, intentionally dormant per prior session's audit — not rendered anywhere; do not treat as a placeholder to "finish," it's a documented future-phase placeholder |
| Mock/dev-panel account and balance states | Developer-only, gated behind the Developer Panel, not visible without deliberately opening it |

Nothing was deleted, hidden, or invented as part of this classification — this is a report, not a cleanup.

## 9. High-Visibility Components To Redesign After Figma Approval

In priority order (matches this task's own replacement-priority list): global shell (TopBar/Sidebar/MobileBottomNav/MobileFullScreenMenu), Casino game cards + rails + category pills, shared dialogs/sheets (`ui/dialog.jsx` consumers), status badges, toasts, Developer Panel, gameplay frame. All now read from named tokens rather than scattered raw hex, so a redesign pass should mean editing `index.css` first, then spot-checking components — not hunting through every feature file.

## 10. Migration Rules

- Prefer an existing semantic/branch/component token over a new one.
- Never introduce a brand-new raw hex/rgba in a component file without checking whether a token already covers that role.
- Branch color is for **active arena navigation, section markers, selected states, focus accents, small branded moments** — never the app background, never every button/card/border in an arena (see §13's global-shell-vs-arena boundary — this was already true before this pass and remains true).
- Status colors (`--success`/`--warning`/`--danger`/`--info`/`--pending`) must never be replaced by a branch token, even when a branch happens to share a hue coincidentally today (see `--info` in §3 — it used to silently equal the Predictions accent; that coupling is now broken on purpose).
- When a raw color doesn't exactly match an existing token's value, do not force it onto that token if doing so would visibly change contrast — add a new, precisely-matched token instead (see `--surface-game-card` vs. `--card`, or leave it as a documented remaining-debt item).

## 11. Examples

**Correct:**
```jsx
// Branch-tinted selected state, using the alias layer
style={{ background: "color-mix(in srgb, var(--casino-accent) 16%, transparent)", color: "var(--casino-text-accent)" }}

// Status color, independent of branch
className="text-[var(--danger)]"

// Component-role surface
className="bg-surface-game-card"
```

**Incorrect (what this pass removed):**
```jsx
// Branch color hardcoded a second time instead of referencing the token
{ background: "rgba(184,92,142,0.16)", color: "#D99AB9" }

// Status color coincidentally copied from a branch token's exact hex
{ color: "#4FA7B8" } // was meant to mean "info", not "Predictions"
```

## 12. Known Remaining Visual Debt

- ~190 raw `bg-zinc-*`/`text-zinc-*` utility usages remain unmigrated (the neutral foundation scale now names their values, but individual call sites weren't swapped — doing so blindly would be exactly the "blind global search-and-replace" this task was told not to do; each one needs its semantic role judged individually).
- ~15 bare numeric `z-*` utilities remain unmigrated onto the newly-documented z-index scale (§17) — two were migrated as a worked example (`GameInfoPanel.jsx`, `CasinoRoundReceipt.jsx`).
- `OddsButton.jsx` and a few Predictions components use several one-off opacity variants of branch/status colors (e.g. `rgba(175,195,74,0.12)` vs. the shared `--sports-primary-soft`'s `0.14`) that don't exactly match existing tokens — left as literal values rather than force a small contrast change.
- **`ActivityDialog.jsx`'s arena chip colors (`#5eead4`/`#c4b5fd`/`#fcd34d`) do not match Sidebar/MobileBottomNav's arena accent colors** — a genuine, pre-existing inconsistency between two independent "what color is this arena" implementations, now named as tokens (`--activity-chip-*`) but deliberately **not** merged onto the main branch accent, since resolving that mismatch is a design decision for the Figma pass, not an engineering one made silently here.
- Radius/shadow/backdrop-blur values are already on Tailwind's standard scale (no arbitrary bracket values found) but are chosen inconsistently per-component (e.g. `rounded-lg` vs `rounded-xl` for similar-role surfaces) — documented as a convention question for the real pass, not changed here.
- Typography roles beyond `.text-label` (page title, section title, numeric primary/secondary, etc.) are documented as *conventions* in `index.css`'s comments, not enforced via new classes — intentional, per "do not over-abstract every text node."

## 13. Status vs. Branch — The Boundary

Confirmed and preserved: a Casino win still uses `--success`, not ultraviolet. An error is `--danger`, never accidentally branch-tinted. The one place this boundary was previously blurry (`--info` coincidentally equaling the Predictions accent hex) is now fixed — see §3, §10.

## 14. How To Apply The Future Chosen Theme

1. Edit the **BRANCH** block in `index.css` (§4) — `--casino-accent`, `--predictions-accent`, `--sports-accent` and their `-hover`/`-active`/`-muted`/`-subtle`/`-foreground` siblings — to the approved ultraviolet/racing-green/cobalt-blue values (and their `-text-accent`/`-cta-text`/`-primary-*` source variables, which the accent block aliases).
2. Re-check contrast for every `-foreground`/`-cta-text`/`-text-accent` pairing against the new base hues (a dark-on-light-purple text color that worked for rose may not work for ultraviolet).
3. Decide, at that point, whether `ActivityDialog.jsx`'s independent chip colors (§12) should be merged onto the new branch tokens or kept distinct on purpose.
4. Only then consider whether Foundation-layer neutrals, elevation, or radius should change — those are intentionally separate from branch color and were not touched by the branch swap.
5. Re-run the visual-regression Playwright script (`scripts/verify-theme-tokens.mjs`, once Playwright is available in this environment — see the final report) against Lobby, dialogs, gameplay, and both Full-mode arenas to catch anything the token layer didn't anticipate.

## 15. Motion Tokens (carried over, not duplicated)

`--motion-fast` (110ms), `--motion-standard` (200ms), `--motion-layout` (280ms), `--ease-out`, `--ease-emphasized` — defined once in the prior motion-quality pass, reused as-is here (e.g. the new `color-mix()` branch accents don't introduce a second timing system; nothing added in this pass duplicates a duration/easing constant).

## 16. Z-Index System

See `index.css`'s own "THEME READINESS: full documented z-index scale" comment for the complete, numbered reference (base→sticky→card-action→local-dropdown→header→dialog/gameplay→game-info→sports-sticky-cta→transaction-overlay→critical-alert). Developer Panel's layering (topmost, `--z-critical-alert` = 100) and Game Info's requirement to sit above gameplay (`--z-game-info` = 70 > gameplay's 50) are both preserved exactly as they were; no numeric value changed.
