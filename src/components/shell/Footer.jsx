import { BRAND_NAME } from "@/lib/brand";

const links = [
  { label: "Casino games", href: "/casino/lobby" },
  { label: "Wallets & coins", href: "/help.html#wallets" },
  { label: "Game guide", href: "/help.html#game-modes" },
];

export function Footer({ onResponsibleGambling, onSupport }) {
  const linkClass = "text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <footer className="mt-8 border-t sm:mt-16">
      <div className="w-full max-w-[var(--content-max-w)] px-4 py-6 sm:py-8">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
          {links.map((link) => <a key={link.href} href={link.href} className={linkClass}>{link.label}</a>)}
          <button type="button" onClick={onSupport} className={linkClass}>Help &amp; support</button>
          <button type="button" onClick={onResponsibleGambling} data-test-id="footer-responsible-gaming" className={linkClass}>Responsible gaming</button>
        </nav>
        <div className="mt-6 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-muted-foreground/40 text-[10px] font-bold">18+</span>
            <span>Play responsibly. Gambling can be addictive.</span>
          </div>
          <span>© {new Date().getFullYear()} {BRAND_NAME}</span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Current games use provider demo credits, separate from your wallet. No deposit required; no cash winnings.
        </p>
      </div>
    </footer>
  );
}
