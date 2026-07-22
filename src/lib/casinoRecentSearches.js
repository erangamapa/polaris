// Recent Casino search queries — plain text only (never wallet addresses or
// other personal input), so unlike favorites/recently-played this is never
// account-scoped: a search for "dice" isn't sensitive or account-specific.
// Same localStorage-with-try/catch shape App.jsx already uses for favorites
// and recently-played games.
const KEY = "tribet_recent_searches";
const CAP = 5;

export function loadRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((q) => typeof q === "string" && q.length > 0) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// Newest first, no duplicates (re-running an existing recent search just
// moves it to the front), capped at 5. Pure list transform + the one
// storage write, so callers (a React state setter) can use this directly:
// setRecent((list) => addRecentSearch(list, query)).
export function addRecentSearch(list, rawQuery) {
  const q = rawQuery.trim();
  if (!q) return list;
  const next = [q, ...list.filter((existing) => existing.toLowerCase() !== q.toLowerCase())].slice(0, CAP);
  saveRecentSearches(next);
  return next;
}

export function clearRecentSearches() {
  saveRecentSearches([]);
  return [];
}
