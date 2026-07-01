# 04 — Wallet Connection & Session Keys (the fast-play magic)

This layer is what makes Polaris **non-custodial AND casino-fast** — the gap BetSwirl doesn't fill.

## The problem it solves

Naive "pull funds per bet" = a wallet popup + block confirmation per spin. Impossible at casino
speed. Session keys let the player approve **once**, then bets are signed automatically within a
bounded scope — no popup per round — while custody stays with the player.

## Chosen stack

- **Primary: thirdweb** — smart accounts (ERC-4337) + smart EOAs (ERC-7702) + session keys +
  bundler + paymaster in one SDK and one API key. Fewest moving parts.
  Docs: https://portal.thirdweb.com/react/v5/account-abstraction/permissions
- **Documented alternative: Coinbase Spend Permissions** — if targeting Coinbase Smart Wallet
  specifically; a "spender" can move a user's tokens up to a limit without per-tx signatures.
  Docs: https://docs.base.org/smart-wallet/guides/spend-permissions
- **Lower-level fallback: Pimlico permissionless.js** — bundler/paymaster if we ever drop thirdweb.

## Wallet connection

- **Reown AppKit** (formerly WalletConnect/Web3Modal) + **wagmi + viem** in `apps/web`.
- Supports MetaMask, Coinbase Wallet, WalletConnect, and others (matches the current mock's
  `WALLETS` list in `src/lib/session.js`).
- Requires a Reown **Project ID** (see `11`).

## Session-key lifecycle

```
1. GRANT   Player signs once: "Allow Polaris to place bets up to {maxSpend} USDC on {vault}
           for {duration}." → creates a scoped session key (thirdweb).
2. USE     Each bet is signed by the session key (client or backend relayer) — no popup.
           The key can ONLY call the vault's settle/bet path, ONLY up to maxSpend, ONLY until expiry.
3. SETTLE  Net session result applied on-chain (session key signs the settle userOp).
4. EXPIRE  Key auto-expires at `validUntil`; player can also revoke early.
```

### Scope constraints (MUST enforce)
- `maxSpend` — cap on total the session can lose (≤ the player's chosen amount).
- `validUntil` — hard expiry (default 2 hours).
- `target` — only the Vault contract's settle function. Nothing else.
- One `sessionId` — replay-protected on-chain.

**Blast radius if a session key leaks = its cap only.** Keep scopes tight.

## Where does the session key live?

Two options — decide in implementation:
- **Client-held session key** (thirdweb in-browser): bets signed client-side, backend verifies. Keeps
  the "player signs their own bets" property strongest.
- **Backend relayer session key** (thirdweb server wallet / Engine): backend co-signs within scope
  for lowest latency. Simpler UX.

**Default: backend relayer session key** for latency, with the on-chain permission (EIP-712, see `03`)
ensuring the backend can never exceed what the player authorized. This preserves non-custody: the
relayer key is powerless beyond `maxSpend`/`validUntil`.

## Gasless UX

- Use thirdweb's (or Pimlico's) **paymaster** to sponsor gas so players don't need native ETH for
  deposits/settles where possible. On testnet gas is free; wire the pattern now for mainnet parity.

## Frontend responsibilities (`apps/web`)
- Connect wallet (Reown).
- Deposit flow: `approve` + `Vault.deposit` (see `10`).
- "Enable fast play" prompt → grant session key with chosen `maxSpend`/duration.
- Show session status (active / expiring / revoke button).

## Acceptance criteria
- After one "enable fast play" signature, a player can place ≥ 50 consecutive casino bets with **zero**
  additional wallet popups.
- A session key cannot spend beyond `maxSpend` or after `validUntil` (proven by contract tests + an
  integration test).
- Revoking / expiry immediately blocks further bets.

_Last updated: 2026-07-01_
