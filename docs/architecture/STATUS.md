# STATUS — Resume Here

> Single "where are we / how to continue" note so any fresh session (or a cleared context) can pick up
> without loss. The full plan is in this directory; start with `README.md`.

## 🔑 Secrets location (NEVER commit these)
Bootstrap secrets live in **`.env.bootstrap`** at the repo root — **gitignored, untracked**. Preflight
(`17` Step 0) reads them. If it's already populated, **resume with just:**
`Read docs/architecture/STATUS.md and build.` — no need to paste values again. (Never put secret values
in this file or any tracked file.)

## ▶ Kickoff after a context clear (paste this)

```
Read docs/architecture/STATUS.md and docs/architecture/README.md, then execute the build per
docs/architecture/12-build-plan-phases.md using the agent team in 24. Run preflight (17/23) FIRST and
STOP if any required input is missing.

Inputs:
- VITE_REOWN_PROJECT_ID = <paste>
- CDP_API_KEY_ID = <paste>        (recommended, for uninterrupted funding)
- CDP_API_KEY_SECRET = <paste>
- Run autonomously (no per-command prompts).
```

The build **cannot start without the required input** — preflight (`17` Step 0) verifies it and **stops
with the exact missing item** if absent. So you can't accidentally launch a blind run.

## ✅ Readiness audit — PASSED (2026-07-01)
Verified live, so a fresh session can proceed without re-checking these:
- `.env.bootstrap` has all 3 keys (Reown + CDP id/secret), gitignored ✅
- Tooling: node 22, npm, Vercel CLI (authed), gh (authed) ✅
- Git clean + pushed ✅
- **Base Sepolia RPC live** (`https://sepolia.base.org`) ✅
- SDKs exist: `@betswirl/sdk-core@0.1.27`, `@azuro-org/sdk@7.4.1` ✅
- **CDP funding WORKS on Base Sepolia** — test faucet sent **ETH + USDC** (real tx hashes). Autonomous
  wallet funding is proven ✅
- Vercel deploy works (site live at wildstakes.vercel.app) ✅

**Confirm at kickoff Discovery (`23`), auto-route if needed:** BetSwirl testnet deployment live + betting
token + bankroll funded on Base Sepolia; Azuro Base Sepolia subgraph/oracle/pool-token; single shared
token feasible. If a protocol's testnet is down → switch to Polygon Amoy (both support it).

## Project
- **Repo:** `erangamapa/polaris` (codename **polaris**; player-visible brand **WildStakes** via
  `src/lib/brand.js` `BRAND_NAME`). Local dir may still be `.../boyzcasino`.
- **Live (prototype):** https://wildstakes.vercel.app — Basic-Auth gated (user: any, pass: `WildStakes2026`,
  env `SITE_PASSWORD`, `middleware.js`). Vercel project `wildstakes` (scope `erangamapas-projects`), CLI-deployed.

## Where we are
- **Phase: BUILD ~COMPLETE (testnet).** Done + committed: **0.5 Discovery · 0/1 provision · 2 wallet
  connect · 4 BetSwirl casino · 3 Azuro sports · 5–8 backend/history/unified-balance/RG · 9 hardening.**
- **Deployed to production:** https://wildstakes.vercel.app (Basic-Auth gated; `/api/*` live —
  balance/history/geo + **forged-affiliate→403** verified in prod).
- **Casino on-chain E2E: PASSED** (multiple dice bets settled via VRF, affiliate=house). **Sports:**
  integration proven to relayer acceptance; on-chain settlement waits on transient testnet game data (`23`).
- **Handoff:** both seeds in gitignored `.secrets/` (house + player). See `21`. Player funded (ETH+WETH),
  house funded (gas to claim).
- Architecture = **integrator**: **casino → BetSwirl**, **sports/predictions → Azuro**, both on-chain,
  non-custodial, **co-located on Base Sepolia**, testnet-only. No bankroll, no provider contracts.

### Progress log (build)
- ✅ **Discovery**: BetSwirl bets in **native ETH** (bank liquid), Azuro in **WETH**
  (`0x9e09…935f`), both Base Sepolia. Config pinned in `packages/shared/chains.js`; endpoints/contracts
  in `23`. BetSwirl studio subgraph returns "Not found" → history via chain/RPC (Phase 6 revisit).
- ✅ **Structure decision**: kept web app at **repo root** (not apps/web) + added `packages/shared` (`@shared`
  alias) + will add Vercel-native `api/`. Protects the working Vercel deploy; satisfies functional DoDs.
- ✅ **Wallets**: house `0x584d4598EC9034744A275F405D12D86092B39c74`, player
  `0x235Ac2e1Fee35f6A68C8F1715414fa6A94Bc1b65` in gitignored `.secrets/`. CDP faucet funding **works**.
- ✅ **Dep resolution**: wagmi **v3** + @wagmi/core v3 (Reown adapter needs `./tempo`); dropped
  `@betswirl/wagmi-provider` (use sdk-core + viem directly). Apollo **v4** (betswirl peer).
- ✅ **Phase 2**: Reown AppKit + wagmi; Connect Wallet replaces Login/Register; Funds panel; switch-CTA.
- ✅ **Phase 4 PROVEN on-chain**: `packages/shared/scripts/bet-casino.mjs` placed a real dice bet →
  Chainlink VRF settle → **affiliate attributed to house** (bet `0xd5b4fd…`, roll `0xf7e743…`). UI:
  `useBetSwirl` + `BetSwirlGame` modal + on-chain lobby rail.
- Env: `.env.local` (gitignored) has VITE_REOWN_PROJECT_ID + VITE_AFFILIATE_ADDRESS; same set in Vercel prod.
- Scripts: `provision.mjs` (wallets), `fund.mjs` (CDP faucet), `bet-casino.mjs` (casino E2E) in
  `packages/shared/scripts/`. Not yet deployed to Vercel since Phase 0 (local build green).

## To start building (what the human provides — see `16`/`17`)
1. `VITE_REOWN_PROJECT_ID` (required)
2. `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET` (recommended — uninterrupted funding)
3. Run permission (autonomous / no per-command prompts)
GitHub + Vercel already authed.

## Execution order
1. `12-build-plan-phases.md` — phases (0 → 0.5 Discovery gate → 1…9).
2. `23-open-items-and-discovery.md` — resolve the ❓ kickoff checks FIRST.
3. `24-agent-team-and-orchestration.md` — spawn the agent team (roles + model tiers), split work.
4. `22-verification-strategy.md` — API-level QA gate per phase (no browser).
5. `21-test-wallet-and-handoff.md` — provision player + house wallets; hand over both seeds at the end.

## Key realities already decided (don't re-litigate)
- Casino bets = on-chain tx → **per-bet gas + Chainlink VRF fee + MetaMask confirm**; sports = **gasless sign**.
- Revenue: BetSwirl ~30% house edge, **claim on-chain, no registration**; Azuro affiliate needs
  **registration + monthly payout** (human, mainnet-only).
- UI: **Connect Wallet replaces Login/Register**; new **Bet History** (casino+sports, on-chain); **Funds**
  panel (no deposit-to-us); network switch CTA (`10`).
- Docs `03/04/06/09/11` are **SUPERSEDED** (historical). Current index in `README.md`.

## Git
- Latest work committed + pushed to `origin/main`. Working tree should be clean.

_Last updated: 2026-07-01_
