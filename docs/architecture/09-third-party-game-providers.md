# 09 — Branded Studio Games (OPTIONAL / FUTURE — contract-gated)

> **Not part of the MVP.** The casino now runs on **BetSwirl** (`07`) — on-chain, no contracts, no bankroll.
> Branded studio content (Pragmatic/Evolution/BGaming/SOFTSWISS) remains **optional, future**, and still
> requires signed B2B contracts + sandbox credentials, which contradicts the zero-contracts goal. Keep
> this only if you later want licensed studio slots alongside BetSwirl's originals. Everything below stands
> as the integration approach **if** you ever pursue it.

---


Branded studio content (slots, live dealer) plugs into the **same seamless-wallet API** our own games
use (`05`, `07`). Building to the standard now means real providers drop in later with no rework.

## The one hard external dependency
Real studios (**Pragmatic Play, Evolution, BGaming, NetEnt**) and aggregators do **not** offer
self-serve API keys. Access — even to a sandbox with play money — requires a **commercial contract +
business vetting (KYB)**, often a **gaming license** (Curaçao is the common entry-level one). This is
a **business signature the owner must obtain** — no agent can create it.

## Crypto-friendly providers to approach (owner action)
- **SOFTSWISS Game Aggregator** — crypto-native, thousands of games. https://www.softswiss.com
- **BGaming** — crypto-friendly studio (owned by SOFTSWISS), demo available. https://www.bgaming.com
- **Slotegrator** — aggregator, works with pre-launch operators. https://slotegrator.com
- **EveryMatrix / SoftGamings** — larger aggregators.

All start with a **sales conversation**, not a signup form.

## Two "demo" types — only one connects to balance
| Type | Cost/gating | Wallet callbacks | Connects to our balance? |
|---|---|---|---|
| Public demo iframe (e.g. Pragmatic demo URLs) | free, no keys | none | ❌ no — cosmetic only |
| Real sandbox integration | contract + creds | yes | ✅ yes |

Public demos are useless for the crypto loop (no callbacks). Only a credentialed sandbox debits/credits
our ledger. Our own games (`07`) remove this dependency entirely for the working demo.

## Integration (once creds exist — all buildable by agents)
1. `POST /session/launch` calls the **provider's game-launch endpoint** with our session token,
   currency, mode, return URL → provider returns the game iframe URL.
2. Provider's RGS calls **our existing** `/wallet/balance`, `/wallet/bet`, `/wallet/win`,
   `/wallet/rollback` — authenticated by **HMAC** with the provider's shared secret.
3. We register **our callback base URL** with the provider (webhooks go provider → us).
4. Map the provider's game IDs into the lobby.

**No architecture change** — provider callbacks hit the same endpoints and ledger as our own games.
The ledger is backed by the vault, so studio games debit real/test crypto exactly like ours.

## Credentials the owner must obtain (per provider)
- Operator ID
- API key + secret
- **HMAC signing secret** (for callback verification)
- Sandbox game-launch base URL + game ID list

Stored in Vercel env (see `11`, `13`); referenced by env var name only.

## Acceptance criteria (when a sandbox is available)
- A provider sandbox game launches via `/session/launch` and its spins debit/credit our ledger.
- Callback HMAC verification rejects forged calls.
- The same `/wallet/*` code path serves both our games and the provider with no branching hacks.

_Last updated: 2026-07-01_
