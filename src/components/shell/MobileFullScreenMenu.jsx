import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

// One full-screen navigation layer, reused for all three arenas — never a
// side drawer, never the desktop sidebar's markup. `primaryItems` and
// `utilityItems` are the same shape the desktop sidebar already renders
// (App.jsx derives both from one source of truth), so this is purely a
// different presentation of identical data, not a second navigation model.
//
// Built on Radix Dialog: focus trap, Escape-to-close, and background
// inert/aria-hidden come from the primitive for free — this component only
// owns full-screen layout, the two-group (primary/utility) list, the exact
// motion timings, and (since the trigger lives outside this Root/Portal)
// explicit focus-return.
//
// Covers the viewport (100dvh, not 100vh, so browser address-bar expand/
// collapse never clips the header or bottom nav) at z-[70], but the bottom
// nav stacks *above* it at z-[80] (see MobileBottomNav) and stays
// interactive the whole time, so "tap Menu again" / "switch arena" both
// work as direct taps rather than needing a separate close step first.
export function MobileFullScreenMenu({ open, title, primaryItems, utilityItems, selected, onSelect, onClose }) {
  const handleItemClick = (item) => {
    if (item.action) item.action();
    else onSelect(item.id);
    onClose();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-x-0 top-0 z-[70] h-dvh bg-background data-[state=open]:animate-[mobile-menu-backdrop-in_180ms_ease-out] data-[state=closed]:animate-[mobile-menu-backdrop-out_190ms_ease-in] motion-reduce:animate-none"
        />
        <DialogPrimitive.Content
          id="mobile-fullscreen-menu"
          className="fixed inset-x-0 top-0 z-[70] flex h-dvh flex-col bg-background outline-none data-[state=open]:animate-[mobile-menu-content-in_230ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[mobile-menu-content-out_190ms_cubic-bezier(0.4,0,1,1)] motion-reduce:animate-none"
          onCloseAutoFocus={(e) => {
            // Radix's default auto-focus-return tracks a <DialogTrigger>;
            // the trigger here is the bottom nav's Menu button, which sits
            // entirely outside this Root/Portal, so there's nothing for the
            // default behavior to restore to — target it explicitly instead.
            e.preventDefault();
            document.getElementById("mobile-menu-trigger")?.focus();
          }}
        >
          {/* Header — the top-right X is the primary, clearest close
              affordance (see MobileBottomNav's Menu item, which stays a
              plain burger and never shows a second competing X). Sized as
              a restrained icon button, not a dominant CTA. */}
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
            <DialogPrimitive.Title className="text-base font-bold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close menu"
              className="grid size-12 place-items-center rounded-2xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-6" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Vertical structure: primary list pinned to the top, a flexible
              spacer absorbs any extra height so the utility group sits
              near the bottom on tall screens without being absolutely
              pinned (which would break short screens) — the whole nav
              scrolls internally instead when content exceeds the viewport.
              Bottom padding clears the bottom nav bar, which stacks above
              this menu — see MobileBottomNav — using the same shared
              --mobile-nav-height every other mobile scroll surface uses. */}
          <nav
            aria-label={`${title} sections`}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom,0px)+16px)] pt-3"
          >
            <ul className="space-y-0.5">
              {primaryItems.map((item) => (
                <MenuRow key={item.id} item={item} active={selected === item.id} onClick={() => handleItemClick(item)} />
              ))}
            </ul>

            <div className="flex-1" aria-hidden="true" />

            {utilityItems.length > 0 && (
              <>
                <div className="my-3 border-t" aria-hidden="true" />
                <ul className="space-y-0.5">
                  {utilityItems.map((item) => (
                    <MenuRow key={item.id} item={item} active={selected === item.id} onClick={() => handleItemClick(item)} />
                  ))}
                </ul>
              </>
            )}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Section icons come from two different sources in this app: lucide
// components (Casino/Predictions categories) and plain emoji strings
// (Sports, e.g. "⚽" — see lib/sportsData.js). Rendering a string directly
// as `<Icon />` would try to mount an HTML element named "⚽", which is
// invalid — branch on the type like the desktop sidebar's ItemIcon does.
// Fixed-width slot so labels align regardless of which icon variant renders.
function ItemIcon({ icon }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center" aria-hidden="true">
      {!icon ? null : typeof icon === "string" ? (
        <span className="text-base">{icon}</span>
      ) : (
        (() => { const Icon = icon; return <Icon className="size-5" />; })()
      )}
    </span>
  );
}

function MenuRow({ item, active, onClick }) {
  return (
    <li>
      <button
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-lg px-2.5 text-left text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "min-h-[64px] bg-secondary/80 font-semibold text-foreground" : "min-h-[56px] text-muted-foreground active:bg-secondary/40 active:text-foreground"
        )}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute inset-y-2.5 start-0 w-[2px] rounded-full"
            style={{ background: "var(--product-primary)" }}
          />
        )}
        <ItemIcon icon={item.icon} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.count > 0 && (
          <StatusBadge variant="neutral" size="medium" count={item.count} ariaLabel={`${item.count} ${item.label}`} />
        )}
      </button>
    </li>
  );
}
