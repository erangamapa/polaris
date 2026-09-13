import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { CASINO_USE_MAINNET, CASINO_CHAIN } from "@shared/chains";

// The money disclosure has to track the network the build actually bets on
// (see VITE_USE_MAINNET in @shared/chains). On testnet the balances really are
// simulated and saying so is correct; on mainnet the casino settles real funds
// on-chain, and telling a player their money is fake while taking it would be
// a lie with consequences. One flag drives both strings so they can never
// contradict the chain the app is pointed at.
const MONEY_NOTICE = CASINO_USE_MAINNET
  ? `Real-money play — casino bets settle on-chain on ${CASINO_CHAIN.name}.`
  : "Demo build — simulated balances, no real money.";
const MONEY_SENTENCE = CASINO_USE_MAINNET
  ? `${BRAND_NAME} settles casino bets with real funds on ${CASINO_CHAIN.name}. Only stake what you can afford to lose.`
  : `${BRAND_NAME} is a prototype — simulated balances, no real money.`;

// FOOTER NAV MVP MUTE — none of these destinations are real, routed pages
// yet (the whole footer has always been a decorative sitemap — every button
// here was already onClick-less/no-op before this pass; see git history),
// so unlike the top-level arena switcher (Sidebar.jsx/MobileBottomNav.jsx/
// PromoStrip.jsx — driven by lib/platformScope.js's isArenaAllowed, which
// tracks whether an ARENA is live) footer nav availability is its own,
// per-ITEM concern, deliberately decoupled from arena state: Casino being
// the one live arena doesn't mean "Slots" or "Providers" are real pages to
// link to, so every item below carries its own explicit `enabled` flag
// rather than inheriting a column-level or arena-level default. Flipping a
// single item to `enabled: true` (once that destination is real) is the
// entire re-enable step — no restructuring, no new component.
// Support's two items keep an `action` key (not a real onClick — a lookup
// key into ACTIONS below, built from the real onSupport/onResponsibleGambling
// handlers) so the underlying "open the real dialog" wiring survives being
// muted and is ready the moment `enabled` flips, matching every other
// column's shape instead of a bespoke Support-only branch.
const FOOTER_COLUMNS = [
  {
    title: "Casino",
    items: [
      { label: "Lobby", enabled: false },
      { label: "Slots", enabled: false },
      { label: "Live Casino", enabled: false },
      { label: "Game Shows", enabled: false },
      { label: "Providers", enabled: false },
    ],
  },
  {
    title: "Sports",
    items: [
      { label: "Sportsbook", enabled: false },
      { label: "Live", enabled: false },
      { label: "Soccer", enabled: false },
      { label: "Basketball", enabled: false },
      { label: "Tennis", enabled: false },
    ],
  },
  {
    title: "About",
    items: [
      { label: "Terms of Service", enabled: false },
      { label: "Privacy Policy", enabled: false },
      { label: "AML Policy", enabled: false },
      { label: "Licensing", enabled: false },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Help Center", enabled: false, action: "support" },
      { label: "Live Support", enabled: false, action: "support" },
      // One link, one destination — the shared Responsible Gaming hub (see
      // ResponsibleGamblingDialog.jsx). A separate "Self-Exclusion" item
      // was removed: it opened this exact same dialog, which has no
      // distinct self-exclusion action to offer (no real backend — see
      // that file's own honesty note), so a second label implying a
      // different destination would be misleading.
      { label: "Responsible Gaming", enabled: false, action: "responsibleGambling", testId: "footer-responsible-gaming" },
    ],
  },
];

// FOOTER NAV MVP MUTE — a plain, focusable <button> throughout (never HTML
// `disabled`, which would drop it from the tab order for no reason — there
// is no tooltip here to keep reachable, but a muted-but-still-focusable
// control is still the more honest a11y default than an invisible one).
// No Tooltip: unlike the top-level arena buttons (one or two items,
// "Coming soon" is useful signal there), wrapping all seventeen of these in
// a tooltip would just be noise — the muted styling alone is the signal
// here (see PRIMARY GOAL in the task this was built for).
function FooterLink({ label, enabled, onClick, testId }) {
  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      aria-disabled={!enabled || undefined}
      data-test-id={testId}
      className={cn(
        "text-sm",
        enabled
          ? "text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "cursor-default text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {label}
    </button>
  );
}

export function Footer({ onResponsibleGambling, onSupport }) {
  // Lookup table for the Support column's `action` keys (see
  // FOOTER_COLUMNS above) — keeps the config data-only/serializable while
  // still giving FooterLink a real handler to call once an item's `enabled`
  // flips to true.
  const ACTIONS = { support: onSupport, responsibleGambling: onResponsibleGambling };
  return (
    // VISUAL REFRESH: mt-12 -> mt-16 — a clearer, more deliberate break
    // from the game section above so the footer reads as intentional
    // rather than attached directly to the last row of cards.
    <footer className="mt-8 border-t sm:mt-16">
      {/* LAYOUT STABILITY: was mx-auto max-w-6xl — the Footer is the same
          component on every arena, but centering via mx-auto still reacts
          to <main>'s CURRENT width, which genuinely differs on Sports (the
          desktop betslip panel shrinks it) — same root cause as the arena
          content column above it (see ArenaPageColumn.jsx). Left-anchored
          instead, so its position never depends on which arena/betslip
          state is active.
          MAIN CONTENT WIDTH FIX: max-w-6xl (1152px) replaced with the same
          var(--content-max-w) ArenaPageColumn uses (see index.css), so the
          footer can never end up narrower or wider than the page content
          sitting above it. */}
      <div className="w-full max-w-[var(--content-max-w)] px-4 py-6 sm:py-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {FOOTER_COLUMNS.map((col) => {
            // A column heading only reads as "fully unavailable" once every
            // item under it is — so a future column with a mix of enabled/
            // disabled items doesn't mute a heading that still has a live
            // destination underneath it.
            const columnMuted = col.items.every((it) => !it.enabled);
            return (
              <div key={col.title}>
                <div className={cn("mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground", columnMuted && "opacity-50")}>
                  {col.title}
                </div>
                <ul className="space-y-1.5">
                  {col.items.map((it) => (
                    <li key={it.label}>
                      <FooterLink label={it.label} enabled={it.enabled} onClick={ACTIONS[it.action]} testId={it.testId} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-muted-foreground/40 text-[10px] font-bold">18+</span>
            <button onClick={onResponsibleGambling} className="hover:text-foreground">Play responsibly.</button>
            <span>Gambling can be addictive.</span>
          </div>
          <span className="text-muted-foreground/70">© {new Date().getFullYear()} {BRAND_NAME} · {MONEY_NOTICE}</span>
        </div>
        {/* No invented licensing claim, regulator name or named external
            helpline — none of those are real/approved for this prototype
            (see DATA HONESTY: "do not invent... licensing claims...
            regulatory body names"; SUPPORT AND INDEPENDENT HELP: "do not
            invent hotline numbers, organizations or local services"). The
            only real, working help channel this app has is its own
            Support system. */}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/60">
          {MONEY_SENTENCE} If gambling is affecting you or someone you know,{" "}
          <button onClick={onSupport} className="underline hover:text-foreground">contact Support</button>.
        </p>
      </div>
    </footer>
  );
}
