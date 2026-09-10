# AGENTS.md — TriBet

Guidance for AI agents (and humans) working in this repo. Read this before adding a game.

## New here? Get a funded wallet first
You cannot place a bet without a testnet wallet. Run the **`setup-test-wallet`**
skill (`.claude/skills/setup-test-wallet/`) and it will walk you through it
interactively: generate a throwaway key → import it into MetaMask → faucet funds
→ verify on-chain → connect and play. Agents: invoke that skill rather than
improvising wallet setup, and never hand a human a seed phrase (see its rules).

## What this is
TriBet is a **fully on-chain, non-custodial** three-in-one app: **Casino**, **Sports**, **Predictions**.
- **Casino** = on-chain games via **BetSwirl** (Chainlink VRF) **+** embedded **provider games** (vendored static apps).
- **Sports** = **Azuro** protocol.
- Wallet connect = **Reown AppKit + wagmi/viem**. Brand name lives in `src/lib/brand.js` (`BRAND_NAME = "TriBet"`).

Stack: React 19 + Vite, Tailwind. Web3 code in `src/web3/`. Thin backend = Vercel functions in `api/`.
Shared chain/protocol config = `packages/shared/chains.js` (imported via `@shared`).

## Golden rules
- **Never commit secrets.** Seeds/keys live only in gitignored `.secrets/` and `.env.bootstrap`. Reference env vars by name.
- **Brand is always "TriBet"** — never reintroduce old names. Use `BRAND_NAME` from `@/lib/brand`.
- **Keep it building.** Run `npm run build` and `npm run lint` before committing; both must be green.
- Match surrounding code style (single quotes, semicolons, `data-test-id` not `data-testid`).
- **Push straight to `main`, and deploy from `main`.** Do NOT create pull requests or feature branches unless explicitly asked. When work is done, commit to `main`, push, and let the Vercel Git integration deploy production.

---

## Adding a game — pick ONE of two paths

There are two kinds of casino games. Choose by what you have.

### Path A — Provider game (a self-contained web app: HTML/JS/whatever)
Use this for a standalone game you can drop in and run in an iframe (like `vector-crash`, `vector-dice`).
It loads **on demand** (only when the tile is clicked) via a sandboxed iframe.

1. **Add the game files** to a new folder:
   `public/games/<slug>/` — must contain an `index.html` entry (plus its JS/CSS/assets).
   Vite serves `public/` at the web root, so the game is reachable at `/games/<slug>/index.html`.
   Vendor only what the game needs — do **not** copy `node_modules`, tests, or zips.

2. **Add a tile image** to `public/img/games/<slug>.svg` (or `.webp`/`.png`).
   Convention: portrait **3:4**, show the **game name** + **"TRIBET STUDIO"** at the bottom
   (see `public/img/games/nova-wheel.svg` as the template).

3. **Register the game** in `src/components/casino/ProviderGame.jsx` → `PROVIDER_GAMES`:
   ```js
   { key: "<slug>", title: "My Game", src: "/games/<slug>/index.html",
     badge: "TriBet Studio", image: "/img/games/<slug>.svg" }
   ```
   That's it — the casino lobby's **Provider games** section renders it and the
   `ProviderGame` iframe modal opens it on click. No other wiring needed.

4. (Optional, "Level 2") To make the game bet from the real wallet / settle on-chain,
   add a `postMessage` bridge: the game posts `{type:'bet', amount}` to `window.parent`,
   TriBet places the on-chain bet and posts the result back. The hook point is the
   `<iframe>` in `src/components/casino/ProviderGame.jsx`.

### Path B — On-chain BetSwirl game
Use this for a BetSwirl-supported game type (dice, coin-toss, roulette, keno, wheel, plinko).

1. **Add a tile image** to `public/img/games/<key>.webp` (portrait 3:4).
2. **Register** in `src/web3/useBetSwirl.js` → `BETSWIRL_GAMES`:
   ```js
   { key: "<betswirl-game-key>", title: "Roulette", image: "/img/games/roulette.webp",
     playable: true, control: "roulette" }
   ```
3. **Wire the bet + controls** in `src/web3/useBetSwirl.js` (`play()` dispatch) and
   `src/components/casino/BetSwirlGame.jsx` (`GameControls` for the `control` type).
   The on-chain contract addresses are pinned in `packages/shared/chains.js` (`betswirl.games`).

> Custom "weighted" games (your own wheel/plinko/slot payout tables) use BetSwirl's
> `custom-weighted-game` contract — no new contract or approval needed.

---

## How a game reaches the Casino page (the launch flow)
```
src/App.jsx  →  <CasinoLobby> renders <CasinoCatalog>
CasinoCatalog (src/components/casino/CasinoCatalog.jsx)
  ├─ BETSWIRL_GAMES  → tile onClick → onLaunchOnchain(game)  → App: setOnchainGame  → <BetSwirlGame> modal
  └─ PROVIDER_GAMES  → tile onClick → onLaunchProvider(game) → App: setProviderGame → <ProviderGame> iframe modal
```
- App state: `onchainGame` / `providerGame` in `src/App.jsx`.
- To add a whole new *section*, edit `CasinoCatalog.jsx`.

## Directory map (where things live)
| Path | What |
|---|---|
| `public/games/<slug>/` | vendored provider game apps (served static, iframed) |
| `public/img/games/` | game tile art (svg/webp) |
| `src/components/casino/CasinoCatalog.jsx` | the casino lobby grid (both game sections) |
| `src/components/casino/ProviderGame.jsx` | `PROVIDER_GAMES` list + iframe modal |
| `src/components/casino/BetSwirlGame.jsx` | on-chain game modal + controls |
| `src/web3/useBetSwirl.js` | `BETSWIRL_GAMES` list + on-chain bet flow |
| `src/web3/` | wallet, Azuro, config |
| `packages/shared/chains.js` | pinned chains/contracts/tokens |
| `api/` | Vercel serverless functions (balance/history/bet-prepare, settings, SIWE auth) |
| `packages/shared/playerSettings.js` | player-settings schema + normalisation (imported by BOTH client and server) |
| `packages/shared/siwe.js` | SIWE (EIP-4361) message build/parse |
| `src/lib/usePlayerSettings.jsx` | the one store every persisted player setting reads/writes through |

---

## Modal / Dialog System

`src/components/ui/modal.jsx` is the one convention every popup should compose
— wallet, deposits/withdrawals, confirmations, success/error/warning states,
game info, reports, account settings, session states. It wraps
`src/components/ui/dialog.jsx` (Radix Dialog primitives: surface, backdrop,
radius, shadow, focus trap are already correct there — see its own tokens)
rather than reimplementing chrome. `src/components/wallet/FundsDialog.jsx` is
the reference implementation — read it before building a new popup.

**Anatomy:** `ModalHeader` (`ModalTitle` + optional `ModalDescription`) →
body content → `ModalFooter` (actions).

**Sizes** (`ModalContent`'s `size` prop):
| size | dimensions | height | use for |
|---|---|---|---|
| `transactional` | `sm:w-[420px]` | fixed `~400px` (viewport-clamped) | a multi-step STATE MACHINE where several screens share one mounted Dialog — wallet, deposit/withdraw flows, any confirm→success/error sequence. **Default for this shape of flow.** Compact portrait proportions (narrower than tall), not a landscape panel. |
| `sm` | `sm:max-w-md` (~448px) | content-driven | a single one-shot confirmation/success/warning/error with no sibling states |
| `md` | `sm:max-w-xl` (~576px) | content-driven | forms / small account flows |
| `lg` | `sm:max-w-2xl` (~672px) | content-driven | content-heavy detail views (reports, account settings) |

`transactional` is the one deliberately fixed-height size — every state in
that flow composes its content with `flex-1`/`justify-center` to fill the
shell intentionally (see `FundsDialog.jsx`'s three bodies) rather than
top-pinning content over dead space. `sm`/`md`/`lg` stay content-driven
(`DialogContent` caps at `max-h-[86vh]` with internal scroll for anything
long) — reach for one of those only when a dialog's own content genuinely
needs more room, not because a flow's tallest step made a shared
`transactional` shell feel cramped.

**Semantic variants** (`ModalIcon`'s `variant` prop: `neutral` / `success` /
`warning` / `destructive` / `error`) tint only a small icon chip via
`--success` / `--warning` / `--danger`. **The modal surface itself never
changes color** — no tinted backgrounds, no colored borders on the shell.

**Close button (`dismissible` prop):** show the X only when the dialog has
no explicit decision control of its own. A confirmation with Cancel/Confirm,
or a success screen with Continue, passes `dismissible={false}` — the
explicit action is the exit path, not a redundant X. A freely-dismissible
detail view (the main Wallet screen) keeps it.

**Two-button destructive confirmations:** equal-width, equal-height buttons
(`ModalFooter className="grid grid-cols-2"`), neutral secondary style on
Cancel, `text-[var(--danger)]` (never a filled red button, never
`--favorite-heart` — that coral is a different semantic concept) on the
destructive action. Filled red is reserved for exceptionally strong
emphasis, which nothing here has needed yet.

**Success states:** a small circular tinted icon chip (`ModalIcon
variant="success"`) next to short supporting copy, same title size as any
other modal of that size — never a large illustration, never a bigger
headline than a same-size confirmation gets.

**Escape/backdrop/X** all route through one `onOpenChange` handler on the
Dialog root — keep them behaving identically to whichever exit action they
map to (Cancel-equivalent for a confirmation, Continue-equivalent for
success), never silently bypassing a flow that has an explicit completion
action.

**Responsive:** mobile-first by default (`w-full` below `sm:`, capped
`max-w-*` above) — no separate mobile-only modal pattern. Two-button
footers may need to stack vertically below the width where equal columns
get cramped; keep the neutral action first, destructive second.

**Migrating an existing dialog:** don't do it reflexively. `ComplianceBlockDialog`
and `SupportDialog` are already close (single message/`sm`, link list/`md`)
and are good near-term candidates. `AccountDialog`, `ResponsibleGamblingDialog`,
`BetHistoryDialog`/`ActivityDialog` are tabbed or list-heavy and need real
review, not a mechanical swap. `AzuroBetSlip`/`DemoBetSlip`/`PositionTicket`
have their own interaction model (stake input, live odds) — treat those as a
separate design pass, not a drop-in.

## Per-player settings (persisted per wallet)

There is **no login screen and no password** — the connected wallet is the
identity. Settings are stored one JSON blob per lowercased address.

**How it works.** Local-first: `localStorage` answers the first frame, the
server is the durable cross-device copy, and the two reconcile by whole-blob
last-write-wins. The player is **never** prompted to sign on connect. One
wallet signature (SIWE) is requested the first time they *change* a setting
with no live session; declining keeps everything working locally and is never
re-prompted automatically.

```
change a setting -> localStorage + UI immediately (optimistic)
                 -> debounced 800ms -> PUT /api/settings (session cookie)
                 -> 401? one SIWE signature, then retry once
```

**Adding a setting:** add it to `DEFAULT_SETTINGS` in
`packages/shared/playerSettings.js` and give it a case in `normalizeSettings`
(that function is the trust boundary — the server runs it on untrusted PUT
bodies). Then read/write it via `usePlayerSettings()`'s
`settings` / `updateGroup(group, patch)`. Do **not** add a new localStorage key.

**Honesty rule — read this before adding a Responsible Gaming control.**
Persisting a setting is not enforcing it. `realityCheckMinutes` is genuinely
enforced (`src/lib/useRealityCheck.js` runs a real timer); deposit and loss
limits are saved only, and the UI says so on the control itself. Cool-off and
self-exclusion are deliberately absent — those are the two where "saved but not
enforced" actively harms a player who believes they are protected. Do not add a
control the app cannot honour.

**Environment variables** (all optional — with none set the app runs fully, on
a per-process in-memory store, and tells the player their settings are
device-only rather than claiming a save):

| Var | What it does |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `SESSION_SECRET` | HMAC key for session cookies. Unset = a random per-process secret, so sessions die on restart |

Upstash **eviction must stay disabled** — it is a store of record here, and
eviction would silently drop the settings of any player who hasn't visited
recently.

## Verify & ship
```bash
npm run build     # must pass
npm run lint      # must pass (exit 0)
```
- Push straight to `main` (see Golden rules — no PRs/branches).
- When committing, always use a single-line `git commit -m "message"` (no heredocs, no multi-line messages via `$(cat <<EOF...)`).
- Deploy is automatic: pushing to `main` ships to **production** via the Vercel
  Git integration. `vercel --prod` still works, but you rarely need it — assume
  a push is a release.

Live: https://playtribet.vercel.app (Vercel project `polaris`, scope `boyzz`).

## Site root is the landing page, not the app
`/` serves a **static** marketing page; the SPA answers under `/casino`,
`/sports` and `/predictions`. Both ship from this one repo and one deployment.

- `landing/` is the marketing page, kept byte-identical to what tribet.gg
  serves. It is plain HTML/CSS/JS with hand-tuned SEO (canonical, Open Graph,
  JSON-LD Organization/WebSite/WebPage/FAQPage). **Do not** rebuild it in React,
  add a bundler to it, or "fix" its markup casually — its value is that it is
  static and crawlable.
- Vercel resolves `/` to `dist/index.html` from the filesystem *before* any
  rewrite runs, so whoever owns that filename owns the root. Vite always builds
  the app shell there, so `scripts/build-landing.mjs` moves the shell to
  `/app.html` post-build and copies `landing/` over it. `vercel.json`'s
  catch-all rewrite sends every non-file path to `app.html`.
- Therefore: `npm run build` is `vite build` **plus** that script. Never bypass
  it, and never add a route at `/` — the app can no longer be reached there.
- `vite.config.js`'s `serveLanding` plugin mirrors this in dev, so `/` shows
  the landing locally too. Local and deployed agree.
- The landing owns `/favicon.svg`, `/css/*`, `/js/*`, `/logo.svg`,
  `/lobby-preview.png`, `/robots.txt`, `/sitemap.xml` at the output root. The
  app shell's icon is `/app-favicon.svg`. Adding a `public/` file with one of
  those names will collide.
- `X-Frame-Options` must stay `SAMEORIGIN`, never `DENY`: provider games run in
  same-origin iframes off `/games/*/index.html`, and `DENY` blocks those too.
