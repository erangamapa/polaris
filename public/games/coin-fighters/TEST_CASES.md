# Coin Fighters — Test Cases

Manual QA checklist for `public/games/coin-fighters`.

| Field | Notes |
| --- | --- |
| **Build / URL** | e.g. `http://localhost:5173/games/coin-fighters/` or Vercel URL |
| **Date** | |
| **Tester** | |
| **Browser / device** | Chrome desktop · Chrome mobile · iframe |

**Result key:** `Pass` · `Fail` · `Blocked` · `N/A`  
**Priority:** `P0` smoke-critical · `P1` core · `P2` polish

---

## 0. Smoke suite (~10–15 min)

Run these first after any deploy. If any fail, stop and file a bug.

| ID | Title | Priority | Result | Notes |
| --- | --- | --- | --- | --- |
| CF-SMOKE-01 | Load game → character select appears | P0 | | |
| CF-SMOKE-02 | FIGHT → arena + betting controls enabled | P0 | | |
| CF-SMOKE-03 | HEADS win path (kick / life box / streak) | P0 | | |
| CF-SMOKE-04 | PAWS lose path (punch / life box / stake lost) | P0 | | |
| CF-SMOKE-05 | Cash out banks bet × multiplier | P0 | | |
| CF-SMOKE-06 | CHANGE returns to character select | P0 | | |
| CF-SMOKE-07 | Fairness popup opens; RTP still visible in footer | P0 | | |
| CF-SMOKE-08 | No black vertical bar on stage after a hit | P0 | | |

---

## 1. Character select

**Preconditions:** Fresh load (or press CHANGE).

| ID | Title | Steps | Expected | Priority | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-SEL-01 | Default selection | Open select screen | Rookie selected (yellow border); HEADS/PAWS disabled | P1 | | |
| CF-SEL-02 | Select Prezz | Tap PREZZ → FIGHT | Prezz is 1P; wig attack style on wins | P1 | | |
| CF-SEL-03 | Select Rookie | Tap ROOKIE → FIGHT | Rookie is 1P; kick attack on wins | P1 | | |
| CF-SEL-04 | FIGHT starts match | Tap FIGHT | Select overlay hides; CHANGE visible; betting enabled | P0 | | |
| CF-SEL-05 | CHANGE hidden on select | On select screen | CHANGE button not shown | P2 | | |
| CF-SEL-06 | Portraits render | Open select | Both portraits load (not broken images) | P2 | | |

---

## 2. Betting & wallet

**Preconditions:** Match started (past FIGHT). Starting balance = 1000 unless noted.

| ID | Title | Steps | Expected | Priority | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-BET-01 | Default bet | After FIGHT | Bet = 10; Win preview = bet × 1.00x | P1 | | |
| CF-BET-02 | Half bet | Set bet 20 → ½ | Bet becomes 10 | P1 | | |
| CF-BET-03 | Double bet | Set bet 10 → 2× | Bet becomes 20 (clamped to max/balance) | P1 | | |
| CF-BET-04 | Max bet | Press MAX | Bet = min(500, balance) | P1 | | |
| CF-BET-05 | Stake deducted on flip | Balance 1000, bet 10 → HEADS | Balance 990 while climb live | P0 | | |
| CF-BET-06 | Cash out disabled at 1x | Fresh climb | CASH OUT disabled | P1 | | |
| CF-BET-07 | Cash out after win | Win once (2.00x) → CASH OUT | Balance increases by stake × mult; mult resets to 1x; CASH OUT disables | P0 | | |
| CF-BET-08 | Bet locked mid-climb | After locking stake, try edit bet | Bet controls disabled until climb ends | P1 | | |
| CF-BET-09 | Insufficient funds | Bet > balance | Cannot start flip (or bet clamped) | P1 | | |
| CF-BET-10 | Win preview updates | Change bet / after multiplier climb | WIN shows stake × current multiplier | P2 | | |
| CF-BET-11 | Round history chips | Win then lose | History shows W then L chips | P2 | | |
| CF-BET-12 | Streak counter | Win twice in a climb | Streak increments; lose resets to 0 | P1 | | |

---

## 3. Coin flip

| ID | Title | Steps | Expected | Priority | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-FLIP-01 | HEADS starts flip | Skip video OFF → HEADS | Overlay shows spinning coin; SKIP visible | P0 | | |
| CF-FLIP-02 | PAWS starts flip | Skip video OFF → PAWS | Same as above | P0 | | |
| CF-FLIP-03 | Skip flip animation | During spin press SKIP | Jumps to result face; overlay dismisses after short hold | P0 | | |
| CF-FLIP-04 | Skip stops spin SFX | Sound on → spin → SKIP | Coin spin audio stops immediately | P0 | | |
| CF-FLIP-05 | Skip video toggle | Check Skip video → HEADS | No long spin; result face still shown briefly | P1 | | |
| CF-FLIP-06 | Result face matches outcome | Note Last roll in Fairness after flip | Coin lands on HEADS or PAWS consistent with win/loss vs pick | P1 | | |
| CF-FLIP-07 | Controls locked mid-flip | During flip | HEADS / PAWS / CASH OUT disabled | P1 | | |
| CF-FLIP-08 | Keyboard 1 / 2 | Press `1` / `2` while betting | Triggers HEADS / PAWS | P2 | | |

---

## 4. Combat resolve & life boxes

Each side starts with **5** yellow life boxes. Correct guess costs opponent 1 box; wrong guess costs player 1 box.

| ID | Title | Steps | Expected | Priority | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-CBT-01 | Win → player attack | Win as Rookie | Kick lunge; 2P loses 1 box; multiplier climbs (~2×) | P0 | | |
| CF-CBT-02 | Win → Prezz wig | Win as Prezz | Grab → throw wig → impact; 2P loses 1 box | P1 | | |
| CF-CBT-03 | Lose → opponent punch | Lose a flip | 2P punches; 1P loses 1 box; stake lost; mult → 1x | P0 | | |
| CF-CBT-04 | Skip fight anim | Skip video OFF → win → SKIP during attack | Impact applied; resolve finishes without stuck state | P1 | | |
| CF-CBT-05 | Multiplier climb | Win 1 → 2 → 3 | ~1x → 2x → 4x (center HUD) | P0 | | |
| CF-CBT-06 | Bust flash | Climb to 2x+ then lose | Center mult flashes red then resets to 1x | P2 | | |
| CF-CBT-07 | Round clear | Empty all 2P boxes | Victory path → YOU WIN / KEEP FIGHTING (or skip-video short path) | P0 | | |
| CF-CBT-08 | Keep fighting | Round clear → KEEP FIGHTING | Both life bars refill; streak/climb retained; betting resumes | P0 | | |
| CF-CBT-09 | Player KO | Empty all 1P boxes | Defeat path → YOU LOSE → RESTART | P0 | | |
| CF-CBT-10 | Stage fill after hit | Win or lose (hit FX) | No black vertical bar on right of stage | P0 | | |
| CF-CBT-11 | Dev −4 2P | Press −4 2P | Opponent loses up to 4 boxes (dev only) | P2 | | |
| CF-CBT-12 | Dev −4 1P | Press −4 1P | Player loses up to 4 boxes (dev only) | P2 | | |

---

## 5. Audio

| ID | Title | Steps | Expected | Priority | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-AUD-01 | Silent until FIGHT | On select, click around | No kick/punch SFX from unlock; BGM not required yet | P1 | | |
| CF-AUD-02 | BGM after FIGHT | Press FIGHT (music unmuted) | Fight BGM starts looping | P1 | | |
| CF-AUD-03 | Mute music | Press music button | BGM stops; button shows muted state | P0 | | |
| CF-AUD-04 | Unmute music | Press again | BGM resumes | P1 | | |
| CF-AUD-05 | Mute SFX | Mute sound → win/lose | No kick/punch/coin/collect SFX | P0 | | |
| CF-AUD-06 | No random combat SFX | Idle on betting with music on | No stray kick/punch one-shots | P0 | | |
| CF-AUD-07 | Spin SFX + skip | See CF-FLIP-04 | Spin stops on SKIP | P0 | | |
| CF-AUD-08 | Cash out SFX | Cash out with SFX on | Coins collect sound plays once | P2 | | |

---

## 6. Fairness & RTP footer

| ID | Title | Steps | Expected | Priority | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-FAIR-01 | Footer content | View footer | Shows **RTP** + **Fairness** only (no Edge, no inline hash) | P0 | | |
| CF-FAIR-02 | Open Fairness | Click Fairness | Modal with server hash, client seed, nonce, last roll | P0 | | |
| CF-FAIR-03 | Close Fairness | Close / click backdrop | Modal dismisses | P1 | | |
| CF-FAIR-04 | Copy hash | Copy in modal | Clipboard gets full server seed hash; button feedback | P1 | | |
| CF-FAIR-05 | Copy client | Copy in modal | Clipboard gets client seed | P1 | | |
| CF-FAIR-06 | Nonce increments | Flip several times → reopen Fairness | Nonce increases | P1 | | |
| CF-FAIR-07 | Last roll updates | After a flip | Last roll shows value → HEADS/PAWS | P1 | | |
| CF-FAIR-08 | How to play | Open How to play | Rules readable; mentions Fairness for verify | P2 | | |

---

## 7. CHANGE / restart

| ID | Title | Steps | Expected | Priority | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-CHG-01 | CHANGE mid-bet | In betting → CHANGE | Back to select; match reset (balance/streak/mult) | P0 | | |
| CF-CHG-02 | CHANGE mid-flip | During coin spin → CHANGE | Overlay cleared; spin SFX stopped; select shown | P1 | | |
| CF-CHG-03 | CHANGE after game over | Lose → CHANGE | Can pick new fighter without stuck overlay | P1 | | |
| CF-CHG-04 | Switch fighter | Rookie fight → CHANGE → Prezz → FIGHT | Prezz kit active (wig on wins) | P1 | | |
| CF-CHG-05 | Overlay RESTART | Game over → RESTART | Same as full restart → character select | P1 | | |

---

## 8. Layout / responsive

| ID | Title | Steps | Expected | Priority | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-UI-01 | Desktop stage fill | Wide viewport, play a round | Canvas fills gold frame; no side black gutters | P0 | | |
| CF-UI-02 | Mobile layout | ≤560px width | Controls usable; CHANGE reachable; RTP row compact | P1 | | |
| CF-UI-03 | Short height | Short window / iframe | Select + controls still reachable | P1 | | |
| CF-UI-04 | Audio / skip controls | Corner toggles | Music, SFX, Skip video visible and tappable | P2 | | |

---

## 9. Cutscenes (Skip video OFF)

| ID | Title | Steps | Expected | Priority | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CF-VID-01 | Victory cutscene | Empty 2P with Skip video OFF | Victory video then round-clear UI | P1 | | |
| CF-VID-02 | Defeat cutscene | Empty 1P with Skip video OFF | Defeat video then YOU LOSE | P1 | | |
| CF-VID-03 | Prezz victory/defeat | As Prezz, clear or get KO’d | Prezz-specific video variant plays | P2 | | |

---

## Bug log template

| Bug # | Failed case ID | Summary | Severity | Steps / evidence | Status |
| --- | --- | --- | --- | --- | --- |
| B-001 | CF-… | | S1–S3 | | Open / Fixed |

---

## Suggested pass order

1. Smoke (`CF-SMOKE-*`)  
2. Flip + audio (`CF-FLIP-*`, `CF-AUD-*`) — recent regressions  
3. Combat + end states (`CF-CBT-*`, `CF-CHG-*`)  
4. Fairness + layout (`CF-FAIR-*`, `CF-UI-*`)  
5. Cutscenes if shipping with video on (`CF-VID-*`)
