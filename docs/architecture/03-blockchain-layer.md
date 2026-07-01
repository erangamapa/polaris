# 03 — Blockchain Layer (Chains)

> **SUPERSEDED (custody parts).** The custom `Vault.sol` + on-chain settlement below are **removed** —
> BetSwirl (casino) and Azuro (sports) are non-custodial protocols that handle custody/settlement. Kept for
> historical context. **What's still current:** the multi-chain strategy, updated here:
>
> - **Both casino (BetSwirl) and sports (Azuro) run on Base Sepolia** — one shared chain.
> - Bets use that chain's betting token; **casino bets cost per-bet gas + Chainlink VRF fee**; sports bets
>   are **gasless** (relayer).
> - **Co-located → one chain, one balance, no bridging** (LI.FI only if ever split later).
> - We deploy **no contracts** for the MVP (protocols provide them). Optional own BetSwirl games later may
>   involve BetSwirl-engine contracts (`07`).
>
> Everything below about `Vault.sol`, session-key settlement, and our own custody is **no longer built**.

---


## Chain strategy

### Tier 1 — MVP (build now)
- **Base Sepolia** (testnet) → **Base mainnet** (production, post-license).
- Rationale: cheapest EVM L2, best account-abstraction tooling, native Circle USDC, strong faucets.

### Tier 2 — Additional EVM chains (config + redeploy, low effort)
Ethereum, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche. Adding one = deploy the same
`Vault.sol`, add a `chains.ts` entry, point a deposit-watcher at it. **No architecture change.**

### Tier 3 — Non-EVM (separate future tracks, NOT day-one)
- **Solana** — requires a separate Rust/Anchor program, different wallet adapter (Phantom), different
  session-key mechanism. A genuine second integration.
- **Bitcoin** — no smart contracts; would need a Lightning/state-channel model. Separate project.

## Multi-chain config registry (`packages/shared/chains.ts`)

Single source of truth. All per-chain values live here; nothing chain-specific is hardcoded elsewhere.

```ts
export interface ChainConfig {
  id: number;                 // chain id (84532 = Base Sepolia)
  key: 'baseSepolia' | 'base' | 'arbitrum' | /* ... */;
  name: string;
  rpcUrlEnv: string;          // name of env var holding the RPC URL
  usdcAddress: `0x${string}`; // USDC (or test USDC) contract
  usdcDecimals: 6;
  vaultAddress?: `0x${string}`;  // filled after deploy
  explorer: string;
  isTestnet: boolean;
  vrf?: { coordinator: `0x${string}`; keyHash: string; subIdEnv: string }; // optional
}

export const CHAINS: Record<string, ChainConfig> = { /* baseSepolia first */ };
```

## The Vault contract (`packages/contracts/src/Vault.sol`)

**Purpose:** non-custodial custody. Holds player USDC. The player can always withdraw. The operator
can only apply a **net settlement** that is authorized by the player's own session-key permission
and bounded by their signed limits.

### Invariants (MUST hold — tested)
1. Only the depositor can withdraw their own balance (unilateral exit).
2. The operator/house has **no** function to move funds arbitrarily.
3. `settle` can only reduce a player's vault balance up to the amount authorized by a valid,
   unexpired session-key permission signed by that player.
4. If the backend/operator disappears, funds remain fully withdrawable by players — but only after the
   exit/dispute window (invariant 7) so unsettled losses can be applied first.
5. Sum of internal balances ≤ contract USDC balance at all times (no over-crediting).
6. **At-risk funds are locked.** While a session is active, up to the session's `maxSpend` is `locked`
   and NOT withdrawable. `withdraw` may only move `available − locked`.
7. **Exit is subject to a settlement/dispute window.** A player must `requestExit`; the operator then
   has a bounded window to submit the latest signed session net state (`settle`). Newest signed state
   wins. Only after the window (or after settlement) do locked funds release for withdrawal. This is
   what stops "withdraw before my losses settle" (see `14-security-threat-model.md` T1).

> Invariants 6 & 7 are the primary anti-drain mechanism. They resolve the tension between unilateral
> exit (protects the player) and unsettled off-chain losses (protects the house). Both must be tested.

### Interface (sketch — refine in implementation)

```solidity
interface IVault {
    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);
    event Settled(address indexed player, int256 net, bytes32 sessionId);

    event ExitRequested(address indexed player, uint256 releaseAt);

    function deposit(uint256 amount) external;              // pulls USDC via approve
    function withdraw(uint256 amount) external;             // player-only; only available − locked
    function balanceOf(address player) external view returns (uint256); // total (available + locked)
    function availableOf(address player) external view returns (uint256); // withdrawable now

    // Opens/locks a session: locks up to perm.maxSpend so at-risk funds can't be withdrawn.
    function openSession(SessionPermission calldata perm, bytes calldata playerSig) external;

    // Applies net session result and unlocks. `net` may be +/-. Bounded by perm.maxSpend & expiry;
    // one-time per perm.sessionId (replay-protected). Callable by the operator relayer.
    function settle(
        address player,
        int256 net,
        SessionPermission calldata perm,
        bytes calldata playerSig
    ) external;

    // Player-initiated exit if the operator is unresponsive. Starts the dispute window; after it
    // elapses with no valid settle, locked funds release. Protects the player without letting them
    // dodge unsettled losses (operator can settle during the window).
    function requestExit() external;
}

struct SessionPermission {
    address player;
    address gameContract;   // this vault
    uint256 maxSpend;       // cap the session can lose
    uint64  validUntil;     // expiry
    bytes32 sessionId;      // unique per grant (replay protection)
}
```

### Design notes
- Use **OpenZeppelin** `SafeERC20`, `ReentrancyGuard`, EIP-712 for `SessionPermission`.
- `settle` verifies `playerSig` over the `SessionPermission` (EIP-712) and enforces `maxSpend`,
  `validUntil`, and one-time `sessionId` use (nonce mapping) to prevent replay.
- Where the AA provider (thirdweb) already enforces session-key limits at the account level, the
  vault's on-chain check is defense-in-depth. Decide during implementation whether settlement flows
  through the smart account (session key signs the `settle` userOp) OR via the EIP-712 permission
  above. **Default: session key signs the `settle` transaction via the smart account** (simpler,
  uses thirdweb's enforcement); keep the EIP-712 struct as the authorization payload.
- A **challenge/withdraw timeout** guarantees exit if the operator never settles: after
  `validUntil`, the player can withdraw their full pre-session vault balance regardless.

### Tests (`Vault.t.sol`) — must cover
- deposit → balanceOf increases; withdraw → funds returned, only by owner.
- settle within permission → balance adjusts; settle beyond `maxSpend` → reverts.
- settle after `validUntil` → reverts; replay same `sessionId` → reverts.
- operator cannot drain; player exit works with operator offline.

## USDC

- **Testnet:** Circle test USDC on Base Sepolia (faucet — see `11`).
- **Mainnet:** native Circle USDC.
- 6 decimals. All balance math uses integer smallest-units (`bigint`). Never floats.

## Randomness

- **Default (fast path):** off-chain commit-reveal (see `06`). No on-chain RNG per bet.
- **Optional / high-stakes:** **Chainlink VRF v2.5** (supported on Base Sepolia + Base mainnet) for
  verifiable on-chain randomness. Requires a VRF subscription (see `11`). Use sparingly — it's
  slow/costly per call and defeats the fast loop if used per spin.

## Deploy scripts (`packages/contracts/script/Deploy.s.sol`)
- Deploy `Vault` bound to the chain's USDC address; write the resulting address into `chains.ts`
  (or a generated `deployments.json` the backend/frontend read).
- Deterministic per-chain; re-runnable; verifies on the block explorer.

_Last updated: 2026-07-01_
