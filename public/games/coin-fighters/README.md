# Coin Fighters

Street-fighter coin flip: pick **HEADS** or **PAWS**, climb a multiplier, cash out before you bust. ~97% RTP (3% house edge on a 2× even-money flip).

| Field | Value |
| --- | --- |
| **Game Class** | **A — Iframe** (TriBet Studio) |
| **Display profile** | `flexible` (`provider:coin-fighters` in `src/lib/gameDisplay.js`) |
| **Minimum viewport** | Mobile 320×568 · Desktop 960×600 (Flexible profile) |
| **Entry** | `/games/coin-fighters/index.html` |
| **Platform standard** | [`docs/design/tribet-originals-platform-standard.md`](../../../docs/design/tribet-originals-platform-standard.md) (BOY-36) |

## Compliance (BOY-36 MANDATORY floor)

| Rule | Coin Fighters |
| --- | --- |
| Mount only inside GameStage | ✅ sandboxed iframe via `ProviderGame` |
| Never alter shell / routing / wallet internals | ✅ no host DOM / router access |
| Emit `GameReady` (`ready`) | ✅ `src/bridge.js` → host `init` |
| Host owns settlement RNG when embedded | ✅ weighted win/lose outcomes via bridge `bet` |
| Climb / cash-out | ✅ each flip is a full host settle; climb re-bets the pot; cash-out is UI-only when bridged |
| Declare Game Profile | ✅ `FLEXIBLE` + `providerControls.sound` (music/SFX mutes) |
| No audio before user gesture | ✅ `unlockAudio` on first pointer |
| Never call Fullscreen API | ✅ none |
| Respect `prefers-reduced-motion` | ✅ skip long flip/cutscenes; no shake/flash; CSS transitions off |
| Teardown (§14) | ✅ `Game.destroy()` on `pagehide` — RAF/timers/bridge/audio/videos |

Standalone (open `index.html` directly) keeps the local play-money wallet + SHA-256 fairness session.

## Stack

Plain ES modules — no build step. Edit `src/*`, reload.

## Local

Open `index.html` in a browser, or play via TriBet Casino → Coin Fighters.
