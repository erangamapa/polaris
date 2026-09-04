import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { CASINO_USE_MAINNET, CASINO_CHAIN } from "@shared/chains";
import { useDevMockState } from "@/lib/devMock";
import { isArenaAllowed, resolveEffectivePlatformScope } from "@/lib/platformScope";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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

// `arenaId` (null for columns with no arena of their own) is what INACTIVE
// ARENA POLISH drives the whole column's disabled/muted treatment from —
// isArenaAllowed("casino", ...) always returns true (see
// lib/platformScope.js), so the Casino column is never affected by this;
// only a column whose arenaId is currently unavailable (Sports, while
// MVP-scoped) gets muted. One shared mechanism, not a Sports-specific
// branch, so a future Predictions footer column (there isn't one today —
// see the arenaId comment on FooterColumn below) would get the exact same
// treatment for free.
const COLUMNS = [
  { title: "Casino", links: ["Lobby", "Slots", "Live Casino", "Game Shows", "Providers"], arenaId: "casino" },
  { title: "Sports", links: ["Sportsbook", "Live", "Soccer", "Basketball", "Tennis"], arenaId: "sports" },
  { title: "About", links: ["Terms of Service", "Privacy Policy", "AML Policy", "Licensing"], arenaId: null },
];

// INACTIVE ARENA POLISH — every link in this footer is already a plain,
// unwired <button> with no onClick (this footer is decorative/pre-launch
// sitemap copy, not real navigation — see the file's own history), so
// "does not navigate" is already true regardless of arena state. What this
// component adds for a `disabled` column is purely the visual/AT-facing
// signal: muted opacity in place of the normal hover-brightens-to-white
// affordance, `aria-disabled`, and a "Coming soon" tooltip on hover/focus
// (the shared Tooltip component — same one the arena selector uses, not a
// second tooltip system) — never a second visible "Coming soon" label
// repeated next to every item. The button stays a real, focusable,
// disabled-attribute-free <button> throughout (never HTML `disabled`,
// which would also remove it from the tab order and make the tooltip
// keyboard-unreachable).
function FooterLink({ label, disabled, onClick }) {
  const link = (
    <button
      onClick={onClick}
      aria-disabled={disabled || undefined}
      className={cn(
        "text-sm",
        disabled
          ? "cursor-not-allowed text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {label}
    </button>
  );
  if (!disabled) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent>Coming soon</TooltipContent>
    </Tooltip>
  );
}

export function Footer({ onResponsibleGambling, onSupport }) {
  // Same shared resolver the arena selector/mobile nav/search scope
  // dropdown all use (see lib/platformScope.js) — one source of truth, not
  // a footer-specific copy of the same condition.
  const mock = useDevMockState();
  const platformScope = resolveEffectivePlatformScope(mock);
  return (
    // VISUAL REFRESH: mt-12 -> mt-16 — a clearer, more deliberate break
    // from the game section above so the footer reads as intentional
    // rather than attached directly to the last row of cards.
    <footer className="mt-16 border-t">
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
      <div className="w-full max-w-[var(--content-max-w)] px-4 py-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {COLUMNS.map((c) => {
            const disabled = c.arenaId ? !isArenaAllowed(c.arenaId, platformScope) : false;
            return (
              <div key={c.title}>
                <div className={cn("mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground", disabled && "opacity-50")}>
                  {c.title}
                </div>
                <ul className="space-y-1.5">
                  {c.links.map((l) => (
                    <li key={l}>
                      <FooterLink label={l} disabled={disabled} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support</div>
            <ul className="space-y-1.5">
              <li><button onClick={onSupport} className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Help Center</button></li>
              <li><button onClick={onSupport} className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Live Support</button></li>
              {/* One link, one destination — the shared Responsible Gaming
                  hub (see ResponsibleGamblingDialog.jsx). A separate
                  "Self-Exclusion" link was removed: it opened this exact
                  same dialog, which has no distinct self-exclusion action
                  to offer (no real backend — see that file's own honesty
                  note), so a second label implying a different destination
                  would be misleading (see PRIMARY GOAL: "do not create
                  duplicate dialogs"). */}
              <li><button onClick={onResponsibleGambling} data-test-id="footer-responsible-gaming" className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Responsible Gaming</button></li>
            </ul>
          </div>
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
