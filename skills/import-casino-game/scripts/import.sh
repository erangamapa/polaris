#!/usr/bin/env bash
# Import a game from a local folder or a GitHub link into public/games/<slug>.
# Finds the entry index.html (root, or dist/build — building first if needed) and
# copies only the real served files (no .git/node_modules/tests/zips).
#
# Usage:  bash skills/import-casino-game/scripts/import.sh "<source path or URL>" "<slug>"
set -euo pipefail

SRC="${1:-}"
SLUG="${2:-}"
[ -z "$SRC" ] || [ -z "$SLUG" ] && { echo "usage: import.sh <source path or URL> <slug>"; exit 1; }

# repo root = two levels up from this script's dir
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DEST="$ROOT/public/games/$SLUG"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ source: $SRC"
echo "→ slug:   $SLUG"

# 1) fetch the source into $TMP/src
if printf '%s' "$SRC" | grep -qE '^(https?://|git@)'; then
  # normalize a github blob/tree link to the repo root for cloning
  REPO="$(printf '%s' "$SRC" | sed -E 's#(github.com[:/][^/]+/[^/]+).*#\1#; s#/tree/.*##; s#/blob/.*##')"
  [ "${REPO%.git}" = "$REPO" ] && REPO="$REPO.git"
  echo "→ cloning $REPO"
  git clone --depth 1 "$REPO" "$TMP/src" >/dev/null 2>&1
else
  SRCPATH="${SRC/#\~/$HOME}"
  [ -d "$SRCPATH" ] || { echo "!! not a directory: $SRCPATH"; exit 1; }
  cp -R "$SRCPATH" "$TMP/src"
fi

# 2) locate the entry index.html (shallowest, ignoring junk dirs)
find_entry() {
  find "$TMP/src" -name index.html \
    -not -path '*/node_modules/*' -not -path '*/.git/*' \
    -not -path '*/test*/*' -not -path '*/example*/*' 2>/dev/null \
    | awk '{print gsub(/\//,"/"), $0}' | sort -n | head -1 | cut -d' ' -f2-
}
ENTRY="$(find_entry || true)"

# 3) if no static index.html but there's a build, build it
if [ -z "$ENTRY" ] && [ -f "$TMP/src/package.json" ]; then
  echo "→ no static index.html; attempting build…"
  ( cd "$TMP/src" && npm install --no-audit --no-fund >/dev/null 2>&1 && npm run build >/dev/null 2>&1 ) || true
  ENTRY="$(find_entry || true)"
fi
[ -z "$ENTRY" ] && { echo "!! no index.html found. Build to static manually, then re-run pointing at the output dir."; exit 1; }

ENTRY_DIR="$(dirname "$ENTRY")"
echo "→ entry: ${ENTRY#$TMP/src/}  (serving dir: ${ENTRY_DIR#$TMP/src/})"

# 4) copy the served dir into public/games/<slug>, stripping junk
mkdir -p "$DEST"
# junk patterns to leave out (dev scripts, tests, docs, backups, build config)
EXCL=(.git node_modules tests test .github coverage dist-info
      '*.zip' '*.test.*' '*.spec.*' '_*.cjs' 'tests.*'
      '*.bak' '*.md' '*mockup*' 'package*.json' 'tsconfig*.json'
      '*.config.js' '*.config.ts' '.gitignore' '.eslintrc*' 'DEPLOY.*')
if command -v rsync >/dev/null 2>&1; then
  RS=(); for e in "${EXCL[@]}"; do RS+=(--exclude "$e"); done
  rsync -a --delete "${RS[@]}" "$ENTRY_DIR"/ "$DEST"/
else
  rm -rf "$DEST"; mkdir -p "$DEST"; cp -R "$ENTRY_DIR"/. "$DEST"/
  ( cd "$DEST" && rm -rf .git node_modules tests test .github coverage && rm -f _*.cjs _*.js _*.mjs tests.* *.bak *.md *mockup* package*.json *.config.* .gitignore DEPLOY.* )
fi

echo "✓ imported into public/games/$SLUG"
echo "  next: add a tile (public/img/games/$SLUG.svg) + register in PROVIDER_GAMES,"
echo "  then npm run build && npm run lint."
ls -1 "$DEST" | sed 's/^/    /'
