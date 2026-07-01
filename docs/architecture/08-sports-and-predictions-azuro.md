# 08 — Sports & Predictions via Azuro

> Sports + predictions run on **Azuro Protocol** — on-chain, non-custodial, shared liquidity,
> permissionless. This doc is the integration spec + the **things to confirm in Discovery (Phase 0.5)**
> before building.

## What Azuro is
Decentralized betting **infrastructure**: smart contracts + odds engine + oracle/data feeds + a shared
singleton **liquidity pool** (LPs are the counterparty — **no bankroll from us**) + an **SDK** (React
hooks) and **Toolkit**. We build the frontend; Azuro runs the betting backend on-chain.
Docs: https://gem.azuro.org · SDK: https://gem.azuro.org/hub/apps/sdk/overview ·
APIs: https://gem.azuro.org/hub/apps/APIs · Tutorial app: https://github.com/Azuro-protocol/azuro-tutorial-app

## What Azuro serves vs what WE build (avoid surprises)

| Concern | Azuro serves | We build / source |
|---|---|---|
| Markets, odds, data feeds | ✅ (subgraph + data provider) | fetch + render |
| Liquidity / counterparty / settlement | ✅ on-chain | — |
| Bet placement (sign → oracle → relayer) | ✅ SDK + relayer API | wire the flow + enforce affiliate |
| Bet/market/history data | ✅ **subgraph (GraphQL)** | query + display |
| SDK **React hooks** (+ Toolkit utilities) | ✅ | use in our sports/predictions verticals |
| Sport/league/team **names & ids** | ✅ (in data feed) | render |
| Sport/league/team **logos & icons** | ⚠️ **NOT confirmed** | **we source** (assets) |
| Bet slip, event rows, odds buttons UI | — | ✅ (existing sports components) |
| Winnings **redeem/claim** flow | ✅ contract method | wire a claim action |

## The bet flow (gasless, on-chain)
```
1. Player selects outcome → we build ClientBetData (EIP-712) with affiliate = OUR address (server-enforced).
2. Player signs ClientBetData in-wallet.
3. Submit signed order to Azuro oracle API (POST /orders).
4. Oracle signs → Relayer executes betFor(OrderData[]) on-chain → shared liquidity is counterparty.
5. Settlement on-chain after the event resolves; player redeems winnings (claim).
```
EIP-712 `ClientBetData` fields: `amount, nonce, conditionId, outcomeId, minOdds, expiresAt, chainId,
relayerFeeAmount, affiliate`.

## Existing components mapping
Swap mock data for Azuro data in: `src/components/sports/*` (`EventRow`, `OddsButton`, `BetSlip`,
`MarketCard`, `EventDetail`, `SportsApp`) and `src/components/predictions/*`. Keep the UI; feed it Azuro
markets/odds via SDK hooks + subgraph.

## Revenue & securing the affiliate address (build detail)
- Earn an **affiliate GGR share** (~70% of attributable app revenue, capped `50% × spread × bet size` —
  see `19`).
- `affiliate` is a field in the EIP-712 `ClientBetData`; it's **public, not secret** — risk is
  substitution. **Proxy orders through our backend**, which **sets/enforces** `AZURO_AFFILIATE_ADDRESS`
  and **rejects mismatches** before forwarding to the oracle (`05`, `14` T9, `19`). Register with Azuro's
  **affiliate-tracker** for attribution + support.

## Bet history — read from the chain (Azuro subgraph)
Sports/prediction bets are **fully on-chain**; read history from the **Azuro subgraph (GraphQL)** by
wallet address (don't scan the chain raw). Show each with a **block-explorer link**. Optional per-address
cache. Full page spec in `15`.

## Both verticals are on-chain (BetSwirl + Azuro)
- Casino: BetSwirl (`07`). Sports/Predictions: Azuro (this doc). Both non-custodial, on-chain.
- **Co-located on Base Sepolia** — casino + sports on **one chain**, so one wallet balance covers both,
  **no bridging**. Sports bets are **gasless** (sign → relayer); casino bets are per-bet on-chain (gas +
  VRF). Keep each vertical native to its protocol; unify only at the display layer.

## Open items to confirm in Discovery (Phase 0.5) — RESOLVE BEFORE BUILDING
1. Exact **Azuro SDK + Toolkit** package + version + hooks API (pin them).
2. **Target chain(s) + testnet** (Base Sepolia / Polygon Amoy / Gnosis Chiado / Chiliz Spicy per current
   deployment) and the **pool/betting token** per chain; align with casino chain where possible.
3. **Subgraph GraphQL endpoint(s)** per chain (markets, odds, bets, history) + example queries.
4. **Oracle order API** endpoint (`POST /orders`), EIP-712 **domain/types**, relayer address/flow.
5. **Affiliate** setup: affiliate-tracker registration + exactly how `affiliate` is set + **reward claim**.
6. **Redeem/claim winnings** contract method + when it's callable.
7. **Live betting** flow specifics (signature format) if we surface live markets.
8. **Sport/league/team metadata** shape + **logo/icon** sourcing (likely on us).
9. **Testnet faucet** for the pool token + gas on the target chain.
10. Prediction-market coverage on the chosen chain (which markets exist for our Predictions vertical).

## Acceptance criteria (testnet)
- Place a non-custodial **sports bet** and a **prediction bet** end-to-end; both settle on-chain via
  Azuro; affiliate attributed to us — **verified headless** (sign + submit via SDK/relayer with the test
  wallet key, `22`).
- Markets/odds render from Azuro data; history reads from the subgraph; a winning bet can be redeemed.

_Last updated: 2026-07-01_
