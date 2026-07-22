# 25 — Sports Taxonomy & Information Architecture

> Ideation-session audit (Cowork), grounded in Azuro's real data model, our own prior Stake
> teardown, and a live decision on Predictions sourcing. **Docs only — no code changed.** This is
> the spec for whichever agent wires `src/components/sports/*` to live Azuro data per `08`.

## 1. Confirmed: Azuro's real data hierarchy

Verified against Azuro's public subgraph/SDK docs (not assumed):

```
Sport → Country → League → Game → Condition (market) → Outcome
```

- **Game** entity carries `sport {sportId, slug, name}`, `league {slug, name}`, `country {slug, name}`,
  `participants {image, name}`, `startsAt`, `conditions {conditionId, outcomes, status}`.
- **Sport** entity tracks `activeGamesCount`, `activeLeaguesCount`, `activeCountriesCount` —
  coverage is a live, queryable number, not a fixed list.
- Feed data (games/conditions/odds) comes from the **data-feed graph**; bet history comes from the
  separate **client API graph**. Don't mix the two.

Sources: `gem.azuro.org/hub/apps/sdk/data-hooks/useSports`,
`github.com/Azuro-protocol/Azuro-subgraphs` (`api/src/utils/schema.ts`).

**Why this matters:** our current mock (`src/lib/sportsData.js`) already uses
`{ sport, region, league }` per event — structurally this is *already* Sport → Country → League,
just with `region` where Azuro says `country`. This is a field-rename-and-refetch, not a redesign.

## 2. Confirmed: Stake's real IA (our own prior teardown)

From `docs/stake-sportsbook-teardown.md` (primary-sourced from stake.com, fetched 2026-06-30),
section 1:

```
/sports/home                       ← Sports Home: featured/top matches, "live now," popular competitions
/sports/{sport}                    ← top-matches strip, then Live/Upcoming
/sports/{sport}/{country}/{league} ← grouped event list
/sports/{sport}/.../{event}        ← event detail, market-group tabs
```

Two distinct "featured" surfaces exist on the real site, not one:
1. **Sports Home** — cross-sport, aggregates the best inventory across every sport.
2. **Per-sport landing** — a "top matches" strip for *that* sport, before the country/league list.

The teardown's own `[BUILD]` note under §2 already flagged the per-sport strip as a gap ("A
simple 'Top matches' strip on the sport landing… Defer boosts"). **Sports Home does not exist in
the app today at all** — the app currently launches straight into a default sport
(`DEFAULT_NAV.sportId` in `src/lib/routing.js`).

## 3. The real design constraint: coverage is dynamic and sparse

The current mock has 4 fixed sports and a hand-picked, always-present set of leagues. Real Azuro
inventory — especially on **Base Sepolia testnet** — will not look like that:

- Some sports will have `activeGamesCount === 0` on a given day.
- Some countries will have exactly one obscure league and nothing else.
- There is no guarantee of recognizable competitions (Premier League, NBA, etc.) being live at any
  given moment.

**Design rule:** every level of the nav must be filtered by live inventory, not hardcoded.
- Sidebar sport list → only sports with `activeGamesCount > 0`.
- Country list within a sport → only countries with live/upcoming games.
- League list within a country → only leagues with live/upcoming games.

This also means **Sports Home is not optional polish** — on thin testnet inventory it's the page
most likely to be able to fill itself with *something*, by pooling across all sports instead of
committing to one sport's possibly-empty page.

## 4. Proposed structure

| Level | Source | Notes |
|---|---|---|
| **Sports Home** (new) | Pool top/soonest games across all sports + whatever is currently live | Doesn't exist yet. New route + component. |
| **Per-sport page** | `SportsApp.jsx`, existing | Add a "top matches" strip above the existing Live/Upcoming toggle (teardown gap, still open). |
| **Country → League grouping** | `groupByCompetition()`, existing | Swap `region`/`league` mock fields for real `country.name`/`league.name`; filter empty groups instead of assuming a fixed list. |
| **Event detail** | `EventDetail.jsx`, existing | Already matches the teardown spec (market-group tabs, "+N markets"). Swap mock `markets` for Azuro `conditions`. |
| **Routing** | `src/lib/routing.js` | Currently `/sports/:sport` only. Stake's real pattern is `/sports/:sport/:country/:league` and `/sports/:sport/.../:event` — event-detail URLs are already tracked as pending in `docs/frontend-mvp-checklist.md`; this is the same gap, now with a concrete target shape. |

## 5. Decision recorded: Predictions stays mocked

Azuro is sports-first. Non-sports markets (politics, etc.) are a **recent, limited expansion** —
e.g. a single US presidential election market — not a mature, broadly-available category, and
testnet coverage is likely thin-to-nonexistent right now.

**Decision (made in this ideation session): do not wire Predictions to Azuro yet.** Keep
`src/components/predictions/*` and `src/lib/predictionsData.js` exactly as they are (curated
mock Yes/No topics). Only `src/components/sports/*` gets wired to live Azuro data per this doc and
`08`. Revisit Predictions once Azuro's non-sports coverage is broad enough to be worth the swap —
options considered and deferred:
- Reframe Predictions as Azuro sports **outrights/futures** ("Champions League winner," "NBA
  champion") — genuinely on-chain, sports-adjacent, longer-horizon Yes/No framing.
- Wire to whatever non-sports Azuro markets exist today — rejected for now, testnet inventory too
  sparse to be worth it.

This keeps `08`'s title ("Sports **and Predictions** via Azuro") technically aspirational rather
than current — worth a status note in `08` itself when that file is next touched.

## 6. Field mapping (mock → Azuro), for whoever executes this

| Mock field (`src/lib/sportsData.js`) | Azuro field | Notes |
|---|---|---|
| `sport` (id string) | `sport.slug` / `sport.sportId` | |
| `region` | `country.name` / `country.slug` | direct rename |
| `league` | `league.name` / `league.slug` | direct rename |
| `home` / `away` | `participants[0].name` / `participants[1].name` | also carries `.image` — logo sourcing still unconfirmed per `08` open item 8 |
| `markets[]` | `conditions[]` | shape differs — needs its own mapping pass, not just a rename |
| `finalScore` (simulated) | resolved from Azuro settlement/oracle data | see `08` for the on-chain settlement flow |
| — (no mock equivalent) | `activeGamesCount` / `activeLeaguesCount` / `activeCountriesCount` | drives the "only show what's live" filtering in §3 |

## 7. Open items (not resolved in this session)

- Exact GraphQL queries for the Sport → Country → League → Game traversal (needs the live subgraph
  endpoint, per `08` open item 3).
- Whether "top matches" on Sports Home is ranked by turnover, start time, or a manual curation —
  no real-money volume exists on testnet to rank by, so likely start-time-soonest + live-first as
  a placeholder heuristic.
- League/team logo sourcing — still unconfirmed (`08` open item 8), same gap, not solved here.

_Last updated: 2026-07-19_
