# StatusBadge — the one badge system

One shared component for every compact status/count in the product: live
sports counts, betslip selections, wallet alerts, pending transactions,
inbox notifications, Favorites, open positions, rewards, claimable bonuses —
everything. Before this, expanded and collapsed sidebar nav used two
unrelated badge styles for the same "live" meaning (a dark-red outlined
pill with a dot in expanded, a solid yellow circle in collapsed). This
component makes that impossible going forward: one component, six semantic
variants, two sizes, nothing else.

Component: `src/components/ui/status-badge.jsx`
Tokens: `src/index.css`, the `--badge-*` block (search `StatusBadge —
semantic, not arena-based`)

Do not build feature-specific badges (`LiveBadge`, `WalletBadge`,
`BetslipBadge`, `InboxBadge`, `FavoritesBadge`, ...). Use `StatusBadge`
everywhere with a semantic `variant`.

## Ownership split

- **StatusBadge owns:** shape, radius, typography, spacing, count
  formatting (0 hides / 99+ caps), icon rendering, size variants, color
  tokens, the count-change pulse.
- **The parent owns:** where the badge sits (absolute top-right on an icon
  button, `margin-inline-start: auto` in a flex row, etc.), tooltip wiring,
  and *which* variant/count is semantically correct for that surface.

Never bake feature-specific absolute positioning into `StatusBadge` itself
— it has no opinion on where it's placed, only on what it looks like once
placed.

## Props

```
variant     "neutral" | "live" | "attention" | "pending" | "success" | "muted"   default "neutral"
count       number | undefined     0 hides the badge; >99 renders "99+"
label       string                 a short visible string instead of a count
                                    (e.g. a live-clock label); wins over count
icon        "dot" | "warning" | "clock" | "check" | "gift"
size        "small" | "medium"     default "medium"
showIcon    boolean                default true
ariaLabel   string (required)      the badge's ONLY announced text
className   string                 positioning/placement escape hatch
```

(This repo is plain JS/JSX, not TypeScript — the shapes above are the
contract; `ariaLabel`'s absence logs a dev-only console warning rather than
a type error.)

## Semantic mapping — which variant, when

| Variant | Meaning | Examples |
|---|---|---|
| `neutral` | ordinary count, nothing urgent | betslip selections, Favorites, inbox unread, saved games, open positions |
| `live` | active right now | live sports events, live prediction markets, active live tables/broadcasts |
| `attention` | user action required | wallet action required, unsupported network, failed tx, odds changed, urgent inbox, KYC required |
| `pending` | in progress | deposit confirming, withdrawal processing, pending bet, unresolved tx |
| `success` | positive, claimable, or needs acknowledgment | reward available, claimable bonus, cashback credited |
| `muted` | low-priority, resolved, informational | archived items, resolved items, non-interactive totals |

Colour is semantic, not arena-based. A `live` badge is coral on Casino,
Sports, *and* Predictions — never "Sports yellow" or "Casino pink" just
because of which arena renders it.

## Sizes

Only two — don't invent a third for a specific feature.

- **small** (20px, 11px text) — collapsed sidebar rail, icon buttons, dense
  mobile controls.
- **medium** (24px, 12px text) — expanded sidebar rows, standard lists,
  filters, wallet/inbox surfaces.

## Count logic

- `count={0}` → badge renders nothing (`null`), not an empty pill.
- `count` left `undefined` (loading/unknown) → never shown as a fake `0`;
  if `icon` is also given, that renders alone (icon-only state); otherwise
  nothing renders.
- `count > 99` → renders `99+`.
- Numerals are tabular (`font-variant-numeric: tabular-nums`) so the digit
  glyphs don't shift width as the value changes.

## Animation

A `count` increase triggers one ~180ms scale pulse — no bounce, no glow, no
continuous animation. Rapid successive increases (a live counter ticking
every few seconds) are cooldown-gated to at most one pulse per 1.2s, so
polling never turns into a strobing badge. `prefers-reduced-motion` is
respected globally (see the `@media (prefers-reduced-motion: reduce)` block
in `index.css`) — the value still updates, just without the animation.

## Accessibility

- `ariaLabel` is the badge's *only* announced text. All visible content
  (count, label, icon) is `aria-hidden` on the DOM, so a screen reader
  never announces a bare "3" — it announces `ariaLabel`, e.g. `"3 betslip
  selections"`.
- Icon-only badges (e.g. `variant="attention" icon="warning"` with no
  count) still require `ariaLabel` — the icon alone is not accessible.
- Colour is never the only signal: `live`/`attention`/`pending` all pair
  their tint with an icon (dot/warning/clock) as a second channel.
- Contrast: every `*-text` token against both `--background` and `--card`
  was checked ≥4.5:1 (WCAG AA, normal text) when this was built.

## Do

```jsx
// Sidebar, expanded — live sports count
<StatusBadge
  variant="live"
  size="medium"
  icon="dot"
  count={liveCount}
  ariaLabel={`${liveCount} live Soccer events`}
  className="ms-auto"
/>

// Sidebar, collapsed — same meaning, same variant, smaller size, badge
// anchored by the PARENT (RailIcon), not by StatusBadge itself
<span className="absolute -end-1 -top-1">
  <StatusBadge variant="live" size="small" icon="dot" count={liveCount} ariaLabel={`${liveCount} live Soccer events`} />
</span>

// Favorites — neutral, no dot, hidden at zero
<StatusBadge variant="neutral" count={favorites.size} ariaLabel={`${favorites.size} favorites`} />

// Betslip — neutral normally, attention when odds changed (same slot, only
// the variant changes — the badge never moves)
{hasPendingOdds ? (
  <StatusBadge variant="attention" icon="warning" count={pendingCount} ariaLabel={`${pendingCount} selections with updated odds`} />
) : (
  <StatusBadge variant="neutral" count={selections.length} ariaLabel={`${selections.length} betslip selections`} />
)}

// Wallet — pending deposit
<StatusBadge variant="pending" icon="clock" count={1} ariaLabel="1 pending deposit" />

// Wallet — claimable reward
<StatusBadge variant="success" icon="gift" count={1} ariaLabel="1 reward available" />

// Wallet — unsupported network (icon-only, no count)
<StatusBadge variant="attention" icon="warning" ariaLabel="Unsupported network — action required" />
```

## Don't

- Don't create `LiveBadge`/`WalletBadge`/`BetslipBadge`/etc. — one
  component, semantic `variant` prop.
- Don't pick a variant by arena colour ("this is Sports so it should be
  yellow"). Pick it by *meaning* (live/attention/pending/success/neutral/muted).
  Yellow does not exist in this system at all as of this migration.
  ["Coming soon" tile-corner tags on game cards are a separate, unrelated
  pattern — a status label baked into card art, not a notification badge —
  and are intentionally out of this system's scope.]
- Don't pass `count={0}` and expect a visible "0" — it hides.
- Don't invent a third size. If neither `small` nor `medium` fits, that's a
  sign the badge is being asked to do too much (see "Critical vs
  non-critical" below).
- Don't move a badge's position when its variant/meaning changes (betslip
  odds-changed example above) — same anchor, only the look changes.
- Don't try to encode a full explanation into the badge. A badge signals
  "this needs attention" or "here's a count" — the explanation belongs in a
  tooltip, popover, or the relevant panel (wallet, betslip, inbox).

## Migration performed

| File | Before | After |
|---|---|---|
| `src/components/shell/Sidebar.jsx` | Expanded: `<Badge>` outline pill (dark-red dot+count for live, gray outline for Favorites count). Collapsed: ad hoc `bg-amber-400 text-black` circle for *both* live and Favorites. | `<StatusBadge variant="live" icon="dot">` for live counts, `<StatusBadge variant="neutral">` for Favorites, in both expanded (`size="medium"`) and collapsed (`size="small"`) — same component, same semantic colour, size is the only thing that changes between the two rail modes. |
| `src/components/sports/EventRow.jsx` | Per-event `<Badge>` with a hardcoded `rgba(214,90,112,...)` red pill + `Radio` icon + "Live · {clock}" text. | `<StatusBadge variant="live" icon="dot" label={...}>` — same visual language as the sidebar's live badge, sourced from the shared token instead of a hardcoded rgba() duplicate. |
| `src/components/sports/BetSlip.jsx` | Selection-count circle hardcoded to `bg-[var(--product-primary)]` — i.e. whichever arena colour happened to be active (an explicit anti-pattern this system rules out). | `<StatusBadge variant="neutral">` normally; swaps to `<StatusBadge variant="attention" icon="warning">` (same slot, count of affected selections) when any selection's odds changed. |

### Reviewed, not migrated (by design)

- `src/components/ui/badge.jsx` (the generic shadcn `Badge` primitive) is
  untouched and still used for content/category tags — league name, market
  category, KYC status, RG limits, Yes/No outcome labels
  (`EventDetail.jsx`, `MarketDetail.jsx`, `AccountDialog.jsx`,
  `ResponsibleGamblingDialog.jsx`, `PositionsTable.jsx`). Those are
  classification chips, not status/count notification badges — a different
  concern, correctly kept separate.
- `CasinoCatalog.jsx`'s "Coming soon" tile-corner tag is a status label
  baked into game-card art, not a notification badge, and game cards are
  explicitly out of scope for this task.
- `PositionsTable.jsx`'s settled/open state is currently a plain text
  suffix ("· settled") with no manual claim action in this app (settlement
  is automatic) — badging it would be decoration without a real "does this
  need my attention" question behind it, which the spec explicitly warns
  against. Left as-is; revisit if/when a real claim flow exists.

### Not yet wired up (no real surface exists)

Wallet alerts, pending-transaction indicators, inbox notifications, and
reward/claimable-bonus badges are **not implemented anywhere in the app
today** — there's no inbox feature, no wallet-alert system, and no
rewards/bonus system to attach a badge to yet (`useGeoCheck()` and similar
are stubs). `StatusBadge`'s `pending`, `attention`, and `success` variants
are built, token-verified, and documented above so that whenever those
surfaces get built, they use this system from the start instead of
inventing a new pattern.
