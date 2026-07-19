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
// Covers the viewport at z-[70], but the bottom nav stacks *above* it at
// z-[80] (see MobileBottomNav) and stays interactive the whole time, so
// "tap Menu again" / "switch arena" both work as direct taps rather than
// needing a separate close step first. The scroll area's bottom padding
// clears the bar so the last utility row is never hidden under it.
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
          className="fixed inset-0 z-[70] bg-background data-[state=open]:animate-[mobile-menu-backdrop-in_180ms_ease-out] data-[state=closed]:animate-[mobile-menu-backdrop-out_190ms_ease-in] motion-reduce:animate-none"
        />
        <DialogPrimitive.Content
          id="mobile-fullscreen-menu"
          className="fixed inset-0 z-[70] flex flex-col bg-background outline-none data-[state=open]:animate-[mobile-menu-content-in_230ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[mobile-menu-content-out_190ms_cubic-bezier(0.4,0,1,1)] motion-reduce:animate-none"
          onCloseAutoFocus={(e) => {
            // Radix's default auto-focus-return tracks a <DialogTrigger>;
            // the trigger here is the bottom nav's Menu button, which sits
            // entirely outside this Root/Portal, so there's nothing for the
            // default behavior to restore to — target it explicitly instead.
            e.preventDefault();
            document.getElementById("mobile-menu-trigger")?.focus();
          }}
        >
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
            <DialogPrimitive.Title className="text-base font-bold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close menu"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <nav aria-label={`${title} sections`} className="flex-1 overflow-y-auto px-2 pb-24 pt-3">
            <ul className="space-y-0.5">
              {primaryItems.map((item) => (
                <MenuRow key={item.id} item={item} active={selected === item.id} onClick={() => handleItemClick(item)} />
              ))}
            </ul>

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
function ItemIcon({ icon }) {
  if (!icon) return null;
  if (typeof icon === "string") return <span className="grid size-5 shrink-0 place-items-center text-base" aria-hidden="true">{icon}</span>;
  const Icon = icon;
  return <Icon className="size-5 shrink-0" aria-hidden="true" />;
}

function MenuRow({ item, active, onClick }) {
  return (
    <li>
      <button
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        )}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute inset-y-2 start-0 w-[3px] rounded-full"
            style={{ background: "var(--product-primary)" }}
          />
        )}
        <ItemIcon icon={item.icon} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.count > 0 && (
          <StatusBadge variant="neutral" size="medium" count={item.count} ariaLabel={`${item.count} ${item.label}`} />
        )}
        {item.live > 0 && (
          <StatusBadge
            variant="live"
            size="medium"
            icon="dot"
            count={item.live}
            ariaLabel={`${item.live} live ${item.label} event${item.live === 1 ? "" : "s"}`}
          />
        )}
      </button>
    </li>
  );
}
