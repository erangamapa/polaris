# AGENTS.md — TriBet

Guidance for AI agents (and humans) working in this repo. Read this before adding a game.

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
   (see `public/img/games/vector-crash.svg` as the template).

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
| `api/` | Vercel serverless functions (balance/history/bet-prepare) |

## Verify & ship
```bash
npm run build     # must pass
npm run lint      # must pass (exit 0)
# commit on a branch; PR to main. Deploy is CLI: vercel --prod (project "tribet").
```
Live: https://tribet-app.vercel.app (Vercel project `tribet`, scope `erangamapas-projects`).
