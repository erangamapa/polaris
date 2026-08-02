# Coin Fighters — QA Test Cases & Acceptance Criteria

| Field | Value |
| --- | --- |
| **Feature** | Coin Fighters (TriBet Studio provider game) |
| **Paths** | Standalone: `/games/coin-fighters/index.html` · Lobby iframe: Casino → Coin Fighters |
| **Build / URL** | `http://127.0.0.1:4177/games/coin-fighters/index.html` (local QA server) |
| **Date** | 2026-07-31 |
| **Tester** | Auto (agent smoke run) |
| **Browser / device** | Cursor browser (Chromium) |
| **Build under test** | local workspace + Node QA static server |

**Last automated smoke run:** 2026-07-31 — **8/8 Pass** (`CF-SMOKE-01` … `CF-SMOKE-08`)

**Result key:** `Pass` · `Fail` · `Blocked` · `N/A`  
**Priority:** `P0` release blocker · `P1` must-fix · `P2` polish

---

## How to use this doc

1. Fill the header (URL, browser, tester).
2. Run **§0 Smoke** first. Any P0 Fail → stop, file bug, do not ship.
3. For each case: follow **Steps**, then mark **Result** only if every **Acceptance criteria** line is true.
4. Log failures in the **Bug log** with the case ID.

---

## Product acceptance criteria (rules of the game)

These are the product rules QA validates. Individual cases below map back here.

| AC ID | Acceptance criterion |
| --- | --- |
| **AC-FLOW-01** | After load, player must select a fighter (Rookie or Prezz) and press **FIGHT** before betting. |
| **AC-FLOW-02** | Match flow is: Select → Betting → Heads/Paws → Coin flip → Fight resolve → Betting (or round clear / KO). |
| **AC-WALLET-01** | Starting play-money balance is **1000**. Default bet is **10**. Bet range is **1–500**, never above balance. |
| **AC-WALLET-02** | On the first flip of a climb, stake is deducted from Balance immediately. Further flips in the same climb do not deduct again. |
| **AC-WALLET-03** | **CASH OUT** is enabled only when multiplier **> 1x** and a climb stake is live. Payout = **stake × multiplier**; then mult resets to **1x** and stake clears. |
| **AC-FLIP-01** | Player guesses **HEADS** or **PAWS**. Correct → win path. Wrong → lose path. |
| **AC-FLIP-02** | Coin land face matches outcome (win lands on player’s pick; loss lands on the opposite). |
| **AC-COMBAT-01** | Each fighter has **5** yellow life boxes. Win removes **1** from 2P. Loss removes **1** from 1P. |
| **AC-COMBAT-02** | Win multiplies current multiplier by **~2×** (1 → 2 → 4 → …). Loss resets multiplier to **1x** and clears the stake (bet is lost). |
| **AC-COMBAT-03** | Empty 2P boxes → round clear (**YOU WIN** / **KEEP FIGHTING**); streak & climb stay. Empty 1P boxes → **YOU LOSE** / **RESTART**. |
| **AC-CHAR-01** | Rookie wins use kick. Prezz wins use wig throw. |
| **AC-FAIR-01** | Footer shows **RTP ~97%** and a **Fairness** control. Fairness modal exposes server seed hash, client seed, nonce, last roll. |
| **AC-UI-01** | Betting controls (½, bet input, 2×, MAX, HEADS, PAWS, CASH OUT) are clickable when betting is allowed. |
| **AC-UI-02** | Top health HUD does not slide with hit animations; stage does not flash a black vertical bar on hits. |

---

## 0. Smoke suite (~10–15 min)

Run after every deploy. Fail any → stop.

| ID | Title | Maps to | Steps (short) | Acceptance criteria (all must pass) | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CF-SMOKE-01 | Load → character select | AC-FLOW-01 | Open game URL | Loading completes without error; **PLAYER SELECT** shows Rookie + Prezz; portraits visible | P0 | Pass | 2026-07-31 auto |
| CF-SMOKE-02 | FIGHT → betting live | AC-FLOW-01, AC-UI-01 | Select Rookie → **FIGHT** | Select hides; arena visible; Balance **1000**; Bet **10**; HEADS/PAWS enabled; CASH OUT disabled | P0 | Pass | 2026-07-31 auto |
| CF-SMOKE-03 | Win path | AC-FLIP-01, AC-COMBAT-01/02 | HEADS (retry until win) or use Skip video | Coin resolves; 1P attacks; 2P loses 1 box; center mult → **2.00x**; streak ≥ 1 | P0 | Pass | forced win; bal 990, win 20 |
| CF-SMOKE-04 | Lose path | AC-FLIP-01, AC-COMBAT-01/02 | PAWS/HEADS until loss on a fresh climb | 2P punches; 1P loses 1 box; stake lost; mult back to **1x** | P0 | Pass | forced loss after cash-out |
| CF-SMOKE-05 | Cash out | AC-WALLET-03 | Win once → **CASH OUT** | Balance increases by stake × mult; mult **1x**; CASH OUT disables | P0 | Pass | 990+20=1010 |
| CF-SMOKE-06 | CHANGE fighter | AC-FLOW-01 | In betting → **CHANGE** | Returns to character select; match reset | P0 | Pass | 2026-07-31 auto |
| CF-SMOKE-07 | Fairness | AC-FAIR-01 | Open **Fairness** | Modal shows hash, client, nonce; footer still shows RTP | P0 | Pass | RTP 97% |
| CF-SMOKE-08 | No stage black bar | AC-UI-02 | Win or lose once (hit FX) | No black vertical strip on left/right of stage during/after hit | P0 | Pass | right-edge fill 100% |

---

## 1. Character select

**Preconditions:** Fresh load or **CHANGE**.

| ID | Title | Steps | Acceptance criteria | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-SEL-01 | Default selection | Open select | Rookie has selected state; HEADS/PAWS are disabled while on select | P1 | | |
| CF-SEL-02 | Select Prezz | Tap **PREZZ** → **FIGHT** | Prezz is 1P on stage; next win uses wig attack (not kick) | P1 | | |
| CF-SEL-03 | Select Rookie | Tap **ROOKIE** → **FIGHT** | Rookie is 1P; next win uses kick | P1 | | |
| CF-SEL-04 | FIGHT starts match | Tap **FIGHT** | Select overlay hidden; **CHANGE** visible; betting controls enabled | P0 | | |
| CF-SEL-05 | CHANGE hidden on select | Stay on select | **CHANGE** is not shown | P2 | | |
| CF-SEL-06 | Portraits render | Open select | Both portraits load (no broken-image icon) | P2 | | |

---

## 2. Betting & wallet

**Preconditions:** Past **FIGHT**. Start balance **1000** unless noted.

| ID | Title | Steps | Acceptance criteria | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-BET-01 | Defaults | After FIGHT | Bet = **10**; Win preview = **10** (bet × 1x) | P1 | | |
| CF-BET-02 | Half | Set bet **20** → **½** | Bet becomes **10** | P1 | | |
| CF-BET-03 | Double | Set bet **10** → **2×** | Bet becomes **20** (or clamped to max/balance) | P1 | | |
| CF-BET-04 | Max | Press **MAX** | Bet = **min(500, balance)** | P1 | | |
| CF-BET-05 | Stake lock | Balance 1000, bet 10 → HEADS | Balance **990** while climb is live; stake locked | P0 | | |
| CF-BET-06 | Cash out gated | Fresh climb at 1x | **CASH OUT** disabled | P1 | | |
| CF-BET-07 | Cash out pays | Win to 2.00x → **CASH OUT** | Balance += stake × 2; mult **1x**; CASH OUT disabled; bet editable again | P0 | | |
| CF-BET-08 | Bet locked mid-climb | After stake locked, try ½ / 2× / MAX / input | Bet controls disabled until climb ends (cash out or bust) | P1 | | |
| CF-BET-09 | Insufficient funds | Set bet above balance | Cannot start a new climb (no deduct / flip blocked) | P1 | | |
| CF-BET-10 | Win preview | Change bet; after climb | **Win** always shows stake × current multiplier | P2 | | |
| CF-BET-11 | History chips | Win then lose | Round history shows **W** then **L** | P2 | | |
| CF-BET-12 | Streak | Win twice, then lose | Streak increments on wins; resets to **0** on loss | P1 | | |

---

## 3. Coin flip

| ID | Title | Steps | Acceptance criteria | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-FLIP-01 | HEADS starts flip | Skip video **OFF** → **HEADS** | Flip overlay appears; coin animates; **SKIP** visible | P0 | | |
| CF-FLIP-02 | PAWS starts flip | Skip video **OFF** → **PAWS** | Same as CF-FLIP-01 | P0 | | |
| CF-FLIP-03 | Skip flip | During spin → **SKIP** | Jumps to final face; overlay clears after short hold; fight continues | P0 | | |
| CF-FLIP-04 | Skip stops spin SFX | SFX on → spin → **SKIP** | Coin spin sound stops immediately | P0 | | |
| CF-FLIP-05 | Skip video toggle | Check **Skip video** → flip | No long spin; result face still shown briefly | P1 | | |
| CF-FLIP-06 | Face matches outcome | After flip, open Fairness **Last** | Landed face consistent with win/loss vs player pick | P1 | | |
| CF-FLIP-07 | Controls locked mid-flip | During flip | HEADS / PAWS / CASH OUT disabled | P1 | | |
| CF-FLIP-08 | Keyboard | Betting → press `1` / `2` | Triggers HEADS / PAWS | P2 | | |

---

## 4. Combat resolve & life boxes

| ID | Title | Steps | Acceptance criteria | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-CBT-01 | Rookie win attack | Win as Rookie | Kick lunge; 2P −1 box; mult climbs (~2×) | P0 | | |
| CF-CBT-02 | Prezz win attack | Win as Prezz | Grab → throw wig → impact; 2P −1 box | P1 | | |
| CF-CBT-03 | Lose attack | Lose a flip | 2P punches; 1P −1 box; stake lost; mult **1x** | P0 | | |
| CF-CBT-04 | Skip fight | Skip video OFF → win → **SKIP** during attack | Impact applied; returns to betting; not stuck | P1 | | |
| CF-CBT-05 | Mult climb | Win ×3 in one climb | Center HUD ~**1 → 2 → 4** | P0 | | |
| CF-CBT-06 | Bust flash | Climb to 2x+ then lose | Center mult briefly red, then **1x** | P2 | | |
| CF-CBT-07 | Round clear | Empty all 2P boxes | Victory path → **YOU WIN** + **KEEP FIGHTING** (or shortened if Skip video) | P0 | | |
| CF-CBT-08 | Keep fighting | Round clear → **KEEP FIGHTING** | Both bars refill to 5; streak/climb retained; betting resumes | P0 | | |
| CF-CBT-09 | Player KO | Empty all 1P boxes | Defeat → **YOU LOSE** → **RESTART** | P0 | | |
| CF-CBT-10 | Stage fill on hit | Any hit FX | No black vertical bar on stage edges | P0 | | |
| CF-CBT-11 | HUD stays put | Trigger hit shake | Top health bar / center mult frame do not slide L/R with shake | P0 | | |
| CF-CBT-12 | Dev −4 2P | Press **−4 2P** | Opponent loses up to 4 boxes (dev only) | P2 | | |
| CF-CBT-13 | Dev −4 1P | Press **−4 1P** | Player loses up to 4 boxes (dev only) | P2 | | |

---

## 5. Audio

| ID | Title | Steps | Acceptance criteria | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-AUD-01 | Quiet on select | On select, click UI | No combat kick/punch one-shots | P1 | | |
| CF-AUD-02 | BGM after FIGHT | **FIGHT** with music unmuted | Fight BGM loops | P1 | | |
| CF-AUD-03 | Mute music | Music button | BGM stops; muted visual state | P0 | | |
| CF-AUD-04 | Unmute music | Press again | BGM resumes | P1 | | |
| CF-AUD-05 | Mute SFX | Mute sound → win/lose | No kick/punch/coin/collect SFX | P0 | | |
| CF-AUD-06 | No stray combat SFX | Idle on betting, music on | No random kick/punch | P0 | | |
| CF-AUD-07 | Spin + skip | See CF-FLIP-04 | Spin SFX stops on SKIP | P0 | | |
| CF-AUD-08 | Cash out SFX | Cash out, SFX on | Coins collect plays once | P2 | | |

---

## 6. Fairness & RTP

| ID | Title | Steps | Acceptance criteria | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-FAIR-01 | Footer | View footer | Shows **RTP** (~97%) and **Fairness** (no cluttered hash row on mobile) | P0 | | |
| CF-FAIR-02 | Open Fairness | Click **Fairness** | Modal: server hash, client seed, nonce, last roll | P0 | | |
| CF-FAIR-03 | Close | Close / backdrop | Modal dismisses; game usable | P1 | | |
| CF-FAIR-04 | Copy hash | Copy in modal | Clipboard = full server seed hash; button feedback | P1 | | |
| CF-FAIR-05 | Copy client | Copy in modal | Clipboard = client seed | P1 | | |
| CF-FAIR-06 | Nonce | Flip several times → reopen | Nonce increased | P1 | | |
| CF-FAIR-07 | Last roll | After a flip | Last shows roll → HEADS/PAWS | P1 | | |
| CF-FAIR-08 | How to play | Open **How to play** | Rules readable; mentions Fairness / RTP | P2 | | |

---

## 7. CHANGE / restart

| ID | Title | Steps | Acceptance criteria | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-CHG-01 | CHANGE mid-bet | Betting → **CHANGE** | Character select; balance/streak/mult reset | P0 | | |
| CF-CHG-02 | CHANGE mid-flip | During coin spin → **CHANGE** | Overlay cleared; spin SFX stopped; select shown | P1 | | |
| CF-CHG-03 | CHANGE after KO | Lose → **CHANGE** | Can pick fighter; no stuck overlay | P1 | | |
| CF-CHG-04 | Switch kit | Rookie → CHANGE → Prezz → FIGHT | Prezz wig on wins | P1 | | |
| CF-CHG-05 | Overlay RESTART | Game over → **RESTART** | Full restart → character select | P1 | | |

---

## 8. Layout / responsive / iframe

| ID | Title | Steps | Acceptance criteria | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-UI-01 | Desktop stage | Wide viewport, play a round | Canvas fills gold frame; no permanent side black gutters | P0 | | |
| CF-UI-02 | Mobile | Width ≤560px | Bet row + HEADS/CASH OUT/PAWS tappable; CHANGE reachable | P1 | | |
| CF-UI-03 | Short / iframe | Open via TriBet ProviderGame iframe or short height | Select + controls reachable without broken layout | P1 | | |
| CF-UI-04 | Corner toggles | Check music, SFX, Skip video | All visible and tappable on desktop + mobile | P2 | | |
| CF-UI-05 | Bet area clickable | After FIGHT | ½, input, 2×, MAX, HEADS, PAWS receive clicks (not blocked by overlay) | P0 | | |

---

## 9. Cutscenes (Skip video OFF)

| ID | Title | Steps | Acceptance criteria | P | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-VID-01 | Victory video | Empty 2P, Skip video OFF | Victory video plays, then round-clear UI | P1 | | |
| CF-VID-02 | Defeat video | Empty 1P, Skip video OFF | Defeat video, then YOU LOSE | P1 | | |
| CF-VID-03 | Prezz variants | As Prezz, clear or KO | Prezz-specific victory/defeat clip | P2 | | |

---

## Exit criteria (release)

Ship only if:

- [ ] All **P0** cases in §0–§8 are **Pass** (or **N/A** with reason)
- [ ] No open **S1** bugs
- [ ] Smoke suite re-run on the release candidate URL
- [ ] Tested at least once in **desktop Chrome** and once in **TriBet iframe** (or mobile Chrome)

---

## Bug log

| Bug # | Failed case ID | Summary | Severity (S1–S3) | Steps / evidence | Status |
| --- | --- | --- | --- | --- | --- |
| B-001 | CF-… | | | | Open / Fixed |

**Severity guide:** S1 = unplayable / wrong money · S2 = major feature broken · S3 = polish / rare

---

## Suggested pass order

1. Smoke (`CF-SMOKE-*`)  
2. Bet clickability + flip + audio (`CF-UI-05`, `CF-FLIP-*`, `CF-AUD-*`)  
3. Combat + end states (`CF-CBT-*`, `CF-CHG-*`)  
4. Fairness + layout (`CF-FAIR-*`, `CF-UI-*`)  
5. Cutscenes if videos ship on (`CF-VID-*`)
