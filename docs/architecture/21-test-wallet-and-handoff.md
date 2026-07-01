# 21 — Test Wallet Provisioning & Handoff (MetaMask, testnet)

> **Purpose.** During the build, the agent creates **one MetaMask-importable test wallet**, funds it
> with **multiple balances across every supported testnet chain** (casino via BetSwirl + sports via Azuro),
> verifies the full play loop itself, then **hands you the 12-word seed phrase**. You import it into the
> MetaMask Chrome extension, connect to the app, and play on testnet — and it works.
>
> This is a **throwaway testnet wallet holding only test funds (no real value)** — safe to generate,
> fund, store locally, and hand over.

## What the agent does (during / at end of build)

1. **Generate a fresh BIP-39 wallet** (12-word mnemonic) with viem/ethers
   (`Wallet.createRandom()` / `generateMnemonic()`). The same mnemonic/private key imports directly into
   MetaMask. One wallet, one seed, used across all chains (same address on every EVM chain).

2. **Fund it on Base Sepolia (the one shared chain) for BOTH verticals:**
   - **Native gas** (test ETH) — needed for BetSwirl casino bets + the Chainlink VRF fee. (Azuro sports
     is gasless, but gas is still handy.)
   - **The betting token** — BetSwirl casino token + Azuro pool token (ideally one shared token, e.g.
     USDC; exact testnet token confirmed in Discovery `23`).
   - Fund enough of each to play both verticals immediately.
   - **Funding sources (programmatic):** Coinbase CDP Faucet API (ETH/USDC on supported testnets),
     BetSwirl/Azuro testnet faucets, Circle testnet faucet, and LI.FI testnet bridging where a token isn't
     directly faucetable. Some public faucets are CAPTCHA-gated → prefer API faucets (CDP) or protocol
     faucets; if a chain can only be funded manually, the agent flags that one item.

3. **Save the secret securely + locally (never committed):**
   - Write to gitignored **`.secrets/test-wallet.json`**:
     ```json
     {
       "mnemonic": "<12 words>",
       "privateKey": "0x...",
       "address": "0x...",
       "chains": [
         { "name": "BetSwirl testnet", "chainId": 0, "rpcUrl": "...", "currency": "BetSwirl",
           "explorer": "...", "funded": { "gas": "...", "casino": "..." } }
         /* one entry per funded chain: Azuro testnet chain(s) too */
       ]
     }
     ```
   - Also mirror the address (public) into build config; the mnemonic/privateKey stay only in
     `.secrets/` and are surfaced to you at handoff.

4. **Run the full autonomous E2E with THIS wallet** (`17` Step 3): connect → play a BetSwirl casino game →
   place an Azuro sports bet → view unified balance + on-chain history. This proves the exact wallet you
   receive already works before you touch it.

5. **Handoff report (when the agent says "build complete"):**
   - The **12-word seed phrase** (+ address).
   - The **chains + balances** funded (per chain: chainId, currency, amount, explorer link).
   - **MetaMask network details** to add for each non-default chain (Network Name, RPC URL, Chain ID,
     Currency Symbol, Block Explorer) — Base Sepolia testnet especially (it's a custom L3).
   - The **app URL** to connect to.

## What you do (after "build complete")

1. Install the **MetaMask** Chrome extension.
2. **Import wallet** → "Import using Secret Recovery Phrase" → paste the 12-word seed the agent gave you.
3. **Add the testnet networks** — either accept the app's `wallet_addEthereumChain` prompt on connect
   (the app adds BetSwirl + Azuro testnet chains automatically), or add them manually from the details above.
4. Open the app (WildStakes URL), **connect the wallet**, and play — casino (BetSwirl) and sports (Azuro),
   with the pre-funded testnet balances.

## Security rules (must hold)

- **Testnet only, no real value.** Never send real funds to this wallet; never reuse the seed for a real
  wallet. Treat it as disposable.
- The seed/private key live **only** in gitignored `.secrets/` locally + in the handoff message to you.
  **Never committed, never in the frontend bundle, never in logs.** `.secrets/` is gitignored (`13`).
- After you've imported it, you own it; the agent's copy can be discarded.

## Chains to fund (confirm exact list at build time)

| Vertical | Chain (testnet) | Gas | Betting token | Faucet |
|---|---|---|---|---|
| Casino | Base Sepolia testnet | native | BetSwirl betting token (via test USDC swap) | BetSwirl faucet |
| Sports | Azuro testnet chain (e.g. Polygon Amoy / Gnosis Chiado / Base Sepolia — per current Azuro deployment) | native | test USDC/USDT/WXDAI | Circle / CDP / Azuro faucet |

The agent confirms the current BetSwirl + Azuro **testnet chain IDs, RPC URLs, tokens, and faucets** at build
time (`17` preflight) and funds accordingly.

## Acceptance criteria

- Importing the provided seed into MetaMask shows the funded testnet balances on each chain.
- Connecting that wallet to the app and playing **casino + sports on testnet works end to end** — matching
  the agent's own E2E run.
- No secret is ever committed or exposed in the frontend.

_Last updated: 2026-07-01_
