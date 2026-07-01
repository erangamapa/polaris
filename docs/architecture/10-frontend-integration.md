# 10 — Frontend Integration

> **Updated for the BetSwirl + Azuro pivot.** Still-valid: reuse the existing app, wallet connect via
> Reown/wagmi/viem, unified balance, bet-history page. **Changed:** casino wires to the **BetSwirl SDK**
> (`07`) instead of our own games/seamless-wallet; sports/predictions wire to the **Azuro SDK** (`08`);
> deposits/withdrawals + session keys + Vault UI are **gone** (protocols + player wallet handle funds).
> Add a **chain switch/bridge CTA** when entering a vertical whose chain differs from the current one
> (`03`). Unified balance = BetSwirl (casino) + Azuro-chain wallet, shown in USD. Below, ignore references to
> Vault deposit/withdraw and session keys.

---


The frontend already exists (`apps/web`, the current Vite/React prototype). This layer wires it to the
real wallet, backend, and Azuro — replacing mock data/state incrementally.

## Starting point
- Existing shell in `src/App.jsx` with unified balance, three verticals, wallet dialog, KYC modal,
  auth modal, responsible-gambling — all mock. Reuse the UI; swap the data/state layer.
- Existing `src/lib/session.js` already mocks `WALLETS` (MetaMask/WalletConnect/Coinbase/Phantom) —
  replace with real Reown/wagmi connection.

## What changes
| Area | From (mock) | To (real) |
|---|---|---|
| Wallet connect | `session.js` mock | Reown AppKit + wagmi/viem |
| Balance | `useState(250)` in `App.jsx` | vault-backed ledger (casino) + on-chain (Azuro), via hooks |
| Deposit | `WalletDialog` mock | `approve` + `Vault.deposit` tx |
| Casino play | mock `placeBet`/`logRound` | game iframe + `/wallet/*` |
| Sports/Predictions | `sportsData.js`/`predictionsData.js` | Azuro SDK hooks |
| Session | localStorage mock | wallet connection + session key |

## New frontend modules
```
apps/web/src/
  web3/
    wagmi.ts          # wagmi + Reown config (chains from packages/shared/chains.ts)
    useVault.ts       # deposit / withdraw / balanceOf
    useSessionKey.ts  # grant / status / revoke session key
  data/
    useLedgerBalance.ts   # GET /wallet/balance-style unified balance
    useLaunchGame.ts      # POST /session/launch → iframe url
    azuro/                # Azuro SDK hooks for sports + predictions
```

## Unified balance (the "one balance" promise)
- Display = casino ledger balance (from backend) + Azuro/wallet USDC available.
- A single balance pill (reuse `src/components/shell/BalancePill.jsx`), with a breakdown tooltip:
  "Playable (casino): X · Wallet (sports/predictions): Y · In vault: Z".
- Clearly mark instant actions (casino) vs wallet-confirm actions (Azuro bets, deposit, withdraw).

## Deposit / withdraw UX
- Deposit: choose amount → `approve` (first time) → `Vault.deposit` → balance updates on
  `deposit-watch`. Reuse `WalletDialog`.
- Withdraw: `Vault.withdraw` (settles casino session first if one is open).
- "Enable fast play": grant session key with chosen cap + duration (see `04`).

## Bet History page
Build per the full spec in `15`. Two sources, two trust stories, keyed by wallet address:
- **Casino** (from our `/api` → `rounds`/`sessions`): sessions expandable to off-chain rounds; each
  round has a provably-fair **verify** action; each session links to its **on-chain settlement tx**.
  Copy explains rounds are off-chain for speed and settle to the chain as one net transaction.
- **Sports** (from **Azuro subgraph**): each bet is **fully on-chain** with a **block-explorer link**.
- Tag every row 🔗 on-chain vs ⚡ off-chain+provably-fair so the distinction is explicit. Reuse the
  existing `ActivityDialog`/positions UI as the starting point; merge/sort by time for the unified view.

## Reuse existing components
- `GameLauncher` → host-side iframe launcher (see `07`).
- `WalletDialog` → real deposit/withdraw.
- `KycModal` / `AuthModal` → keep for compliance gating (see `13`); wallet-connect replaces password
  auth, KYC gates deposits/withdrawals where required.
- Keep `ErrorBoundary`, `CurrencyProvider`, `OddsFormatProvider`.

## Env (frontend, public)
Only **public** values in the frontend (see `11`): Reown Project ID, thirdweb client ID, chain ids,
public RPC, contract addresses. **No secrets.**

## Acceptance criteria
- Connect real wallet → deposit test USDC → balance reflects vault → play casino (instant) → place an
  Azuro sports bet (wallet confirm) → withdraw. All from the existing UI.
- Unified balance is correct across both models.
- No secret ever appears in the frontend bundle.

_Last updated: 2026-07-01_
