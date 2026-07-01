# 19 — Monetization

> **Updated for the BetSwirl + Azuro pivot.** We no longer own a casino house edge or fund a bankroll.
> Revenue is **commission/affiliate share on volume we source**, from both protocols. No bankroll risk,
> no build, no contracts — thinner margin in exchange.

## Revenue stack

| # | Stream | Source | We earn | Bankroll risk |
|---|---|---|---|---|
| 1 | **Casino affiliate** | BetSwirl | ~**30% of house edge** (edge 2.4–4%), **claimed on-chain, no registration** | ❌ none (BetSwirl LPs are the house) |
| 2 | **Sports/Predictions affiliate** | Azuro | affiliate GGR share (~70% of attributable app revenue, capped `50% × spread × bet size`) — **payout needs registration + monthly** | ❌ none (Azuro LPs) |
| 3 | **(Optional) be an LP yourself** | BetSwirl / Azuro | share of house profit by supplying bankroll | ✅ yes (only if you choose) |
| 4 | Minor | — | FX/conversion spread, loyalty/premium | — |

## 1 — Casino via BetSwirl

- House edge is **2.4–4%** (PvP 3.5–7%), split on-chain across Bank / Partner / **Affiliate** /
  Dividends / Treasury / Team. As the affiliate/partner you can **set the house edge** and earn the
  **affiliate share (~30% of house edge)**.
- **Claimed trustlessly on-chain** to your affiliate wallet — *"affiliates can claim revenues"* — **no
  registration, no approval, no middleman.** You set the affiliate as a client config field (`07`).
- **You do not fund the bankroll** — BetSwirl's shared pool is the house and takes the risk.
- Per-bet **gas + Chainlink VRF fee** are paid by the bettor (not you); see `07`/`00`.
- On testnet this earns nothing real; the mechanics describe how attribution + claiming work.

## 2 — Sports/Predictions via Azuro

- Attribution is on-chain: pass our address in the bet order (EIP-712 `ClientBetData.affiliate`).
- Earn ~**70% of attributable app revenue**, capped by `50% × spread × bet size`. No bankroll risk.
- ⚠️ **Payout is gated (unlike BetSwirl):** to actually *receive* rewards you must **register with Azuro**
  (a form → their team adds you to the payouts dashboard), paid **monthly, per chain**. That's a
  **human, mainnet/real-money-only** step (you, not the agent). **Not needed for testnet.**
- Securing the affiliate address (anti-substitution) is covered below and in `14` T9.

## Securing affiliate/commission attribution (both protocols)

The identifiers that route revenue to us (BetSwirl affiliate + Azuro affiliate address) are **public
on-chain, not secrets** — the risk is **substitution**, not exposure.
- Store them in **server env** (`BETSWIRL_AFFILIATE_ADDRESS`, `AZURO_AFFILIATE_ADDRESS`).
- **Enforce server-side:** the thin backend injects/overwrites our identifier on any prepared order and
  rejects mismatches before submission (`05`, `14` T9). Never trust a client-supplied value.
- **Residual (accepted):** a user can bypass our frontend and play the protocols directly with their own
  (or no) affiliate — unpreventable on permissionless protocols, and not theft; we just don't earn on
  volume we didn't source.

## 3 — Optional: become a liquidity provider

If you *choose* to supply bankroll to BetSwirl/Azuro pools, you earn a share of house profit (rising share
price) — but that's opt-in and reintroduces capital + risk. **Not required**, and contrary to the
zero-liquidity goal, so default = don't.

## Cost vs revenue summary
- **To start:** ~zero (free infra, permissionless protocols, free testnet).
- **Trade vs owning a casino:** thinner, commission-style margin — but zero bankroll, zero contracts,
  zero settlement/RNG to build.

## Build hooks
- Casino commission → attach BetSwirl affiliate identifier on sourced bets (`07`), enforce server-side (`05`).
- Sports affiliate → inject Azuro affiliate address on orders (`08`), enforce server-side (`05`, `14` T9).

_Last updated: 2026-07-01_
