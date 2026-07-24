# Tribet Casino — Game Display Inventory

Every game currently reachable through the Casino experience (Lobby rails, Search, Favorites, Recently Played, receipts — all read from the same `ALL_GAMES` list in `CasinoCatalog.jsx`, so there is exactly one catalog, not several). 17 games total: 6 "Tribet Originals" (on-chain, BetSwirl SDK) + 11 provider/vendored games (iframe, self-contained HTML apps under `public/games/*`).

No internal proof-of-concept routes, external redirects, or games reachable only through a side-channel were found — `findGameByFavId`/`ALL_GAMES` is the single source every entry point (Lobby card, search result, Favorites/Recently Played row, round receipt's "view game info") resolves through.

Confidence markers: **evidence** = confirmed by reading actual source (CSS/HTML/JS); **inferred** = reasonable read of adjacent evidence; **unknown** = not verified, not assumed. Per this task's own instruction, unverified capabilities are marked `unknown`, never invented.

## Tribet Originals (on-chain, `kind: "onchain"`, BetSwirl SDK)

Implementation: internal React component (`BetSwirlGame.jsx`), no iframe. Rendered via `CasinoGameplayFrame` + `GameLaunchSurface`, identical shell for all six.

| id | title | playable | frame component | current width behavior | current height behavior | internal max-width (evidence) |
|---|---|---|---|---|---|---|
| `casino:dice` | Dice | yes | BetSwirlGame | forced into shared 1100px box | forced into shared 720px box | `max-w-md` (448px) — **evidence**, line 249 |
| `casino:coin-toss` | Coin Toss | yes | BetSwirlGame | same | same | same `max-w-md` wrapper |
| `casino:roulette` | Roulette | yes | BetSwirlGame | same | same | same wrapper; number grid is `grid-cols-10` inside it |
| `casino:keno` | Keno | yes | BetSwirlGame | same | same | same wrapper; number grid is `grid-cols-10` inside it |
| `casino:wheel` | Wheel | **no** (reverts on this testnet deployment) | BetSwirlGame | same | same | same wrapper |
| `casino:plinko` | Plinko | **no** (reverts on this testnet deployment) | BetSwirlGame | same | same | same wrapper |

- Aspect ratio: none declared or needed — this is a centered control panel (bet amount, action button, face/number selectors), not a canvas/game-stage. **evidence**: `BetSwirlGame.jsx`'s own root is `mx-auto flex max-w-md flex-col gap-3`.
- Responsive support: yes, via Tailwind classes, already mobile-safe.
- Minimum usable size: comfortably usable at 320×568 (**inferred** — it's a plain form, no canvas).
- Internal fullscreen/sound/history controls: **none** — confirmed by grep, no fullscreen/mute/history strings in `BetSwirlGame.jsx`.
- Internal close/back control: **none** — the shared frame's close button is the only one (confirmed, matches the file's own comment: "the one close button").
- Host controls currently displayed: Game Info, Close. No duplication found.
- Current loading/error state: shared with every other game via `GameLaunchSurface`'s single overlay — no separate loading UI of its own.
- **Known issue (this task's core finding)**: rendered inside a box up to 1100×720, but self-constrains to 448px wide internally — the remaining ~650px of width (and a large vertical margin, since content height is far under 720px) is empty background. This is the single largest concrete case of "some games contain excessive empty space."
- **Recommended display profile: `compact`** (see metadata contract below).

## Provider / vendored games (iframe, `kind: "provider"`, badge "Tribet Studio")

Implementation: sandboxed iframe (`ProviderGame.jsx`) loading a static HTML app from `public/games/<key>/index.html`, `allow-scripts allow-same-origin allow-pointer-lock`. All are "responsive web app" builds (`<meta name="viewport" content="width=device-width, initial-scale=1...">`), not fixed-canvas games with one intrinsic pixel size — none declare a canvas width/height or a single hardcoded resolution.

| id | title | src | internal evidence found | recommended profile |
|---|---|---|---|---|
| `provider:crash` | Warpout | `/games/crash/index.html` | `.game-column` side-by-side panel layout, own `max-width: 1440px`, own breakpoints at 980px/640px, internal help/sound/fullscreen-adjacent markup found. Body uses `min-height: 100vh` (not `dvh` — **known issue**, see below). | `landscape-wide` |
| `provider:dice` (Vector Dice) | Vector Dice | `/games/dice/index.html` | Internal fairness/history/help **modals** confirmed (`closeFairnessModal`, `closeHistoryModal`, `closeHelpModal`) — real evidence this game has its own history/help/fairness UI, which the host must not duplicate. No aspect-ratio evidence found. | `flexible` |
| `provider:coinflip` | Coin Flip | `/games/coinflip/index.html` | Reference game from `skills/build-casino-game`, runs on the mock Game Bridge. No layout-width evidence found (no matching CSS file located in this pass). | `flexible` (unknown confidence) |
| `provider:nova-wheel` | Nova Wheel | `/games/nova-wheel/index.html` | `.wheel-wrap { width: min(360px, 82vw); aspect-ratio: 1 }`, `.controls { max-width: 420px }` — clear evidence of a compact, centered layout, not a wide dashboard. | `compact` |
| `provider:spacex-rush` | SpaceX Rush | `/games/spacex-rush/index.html` | Sound-related strings found; no layout-width evidence located in this pass. | `flexible` (unknown confidence) |
| `provider:tumble` | Tumble | `/games/tumble/index.html` | Self-contained crash-style game (own mock economy, imported via `skills/import-casino-game`). Sound-related strings found. Its CSS is a minified vendor bundle — not practically inspectable for layout hints in this pass. | `flexible` (unknown confidence) |
| `provider:coin-fighters` | Coin Fighters | `/games/coin-fighters/index.html` | `max-width: 420px`/`560px`/`52rem` (832px) at different breakpoints, own sound module (`src/audio.js`) — moderate-width, own responsive breakpoints already. | `flexible` |
| `provider:raiders-escape` | Raider's Escape | `/games/raiders-escape/index.html` | `max-width: 168px/128px` (small sub-panels) with its own breakpoints at 720px/380px — compact, already narrow-friendly. | `flexible` |
| `provider:keymines-v2` | KeyMines V2 | `/games/keymines-v2/index.html` | Vendored/minified build; no first-party layout CSS located to inspect in this pass. | `flexible` (unknown confidence) |
| `provider:drunken-pirate` | Drunken Pirate | `/games/drunken-pirate/index.html` | Real internal sound control confirmed (`id="btnMuteSound"`, `aria-pressed`, `title="Mute sound"`) — the host must not add a second, competing sound control for this game. Multiple internal `aspect-ratio` declarations at different states (`5/4`, `16/9`, `408/306`), `max-width: 520px`/`90vw`. | `flexible` |
| `provider:bubble-girl` | Bubble Girl | `/games/bubble-girl/index.html` | Self-contained crash-style bubble-inflate game (own mock economy). No layout-width evidence located in this pass. | `flexible` (unknown confidence) |

### Provider-declared internal controls found (real evidence, not assumed)

| game | internal sound | internal help/history/fairness | internal "close whole game" |
|---|---|---|---|
| Vector Dice | unknown | **yes** (fairness/history/help modals) | none found |
| Drunken Pirate | **yes** (mute button) | unknown | none found |
| Warpout (crash) | sound-related strings present, unconfirmed as a visible control | help-related strings present, unconfirmed | none found |
| Raider's Escape | sound-related strings present, unconfirmed | unknown | none found |
| Coin Fighters | dedicated `audio.js` module — likely yes, control itself unconfirmed | unknown | none found |
| SpaceX Rush | sound-related strings present, unconfirmed | unknown | none found |
| Tumble | sound-related strings present, unconfirmed | unknown | none found |
| all others | unknown | unknown | none found |

**No provider game was found with its own "close the whole game" or "leave to Tribet" control** — every "close" button found is scoped to an internal modal (help/fairness/history), never the whole iframe. This means today there is no ACTUAL close-button duplication happening, but the host has no way to know that without the games speaking for themselves — hence the metadata contract below.

## Current Frame Architecture (audit)

- **`CasinoGameplayFrame.jsx`** — the one shared outer chrome (header, Game Info + Close, content-box). **Root cause of the sizing inconsistency**: the content-box is a single hardcoded size for every game — `md:h-[min(100%,720px)] md:w-[min(92vw,1100px)]` — with no per-game variation at all. This is what forces both a 448px-wide betting form and a 1440px-max-width dashboard game into the identical box.
- **`GameLaunchSurface.jsx`** — already correctly shares one content-box across loading/error/ready (no separate frames, no layout jump between states) — no issue found here.
- **`BetSwirlGame.jsx`** — no duplicate host controls (confirmed via grep: no close/fullscreen button markup).
- **`ProviderGame.jsx`** — renders only its own inner content (iframe fills `h-full w-full` of whatever box it's given); the outer frame, header, title, and close button already live in `CasinoGameplayFrame` (per that file's own comment) — no duplication found here either.
- **Game Info remount**: confirmed already fixed in an earlier pass this session — Game Info opening/closing does not remount gameplay (verified via a real Playwright focus/iframe-count trace).
- **Escape ownership**: confirmed already correct (Game Info, Developer Panel, and gameplay's own close all coordinate via `closeDisabled`/`gameInfoOpen`/`devPanelOpen`, fixed in earlier passes this session).
- **Mobile bottom nav hiding during gameplay**: confirmed already correct (unmounted, not just hidden, during an active launch).
- **Safe areas**: `env(safe-area-inset-*)` already applied at the header/content-box level — no issue found.
- **Known issue**: `provider:crash`'s own internal CSS uses `min-height: 100vh` at the body level (not `dvh`) — on mobile Safari this can be a few dozen pixels off from the real visible viewport when browser chrome is expanded. This lives inside the vendored game's own CSS, outside `CasinoGameplayFrame`'s control — noted here, not fixed in this pass (fixing a vendored third-party game's internal CSS is outside "the outer frame ownership" this task scopes Tribet's responsibility to).
- **No hardcoded per-game exceptions found** in the frame components themselves — the ONE hardcoded value is the universal box size, applied identically to all 17 games, which is precisely the bug this task's metadata contract fixes.
