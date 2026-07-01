# Polaris Sportsbook — Exhaustive Stake Parity Audit

Every difference/gap in the **sportsbook core flow** vs Stake.com. Scoped to sports only.

**Tag:** `[CORE]` = part of the core MVP betting loop (build for parity) · `[breadth]` = scale/retention, defer.
**Status of ours today:** 4 sports, sport rail, Live/Upcoming tabs, events grouped by Region·League, **one market per event** (2–3 outcomes), static decimal odds, bet slip (singles/multi + confirm), random auto-settlement, team/league search.

_Created: 2026-06-30 · reference: Stake.com sportsbook_

---

## A. Navigation & discovery

1. `[CORE]` No **Sports Home** landing — Stake opens on featured/top matches, boosted odds, "live now," top competitions. We drop straight into one sport's list.
2. `[CORE]` Secondary tabs incomplete — Stake has **Home / Live / Trending / My Bets** (+ search). We have only Live/Upcoming.
3. `[CORE]` No **event/league date filter** (Today / Tomorrow / by date).
4. `[CORE]` No **favourites** — can't star a sport, league, or match to pin it.
5. `[CORE]` Search filters the current sport only — Stake search spans all sports/leagues/teams.
6. `[breadth]` No **league landing page** (all fixtures in a competition).
7. `[breadth]` Only 4 sports; Stake has 45+ incl. esports, F1, racing, cricket, darts.
8. `[breadth]` No "Top competitions" quick links / A–Z sports list.

## B. Event & market depth — **the biggest gap**

9. `[CORE]` **One market per event.** Stake has many per match: Moneyline/1X2, **Over/Under (totals)**, **Handicap/Spread**, **Asian Handicap**, **Double Chance**, **Both Teams To Score**, **Correct Score**, **Draw No Bet**, **Player Props**, halves/quarters, etc.
10. `[CORE]` No **market groups/tabs** on an event (Popular / Goals / Halves / Player props …).
11. `[CORE]` No **event detail page** — clicking a match should open its full market list (+ stats/lineups). We only show the row.
12. `[CORE]` No **"+N markets"** indicator on the event row.
13. `[CORE]` No market-level **search/filter** within an event.
14. `[breadth]` No collapsible market groups, no pinned/most-popular markets.

## C. Odds

15. `[CORE]` **Odds are static** — no live movement, no up/down flash (green ▲ / red ▼).
16. `[CORE]` No **odds-format toggle** — Stake supports Decimal / Fractional / American. We only show decimal.
17. `[CORE]` No **min/max stake** or **max payout** per market.
18. `[breadth]` No **boosted / enhanced odds** markets.
19. `[breadth]` No implied-probability display toggle.

## D. Live / in-play

20. `[CORE]` "Live" is a filter with a **static score** — no ticking clock, no live score updates.
21. `[CORE]` No **market suspension** state (odds lock/grey when a goal/point happens).
22. `[breadth]` No live match tracker / animation, no live stats, no streaming.

## E. Bet slip mechanics

23. `[CORE]` **No cash-out** (full or partial) on open bets — Stake's signature in-play control.
24. `[CORE]` No **"accept odds changes"** toggle (auto-accept on movement).
25. `[CORE]` No **odds-change detection → re-accept** prompt (odds never move, so the confirm step is cosmetic).
26. `[CORE]` **Quick-stake chips only on Multi** — singles have none; Stake has presets on every stake input.
27. `[CORE]` No **currency shown** on stake/return, no balance-aware max, no per-market stake limits.
28. `[CORE]` Bet slip is **not global** — it lives inside SportsApp; leaving to casino clears it. Stake's slip persists app-wide.
29. `[breadth]` No **same-game multi / bet builder** (multiple selections from one match).
30. `[breadth]` No **system bets** (Yankee, Trixie, 2/3, etc.).
31. `[breadth]` No bet-protection ("Stake Shield").

## F. Bet confirmation & receipt

32. `[CORE]` **No bet receipt** after placing — Stake shows a receipt with bet ID, selections, stake, potential return, timestamp. We show a toast only.
33. `[CORE]` No **"pending acceptance → accepted"** state; Stake acknowledges acceptance.
34. `[CORE]` Confirmed odds aren't "locked" and shown post-placement.

## G. My bets / post-bet (in sportsbook context)

35. `[CORE]` No **in-context My Bets** tab (Open / Settled / **Cashed out**) inside sports. We only have global My Activity.
36. `[CORE]` No **per-bet detail** (each leg's result, settlement breakdown).
37. `[CORE]` No **live cash-out value** updating on open bets.
38. `[CORE]` No **rebet / bet again**.
39. `[breadth]` No bet sharing / bet slip screenshot.

## H. Settlement logic (core correctness)

40. `[CORE]` **Settlement is random**, not tied to the event's own (mock) final score. A bet on "Arsenal" should win iff the simulated result says Arsenal won.
41. `[CORE]` No **void / push** handling (postponed match, void market → stake returned).
42. `[CORE]` No **half-win / half-loss** (Asian handicap) or **dead-heat** rules.
43. `[CORE]` No settlement **receipt/notification** ("Your bet won — $X paid").

## I. Trust / info / compliance

44. `[CORE]` No **bet rules / market rules** link per market.
45. `[CORE]` No **max payout** disclosure.
46. `[breadth]` No "odds provided by" feed attribution.

---

## Recommended CORE build order (sports parity)

1. **Multi-market events + event detail page** — add Moneyline, Totals (O/U), Handicap per event, grouped into tabs, opened from an event detail view. (#9–13) — *the defining gap.*
2. **Settlement tied to a mock result** — each event carries a simulated final score; bets settle correctly (win/loss/void). (#40–43)
3. **Cash-out (full + partial)** with a live-ish cash-out value on open bets. (#23, 37)
4. **Live odds movement + accept-odds-changes toggle + re-accept prompt.** (#15, 24, 25)
5. **Bet receipt** + in-context **My Bets** (Open/Settled/Cashed out) with per-bet detail. (#32, 35, 36)
6. **Odds-format toggle** (dec/frac/american) + quick stakes on singles + stake limits/currency. (#16, 26, 27)
7. **Sports Home** landing (featured/top/live) + all-sports search + favourites + date filter. (#1–5)
8. **Live score/clock ticking + market suspension** on in-play. (#20, 21)

Defer (breadth): 45+ sports, esports/racing, bet builder/system bets, streaming/trackers, boosted odds, bet protection.
