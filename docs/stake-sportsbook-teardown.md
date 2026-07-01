# Deep Teardown — Stake Sportsbook (build reference)

Grounded in Stake's own public pages (fetched 2026-06-30):
- Sportsbook rules — `stake.com/policies/sportsbook` (settlement rules, verbatim below)
- Bet Builder / Same Game Multi — `stake.com/blog/same-game-multi-bet-builder`
- Live vs Pre-Match — `stake.com/blog/live-betting-vs-pre-match-betting`
- Observed bet-slip + nav strings from rendered pages

> Scope: **sports only.** Sections end with a **[BUILD]** note = the tight mock subset to implement.

---

## 1. Information architecture (real URL structure)

```
/sports/home                      ← Sports Home (featured/top/live)
/sports/upcoming                  ← all upcoming fixtures
/sports/live                      ← in-play
/sports/{sport}                   ← e.g. /sports/soccer
/sports/{sport}/{country}/{league}← e.g. /sports/soccer/england/premier-league
/sports/{sport}/.../{event}       ← event detail (full markets)
```

Hierarchy is **Sport → Country/Region → League → Event → Market group → Market → Selection.** (We currently flatten to Region·League with one market — this is the core gap.)

**[BUILD]** Keep our hierarchy but add the **event detail** level and **market groups**.

## 2. Sports Home

Featured/top matches strip, "live now," popular competitions, boosted odds. Secondary tabs: **Home / Live / Upcoming / (My Bets)**.

**[BUILD]** A simple "Top matches" strip on the sport landing + keep Live/Upcoming. Defer boosts.

## 3. Event row → Event detail

- Row shows teams, time or live score+clock, the **most popular market inline**, and a **"+N markets"** affordance.
- Clicking opens the **event detail page**: header (teams, score/time, league), then **market-group tabs**, then market cards each with a line + selections.

**[BUILD]** Row keeps 1 inline market + "+N"; tapping opens a detail panel/page with grouped markets.

## 4. Markets & bet types (from Stake's own copy)

Per-match markets Stake lists: **1x2 / Moneyline, Over/Under (totals), Handicap, Asian Handicap, Asian Total, Double Chance, Both Teams To Score, Correct Score, Draw No Bet, Prop bets (first/next goalscorer, player rebounds/points/yards), Outrights.** Grouped under tabs incl. a **Bet Builder** tab.

Odds formats: user can switch **Decimal / Fractional / American**.

**[BUILD] core market set per event (mock):**
- **Match Result** (1X2 soccer / Moneyline 2-way others) — have it.
- **Total (Over/Under)** with a line (e.g. O/U 2.5).
- **Handicap / Spread** with a line (e.g. -1.5 / +1.5).
- (soccer only) **Both Teams To Score** (Yes/No) — cheap, adds realism.
Defer: Asian variants, correct score, props, outrights, bet builder.

## 5. Odds behaviour

- Pre-match odds are stable-ish; **live odds fluctuate and markets can be suspended without notice.**
- On movement, the slip must let the user **accept the new odds** (accept-odds-changes).

**[BUILD]** Mock **odds drift** (small random walk on a timer for live events) + a **"odds changed — accept"** state in the slip + an **accept-changes toggle**. Suspended state = greyed, unclickable.

## 6. Bet slip (observed strings + rules)

Real states/strings captured:
- Empty: **"Bet Slip is Empty"** + **"Use Bet Code"** + Total Stake `$0.00` / Payout `$0.00` + **"Register to Bet"** (logged out) → "Place Bet" (logged in).
- Tabs: **Single / Multi / Same Game Multi** (Bet Builder). SGM = multiple legs from one match; **all legs must land**.
- **Use Bet Code**: paste a numeric Bet ID to replicate a slip.
- **Stake Shield**: multi-bet protection (still win if 1 leg loses) — breadth.

**[BUILD]**
- Empty state copy + icon (we have a ticket icon — good).
- Single / Multi tabs (have). Defer SGM + Stake Shield + Bet Code.
- Logged-out CTA = **"Register to Bet"** → opens auth (we gate on place; switch the CTA label when logged out).
- Quick-stake chips on **singles too** (Stake has presets everywhere).

## 7. Cash Out (verbatim rules)

> - "Cashout may not be available on certain markets and events."
> - "A **time delay** is applied on every Cashout."
> - "Cashout will **not** be available if the event and/or market … is **suspended**."
> - "A Cashout attempt may not be successful if a market or event is suspended or **odds change** at the point in which the time delay is applied."
> - Partial cash-out is available (settle only part of the bet). **Not available on Same Game Multi.**

**[BUILD]** Cash-out on open singles/multi with:
- a **live cash-out value** (recomputed from current vs original odds),
- **partial** slider (e.g. cash out 50%),
- a short **time-delay** spinner on confirm,
- disabled when the (mock) market is suspended.
- Cash-out formula (mock): `cashoutValue ≈ stake × (originalOdds / currentOdds) × (1 − houseMargin)`; partial scales by fraction; remaining stake stays live.

## 8. Settlement rules (verbatim — the correctness spec)

> - **Push (2-way):** "In the event of a Winner market (home/away only) … results in a draw we will settle the market as **void**."
> - **Over/Under exact line:** "When an exact number is quoted … if the result will be the quoted line, then bets will be made **void**." (same for exact home/away handicap line)
> - **Postponed/abandoned:** "If a match is postponed or abandoned and is completed **within 48 hours** … settled with the final result. If not completed within 48 hours … undecided bets are **void**."
> - **Palpable error:** "obviously incorrectly displayed/calculated prices … we reserve the right to **void** … includes a deviation of **more than 100%** vs market average."
> - **Suspension:** odds can be suspended during an event (technical/fraud).
> - **Dead heat:** two+ tie → **void factor** = positions tied ÷ competitors tied.
> - **Outrights:** "All In Run Or Not" → **loss** if selection doesn't take part.
> - **Void ≠ wagered:** "Voided bets are **not counted** toward wagered amount or VIP progress."
> - **Totals of zero settle as Even.**

**[BUILD] settlement logic (mock):**
- Every event carries a **simulated `finalScore`** (e.g. `[2,1]`).
- On settle, resolve each market type from the score:
  - Match Result: compare scores (draw → 1X2 draw wins / 2-way → **void**).
  - Total: sum vs line (exact line → **void/push**; over/under otherwise).
  - Handicap: apply line to a side then compare (exact → **void**).
  - BTTS: both scores > 0.
- Support statuses: **won / lost / void (stake returned)**. (Defer dead-heat, half-win.)
- Void returns stake to available; not added to "wagered."

## 9. Live betting

- In-play with **live scores, live stats, live trackers, free live streams** (login required for streams).
- Markets **suspend without notice**; live-only markets (next goalscorer, next point).

**[BUILD]** Mock a ticking clock + occasional **suspend→resume** on a live event, and drift odds while live. Defer streams/trackers/live-only markets.

## 10. Deferred (breadth — do NOT build for the tight scope)

Same Game Multi / Bet Builder, Stake Shield, Use Bet Code, system bets, odds boosts, early payout, live streaming/trackers, VIP/rakeback, 45+ sports, racing/esports, bet sharing.

---

## Tight build plan (fast path to "feels like Stake")

1. **Event detail + market groups**: add Total (O/U) and Handicap (+ BTTS soccer) per event, grouped tabs, opened from the row's "+N markets".
2. **Simulated final score + real settlement** (won/lost/void, returns stake on void).
3. **Cash-out** (full + partial + time delay) with a live cash-out value on open bets.
4. **Odds format toggle** (dec/frac/american) + quick stakes on singles + logged-out "Register to Bet" CTA.
5. **Live odds drift + suspend/resume + accept-odds-changes** on live events.
6. **Bet receipt** + **My Bets** (Open / Settled / Cashed out) with per-leg detail.

This is the minimum that reproduces Stake's *feel* and *core logic* without the retention/scale machinery.
