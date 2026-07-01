# 10 — Frontend Integration & UI Changes

> Wire the existing Vite/React app (`apps/web`) to the real wallet + **BetSwirl** (casino) + **Azuro**
> (sports) on Base Sepolia. Reuse the existing look; swap the data/state layer and change the auth/screens
> below. No Vault, no seamless-wallet, no session keys — those are gone with the pivot.

## UI changes — screens & components (the headline)

### 1. Auth → Wallet connect (replaces Login/Register)
- **Remove the `Log in` / `Register` buttons** in `TopBar`. Replace with a single **“Connect Wallet”**
  button (Reown AppKit modal — MetaMask/Coinbase/WalletConnect).
- **Connected state (TopBar):** truncated address (`0x1a2b…9f4c`) + the unified **balance pill** +
  an **account menu** (copy address, view on explorer, **disconnect**, network).
- **`AuthModal` (email/password mock) → removed.** Identity = the connected wallet address (no signup,
  no password). `src/lib/session.js` mock → real Reown/wagmi connection.
- **`KycModal` → not used** in the testnet build (KYC is mainnet/out-of-scope, `13`). Keep the component
  dormant for later.
- **`AccountDialog` → “Wallet / Account”**: shows address, connected network, disconnect. No password/2FA.

### 2. Network state (new)
- **Network indicator** + a **“Switch to Base Sepolia” CTA** when the wallet is on the wrong chain
  (wagmi `switchChain` / `wallet_addEthereumChain` to auto-add the network). Both verticals are on Base
  Sepolia, so it's one target — no per-vertical bridging (`03`, `08`).

### 3. Funds (replaces the deposit sheet)
- Non-custodial: **funds stay in the player's wallet** — there is **no “deposit to us.”** Repurpose
  `WalletDialog` into a **“Funds”** panel: show wallet balances (gas + betting token), a **link to the
  testnet faucet** (testnet), and (mainnet, later) on-ramp/bridge. Remove the mock deposit/withdraw.

### 4. Bet placement UX (differs per vertical — call it out in the UI)
- **Casino (BetSwirl):** each bet is an **on-chain tx** → a **MetaMask confirmation per bet**, then a
  **“resolving…” state** while Chainlink VRF returns (seconds), then the result. Show pending/tx states;
  don't pretend it's instant. (Discovery: if a gasless/session mode exists, wire it — `07`/`23`.)
- **Sports (Azuro):** **gasless** — a **signature prompt** (no gas), then the bet is relayed. Show a
  “signing / submitting” state.

### 5. Bet History / “My Bets” (new screen)
- One screen, **Casino + Sports tabs**, **both fully on-chain** (`15`):
  - **Casino** from the **BetSwirl subgraph**; **Sports** from the **Azuro subgraph**.
  - Every row links to its **transaction on the block explorer** (🔗 on-chain).
  - Casino rows expose the **Chainlink VRF proof** (provably fair).
- Reuse the existing `ActivityDialog` / positions UI as the starting point; merge + sort by time.

### 6. Unified balance
- One USD balance pill (reuse `BalancePill`) = casino betting balance + Azuro-chain wallet balance, read
  **on-chain** (RPC + subgraphs). Breakdown tooltip. Everything is one chain (Base Sepolia).

## Component mapping (existing → new)
| Existing | Becomes |
|---|---|
| `TopBar` Login/Register | **Connect Wallet** button + connected address/account menu |
| `AuthModal` (password) | **removed** → Reown connect modal |
| `KycModal` | dormant (mainnet-only) |
| `AccountDialog` | Wallet/Account (address, network, disconnect) |
| `WalletDialog` (deposit) | **Funds** panel (balances + faucet; no deposit-to-us) |
| `BalancePill` | on-chain unified balance |
| `ActivityDialog` | **Bet History** (Casino/Sports tabs, on-chain, explorer links, VRF proof) |
| casino lobby (`GameTile`, `GameLauncher`) | BetSwirl games (`@betswirl/ui-react` or our tiles, `07`) |
| `sports/*`, `predictions/*` | Azuro SDK data (`08`) |
| `src/lib/session.js` mock | Reown/wagmi connection |

## New frontend modules
```
apps/web/src/
  web3/
    wagmi.ts           # wagmi + Reown config (chains from packages/shared/chains.ts = Base Sepolia)
    useConnect.ts      # connect / disconnect / address / network-switch helpers
  data/
    useBalances.ts     # unified on-chain balance (casino + sports token)
    useBetHistory.ts   # merged history from BetSwirl + Azuro subgraphs
    betswirl/          # BetSwirl SDK client + place-bet hooks (07)
    azuro/             # Azuro SDK hooks + order build/sign (08)
```

## Reuse & keep
- Keep `ErrorBoundary`, `CurrencyProvider`, `OddsFormatProvider`, responsible-gambling UI, the lobby,
  event rows, odds buttons, bet slip, toasts, dev panel (from the imported UI).
- `BRAND_NAME` (WildStakes) drives the visible brand.

## Env (frontend, public only)
`VITE_REOWN_PROJECT_ID`, chain ids, public RPC, affiliate address (public). **No secrets in the bundle.**

## Acceptance criteria
- No Login/Register; a **Connect Wallet** button connects a real wallet and shows address + balance.
- Wrong-network → a working **Switch to Base Sepolia** CTA.
- Casino bet shows the per-bet confirmation + resolving state; sports bet shows the gasless sign flow.
- **Bet History** shows casino + sports, both with explorer links; casino rows verify via VRF proof.
- No secret in the frontend bundle.

_Last updated: 2026-07-01_
