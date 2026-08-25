---
name: setup-test-wallet
description: >
  Interactively set up a browser wallet with testnet funds so someone can connect
  to TriBet and actually play. Use when someone says "set up a wallet", "I want
  to try the app", "how do I get test funds", "help me connect my wallet",
  "onboard me", or has just cloned this repo and cannot place a bet. Walks
  through: generate a throwaway testnet key → import it into MetaMask → get
  faucet funds → verify on-chain → open the app and connect.
---

# Set up a test wallet for TriBet

You are onboarding a **person**, live, at their keyboard. They may never have
used a crypto wallet. Your job is to get them from nothing to placing a bet,
doing every part you can do yourself and clearly handing them the parts only a
human can do (clicking around a browser extension, solving a faucet captcha).

TriBet is testnet-only. Everything here uses play money with no cash value.

## Non-negotiable rules

1. **Never tell them to import a SEED PHRASE into MetaMask.** Use *Import
   Account* → *Private Key*, which adds one extra account alongside whatever
   they already have. Restoring a seed phrase **replaces their entire wallet** —
   if they have a real wallet in that extension, they can lose access to it.
   `new-wallet.mjs` only ever emits a private key, for exactly this reason.
2. **Never write the key anywhere git can see it.** It belongs in `.secrets/`
   (gitignored) and nowhere else. Never paste it into a file you are editing, a
   commit, a PR, a Linear ticket, or a chat tool.
3. **Never suggest reusing this key on mainnet or sending it real funds.** Say
   this out loud once, plainly, when you hand the key over. Do not lecture
   repeatedly.
4. **Verify with `check-balances.mjs`, not with what a faucet claimed.** Faucets
   queue, rate-limit, and lie. On-chain balance is the only evidence.
5. **Stop and wait at every manual step.** Do not run ahead and report success
   for something they have not done yet.

## What they will end up with

| Chain | Token | For |
|---|---|---|
| Base Sepolia (84532) | ETH | Casino bets + gas |
| Polygon Amoy (80002) | POL | Sports gas |
| Polygon Amoy (80002) | USDT | Sports stake |

Casino and Sports fund **independently**. Casino needs only one faucet and is
much faster to reach, so default to getting Casino working first and treat
Sports as optional follow-on — do not make someone collect three tokens before
they see anything work.

---

## Step 0 — Ask what they want

Use `AskUserQuestion`. Two things decide the whole path:

- **Casino only, or Casino + Sports?** (Casino = one faucet, ~2 min. Both = three
  tokens, ~5–10 min and more faucet friction.)
- **Do they already have MetaMask installed?** If not, point them at
  <https://metamask.io/download> and wait. Any EVM wallet works (Rabby, Coinbase
  Wallet); MetaMask is assumed below because it is what most people have.

## Step 1 — Generate the wallet

```bash
node .claude/skills/setup-test-wallet/scripts/new-wallet.mjs
```

Writes `.secrets/player-wallet.json` and prints the address + private key. It
**refuses to run** if that path is not gitignored, and reuses an existing wallet
rather than overwriting one that may already hold funds.

Show them the key and say, once:

> This is a throwaway testnet key. It only controls play money. Never send real
> funds to this address, and never use this key on a real network.

## Step 2 — Import into MetaMask (they do this)

Give them these steps and **wait**:

1. Open MetaMask → click the account icon (top right) → **Add account or
   hardware wallet** → **Import account**.
2. Paste the private key → **Import**.
3. Rename it something like "TriBet test" so it is never confused with a real
   account.

They do **not** need to add the networks by hand — the app prompts to switch or
add the right chain when it needs one. If they want to add them manually anyway:

| Field | Base Sepolia | Polygon Amoy |
|---|---|---|
| RPC | `https://sepolia.base.org` | `https://polygon-amoy-bor-rpc.publicnode.com` |
| Chain ID | `84532` | `80002` |
| Symbol | `ETH` | `POL` |
| Explorer | `https://sepolia.basescan.org` | `https://amoy.polygonscan.com` |

Confirm the address MetaMask shows matches the one from Step 1 before moving on.

## Step 3 — Get Casino funds (Base Sepolia ETH)

Give them the address and a faucet. Try in this order — faucets rate-limit,
change their rules, and some want a mainnet balance or a sign-in:

1. <https://portal.cdp.coinbase.com/products/faucet> — Coinbase, pick **Base Sepolia**
2. <https://www.alchemy.com/faucets/base-sepolia>
3. <https://faucet.quicknode.com/base/sepolia>

Treat that list as a starting point, not gospel. If all three refuse them, say
so honestly and offer the fallback: any Sepolia ETH they can get can be bridged
to Base Sepolia via <https://superbridge.app>, or someone who already has funds
can send some to the address directly.

Then verify — this is the real check:

```bash
node .claude/skills/setup-test-wallet/scripts/check-balances.mjs
```

Exits non-zero until everything needed has landed. Drips can take a minute; if
it reports zero, wait and re-run before concluding the faucet failed.

## Step 4 — Sports funds (only if they asked for Sports)

**POL for gas** — try in order, same caveats as above:

1. <https://faucet.polygon.technology> — select **Polygon Amoy**
2. <https://www.alchemy.com/faucets/polygon-amoy>
3. <https://faucets.chain.link/polygon-amoy>

Wait for it to land (`check-balances.mjs`). Note: the Polygon faucet sits behind
Cloudflare bot protection, so `curl` gets a 403 while a real browser is fine —
do not diagnose that as the faucet being down.

**USDT for stakes** — no web faucet exists for this token; it is a test ERC-20
with an open `mint()`. Run it for them once POL has arrived:

```bash
node .claude/skills/setup-test-wallet/scripts/mint-test-usdt.mjs
```

Signs locally with the test key. It refuses with a clear message if POL has not
landed yet, rather than failing with a raw revert.

## Step 5 — Open the app and connect

Ask which they want:

- **Deployed:** <https://playtribet.vercel.app>
- **Local:** `npm install && npm run dev` → <http://localhost:5173>

**The deployed site is behind a shared password** (`SITE_PASSWORD`, see
`middleware.js`) — the browser shows a native "Restricted Area" prompt on first
load. If they do not have that password, they cannot use the deployed URL; send
them local instead. Do not let them sit guessing at a password box.

Then:

1. Click **Connect Wallet** → choose MetaMask → approve.
2. **Make sure the imported test account is the selected one** — MetaMask
   connects whichever account is active, and connecting the wrong one is the most
   common failure here. The header should show the address from Step 1.
3. Open **Casino**, pick a game, place a small bet. MetaMask will ask them to
   confirm the transaction, and to switch network if they are on the wrong chain
   — both are expected.

Confirm they actually see their balance in the header before calling it done.

## When something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Balance shows 0 in the app | Wrong account selected in MetaMask | Switch to the imported account; the app follows MetaMask's active account |
| Balance shows 0, right account | Wrong network | Let the app switch it, or switch manually in MetaMask |
| `check-balances.mjs` says "could not read" | Public RPC down | Re-run; it already falls back across several endpoints |
| Faucet says sent, balance still 0 | Queued, or sent to a different chain | Wait 1–2 min, re-run; confirm the faucet was set to the right network |
| Faucet refuses | Rate limit or mainnet-balance requirement | Try the next faucet in the list |
| Bet fails with gas error | Enough stake, not enough gas | Get more Base Sepolia ETH |
| Native password prompt on the deployed site | `SITE_PASSWORD` gate | Get the password, or run locally |

## Reference

- `packages/shared/chains.js` — pinned chains, contracts, and the USDT address
- `.secrets/player-wallet.json` — the generated wallet (gitignored)
- `packages/shared/scripts/provision.mjs` — the *other* wallet setup: house +
  player pair with mnemonics, for autonomous agent runs. Not for humans; do not
  point a person at it.
