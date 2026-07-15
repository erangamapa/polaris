---
name: import-casino-game
description: >
  Import an EXISTING game into the TriBet casino from a source you provide — a
  local folder path or a GitHub repo/link — and wire it into the lobby. Use when
  someone says "import this game", "add this game repo", "bring in this game from
  <folder/URL>", or "vendor this game into the casino". Same result as
  build-casino-game (game running in the lobby with a tile on a mock balance),
  but the game is IMPORTED from a source instead of ideated from a prompt.
---

# Import a game into the TriBet casino

Same destination as `build-casino-game` — a game embedded in the Casino lobby with
a tile, loaded on demand, running on the mock balance — except the game comes from
a **source you're given** (a folder or a GitHub link), not from an idea.

The game runs inside a sandboxed iframe. If it speaks the **TriBet Game Bridge** it
shares the mock balance automatically; if it has its own internal economy it runs
self-contained (you can add the bridge later — Step 6).

## Input (what the user gives you)
One of:
- a **local folder path** (e.g. `~/games/my-crash`), or
- a **GitHub link** (repo URL, or a link to a subfolder / branch).

Pick a **`<slug>`** (kebab-case, e.g. `my-crash`) and a display **title**.

## Step 1 — Get the source
Use the helper (handles clone-vs-copy, finds the entry, strips junk):
```
bash skills/import-casino-game/scripts/import.sh "<source path or URL>" "<slug>"
```
It will:
- `git clone --depth 1` a URL (or copy a folder) into a temp dir,
- find the entry **`index.html`** (root, or `dist/`/`build/` — building first if the
  repo is a framework app with a build step),
- copy only the **real served files** into `public/games/<slug>/` (excludes `.git`,
  `node_modules`, tests, zips, CI/config).

If the helper can't decide (monorepo, unusual layout), do it by hand: build to
static if needed, then copy the folder that contains `index.html` (plus its assets)
into `public/games/<slug>/`. **Never vendor `node_modules`, tests, or archives.**

## Step 2 — Tile
Portrait **3:4** tile with the **game name** + **"TRIBET STUDIO"** at the bottom.
- If the source ships usable art/branding, adapt it.
- Otherwise generate an SVG: `cp skills/build-casino-game/templates/tile.svg public/img/games/<slug>.svg`
  and edit the key visual + the two title lines (mirror `public/img/games/vector-crash.svg`).

## Step 3 — Add to the lobby + link the game
Register one entry in `src/components/casino/ProviderGame.jsx` → `PROVIDER_GAMES`:
```js
{ key: "<slug>", title: "My Crash", src: "/games/<slug>/index.html",
  badge: "TriBet Studio", image: "/img/games/<slug>.svg" }
```
`CasinoCatalog` shows the tile in **Provider games**; `ProviderGame` opens it (lazy
iframe) and attaches the mock host.

## Step 4 — Runs (mock balance)
- If the imported game **already posts** TriBet Game Bridge messages → it shares the
  mock balance automatically (host in `src/lib/gameBridge.js`), no work.
- If it has its **own internal balance** (self-contained, like the vendored crash/
  dice) → it just runs as-is inside the iframe. That's fine for an import.

## Step 5 — Verify & ship
```bash
npm run build && npm run lint     # both must be green
```
Open the app → Casino → Provider games → the tile → play. Check the iframe loads and
there are **no external calls to the source's own backend** (self-contained only).
Commit on a branch, PR.

## Step 6 (optional) — Wire to shared balance / on-chain
To make an imported self-contained game bet from the shared mock balance (and later
on-chain), add the **bridge** hooks to its bet/settle points: on a bet, `postMessage`
`{type:'bet', amount, outcomes}` to the parent and animate the returned outcome;
stop settling internally. Then the same on-chain path applies.
See the **build-casino-game** skill's `reference/bridge-protocol.md` and
`reference/on-chain-extension.md`.

## Files this skill touches
- `public/games/<slug>/` — the imported game (static, served + iframed)
- `public/img/games/<slug>.svg` — the tile
- `src/components/casino/ProviderGame.jsx` — register in `PROVIDER_GAMES`

## Notes / guardrails
- **Only import sources you're authorized to use.** Vendoring copies the source into
  this repo.
- Keep it **self-contained**: an imported game must not call its own hosted backend
  or a separate Vercel deployment — it runs inside TriBet.
- Match repo conventions: `../../AGENTS.md`.

## References
- `scripts/import.sh` — the clone/copy/strip helper.
- sibling skill **build-casino-game** — the bridge protocol + on-chain extension + tile template.
