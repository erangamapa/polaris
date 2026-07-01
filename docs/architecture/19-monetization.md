# 19 — Monetization

> **Updated for the WINR + Azuro pivot.** We no longer own a casino house edge or fund a bankroll.
> Revenue is **commission/affiliate share on volume we source**, from both protocols. No bankroll risk,
> no build, no contracts — thinner margin in exchange.

## Revenue stack

| # | Stream | Source | We earn | Bankroll risk |
|---|---|---|---|---|
| 1 | **Casino commission** | WINR | commission on sourced casino volume + **vWINR** emissions | ❌ none (WINR LPs are the house) |
| 2 | **Sports/Predictions affiliate** | Azuro | affiliate GGR share (~70% of attributable app revenue, capped `50% × spread × bet size`) | ❌ none (Azuro LPs) |
| 3 | **(Optional) be an LP yourself** | WINR / Azuro | share of house profit by supplying bankroll | ✅ yes (only if you choose) |
| 4 | Minor | — | FX/conversion spread, loyalty/premium | — |

## 1 — Casino via WINR

- WINR **routes commission** to the integrator/creator whose frontend sources the bets, plus **vWINR**
  emissions minted through the games your users play. You attach your **WINR affiliate/referrer
  identifier** to sourced bets (confirm the exact mechanism/format at build time — `07`).
- **You do not fund the bankroll** and **do not own the full house edge** — WINR's shared pool is the
  house and takes the risk; you earn a commission on the volume you bring.
- On testnet this earns nothing real; the mechanics here describe how commission attribution works.

## 2 — Sports/Predictions via Azuro

- Register an **affiliate wallet**; pass it in the bet order (EIP-712 `ClientBetData.affiliate`).
- Earn ~**70% of attributable app revenue**, capped by `50% × spread × bet size`. No bankroll risk.
- Securing the affiliate address (anti-substitution) is covered below and in `14` T9.

## Securing affiliate/commission attribution (both protocols)

The identifiers that route revenue to us (WINR referrer + Azuro affiliate address) are **public
on-chain, not secrets** — the risk is **substitution**, not exposure.
- Store them in **server env** (`WINR_AFFILIATE_ID`, `AZURO_AFFILIATE_ADDRESS`).
- **Enforce server-side:** the thin backend injects/overwrites our identifier on any prepared order and
  rejects mismatches before submission (`05`, `14` T9). Never trust a client-supplied value.
- **Residual (accepted):** a user can bypass our frontend and play the protocols directly with their own
  (or no) affiliate — unpreventable on permissionless protocols, and not theft; we just don't earn on
  volume we didn't source.

## 3 — Optional: become a liquidity provider

If you *choose* to supply bankroll to WINR/Azuro pools, you earn a share of house profit (rising share
price) — but that's opt-in and reintroduces capital + risk. **Not required**, and contrary to the
zero-liquidity goal, so default = don't.

## Cost vs revenue summary
- **To start:** ~zero (free infra, permissionless protocols, free testnet).
- **Trade vs owning a casino:** thinner, commission-style margin — but zero bankroll, zero contracts,
  zero settlement/RNG to build.

## Build hooks
- Casino commission → attach WINR affiliate identifier on sourced bets (`07`), enforce server-side (`05`).
- Sports affiliate → inject Azuro affiliate address on orders (`08`), enforce server-side (`05`, `14` T9).

_Last updated: 2026-07-01_
