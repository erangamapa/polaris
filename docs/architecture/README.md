# WildStakes (polaris) — Architecture & Build Specification

This directory is the **build blueprint** for WildStakes (repo codename **polaris**): a three-in-one,
**fully on-chain, non-custodial** platform (**testnet build**) — Casino + Predictions + Sportsbook — built as an
**integrator** on two on-chain protocols. We provide **no bankroll** and sign **no game-provider
contracts**.

> **Status: SPECIFICATION — build not yet started.**
>
> **ARCHITECTURE = BetSwirl + Azuro integrator (current).** Casino runs on **BetSwirl**; sports &
> predictions on **Azuro Protocol**. Both are on-chain, non-custodial, shared-liquidity. The earlier
> **custom-stack** design (Vault + session keys + seamless-wallet backend + own provably-fair games) is
> **SUPERSEDED** and retained only for historical context in the files marked below.

## How to use these docs (for agents)

1. Read `00-overview.md` and `01-system-architecture.md` — the integrator model.
2. Read `16-credential-manifest.md` — the (now small) credential set. `11` is superseded by it.
3. **Resolve `23-open-items-and-discovery.md` FIRST (Discovery / Phase 0.5)** — the pre-build gate; don't
   start building until every BetSwirl/Azuro/chain/asset unknown is confirmed.
4. Follow `12-build-plan-phases.md` — the phased build (wallet → Azuro → BetSwirl → thin backend → UX),
   verifying at API level as you go (`22`).
4. Casino spec = `07` (BetSwirl); sports spec = `08` (Azuro); backend = `05` (thin); data/history = `15`.
5. Respect `13` (compliance) and `14` (threat model) on every phase.

## File index

| File | Section | Status |
|---|---|---|
| `00-overview.md` | Vision, integrator model, BetSwirl + Azuro | ✅ current |
| `01-system-architecture.md` | System diagram, components, flows | ✅ current |
| `02-monorepo-structure.md` | Repo layout (lighter: web + thin api + shared) | ✅ current (banner) |
| `03-blockchain-layer.md` | Chains (Base Sepolia + Azuro chain, bridging) | ⚠️ custody parts SUPERSEDED |
| `04-wallet-and-session-keys.md` | Wallet connect (Reown/wagmi) | ⚠️ session keys SUPERSEDED |
| `05-backend-seamless-wallet.md` | **Thin backend** (reads, affiliate, gating) | ✅ current (rewritten) |
| `06-provably-fair-engine.md` | Fairness via Chainlink VRF / Azuro | ⚠️ own-RNG SUPERSEDED |
| `07-casino-games.md` | **Casino via BetSwirl** | ✅ current (rewritten) |
| `08-sports-and-predictions-azuro.md` | **Sports/Predictions via Azuro** | ✅ current |
| `09-third-party-game-providers.md` | Branded studio games (optional/future) | ⚠️ optional, contract-gated |
| `10-frontend-integration.md` | Frontend wiring to BetSwirl + Azuro SDKs | ✅ current (banner) |
| `11-credentials-and-signups.md` | Old credential list | ⚠️ SUPERSEDED by `16` |
| `12-build-plan-phases.md` | Phased build for agents | ✅ current (rewritten) |
| `13-security-compliance.md` | Security (testnet) — non-custody, affiliate, secrets | ✅ current |
| `14-security-threat-model.md` | Threat model (affiliate, non-custody, dependency) | ✅ current (rewritten) |
| `15-data-persistence.md` | Everything on-chain; history from indexers | ✅ current (rewritten) |
| `16-credential-manifest.md` | **Authoritative** credential list | ✅ current (rewritten) |
| `17-build-autonomy-protocol.md` | Autonomous build from one bootstrap drop | ✅ current (banner) |
| `18-runtime-topology.md` | Where everything runs (Vercel + BetSwirl + Azuro) | ✅ current (rewritten) |
| `19-monetization.md` | Revenue: BetSwirl commission + Azuro affiliate | ✅ current (rewritten) |
| `20-infrastructure-and-deployment.md` | IaC & deploy (single repo, simpler) | ✅ current (banner) |
| `21-test-wallet-and-handoff.md` | Agent creates + funds a MetaMask test wallet across chains, hands you the seed | ✅ current |
| `22-verification-strategy.md` | Incremental API-level connectivity checks as you build (not browser, not end-only) | ✅ current |
| `23-open-items-and-discovery.md` | **Pre-build gate** — every unknown to confirm first (BetSwirl + Azuro + chains + assets) | ✅ current |
| `24-agent-team-and-orchestration.md` | Agent team + model-per-role by complexity + role→phase work split | ✅ current |

## The one-sentence summary

Player connects their own wallet → plays **casino on BetSwirl** (shared bankroll, Chainlink VRF, on-chain) and
**sports/predictions on Azuro** (shared liquidity, on-chain) → **everything settles on-chain and stays
in their wallet** → WildStakes earns a **commission/affiliate share** on the volume it sources, with
**no bankroll and no provider contracts**. This is a **testnet-only** build (mainnet + licensing out of scope).

_Last updated: 2026-07-01_
