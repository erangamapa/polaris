import { BRAND_NAME } from "@/lib/brand";

const COLUMNS = [
  { title: "Casino", links: ["Lobby", "Slots", "Live Casino", "Game Shows", "Providers"] },
  { title: "Sports", links: ["Sportsbook", "Live", "Soccer", "Basketball", "Tennis"] },
  { title: "About", links: ["Terms of Service", "Privacy Policy", "AML Policy", "Licensing"] },
];

export function Footer({ onResponsibleGambling, onSupport }) {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.title}</div>
              <ul className="space-y-1.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <button className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{l}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support</div>
            <ul className="space-y-1.5">
              <li><button onClick={onSupport} className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Help Center</button></li>
              <li><button onClick={onSupport} className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Live Support</button></li>
              <li><button onClick={onResponsibleGambling} className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Responsible Gambling</button></li>
              <li><button onClick={onResponsibleGambling} className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Self-Exclusion</button></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-muted-foreground/40 text-[10px] font-bold">18+</span>
            <button onClick={onResponsibleGambling} className="hover:text-foreground">Play responsibly.</button>
            <span>Gambling can be addictive.</span>
          </div>
          <span className="text-muted-foreground/70">© {new Date().getFullYear()} {BRAND_NAME} · Demo build — simulated balances, no real money.</span>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/60">
          {BRAND_NAME} is a prototype. In production, operated under licence (e.g. Curaçao / Medium Rare N.V.-style). If gambling is affecting you, contact a local helpline such as Gambling Therapy.
        </p>
      </div>
    </footer>
  );
}
