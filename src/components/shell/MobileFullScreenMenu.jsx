import { useEffect, useRef } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { MobileBottomNav } from "./MobileBottomNav";
import { CLOSE_TRIGGER, focusIntentForCloseTrigger } from "@/lib/mobileMenuFocus";

// One full-screen navigation layer, reused for all three arenas — never a
// side drawer, never the desktop sidebar's markup. `primaryItems` and
// `utilityItems` are the same shape the desktop sidebar already renders
// (App.jsx derives both from one source of truth), so this is purely a
// different presentation of identical data, not a second navigation model.
//
// Built on Radix Dialog: focus trap, Escape-to-close, and background
// inert/aria-hidden come from the primitive for free. Renders the SAME
// MobileBottomNav the shell uses (product/onSelectArena/onToggleMenu all
// threaded straight through) as a real descendant inside this Dialog's own
// Content — App.jsx renders the shell's copy only while `open` is false, so
// there is exactly one live, focusable, accessible bottom-nav instance at
// any moment, never two competing interaction layers held together by
// z-index and pointer-events overrides (see MobileBottomNav.jsx and
// App.jsx for the other two-thirds of this split).
//
// Covers the viewport (100dvh, not 100vh, so browser address-bar expand/
// collapse never clips the header or bottom nav) at --z-fullscreen-menu.
export function MobileFullScreenMenu({ open, title, primaryItems, utilityItems, selected, onSelect, onClose, product, onSelectArena, onToggleMenu, onFocusMainContent }) {
  const navRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Action-specific focus restoration: each close trigger reports itself
  // via CLOSE_TRIGGER; focusIntentForCloseTrigger (see lib/mobileMenuFocus.js)
  // is the one place that maps a trigger to "trigger" (return to the Menu
  // button — X, Escape, "Menu" tapped again) vs "navigate" (focus the
  // destination's main content instead — arena/section selection, both of
  // which navigate away, so returning focus to a nav button the user is no
  // longer looking at would be disorienting). Defaults to CLOSE_BUTTON's
  // "trigger" outcome — the safe choice for closes this component didn't
  // itself report (breakpoint cleanup, browser Back).
  const closeTriggerRef = useRef(CLOSE_TRIGGER.CLOSE_BUTTON);
  useEffect(() => { if (open) closeTriggerRef.current = CLOSE_TRIGGER.CLOSE_BUTTON; }, [open]);

  const handleItemClick = (item) => {
    closeTriggerRef.current = CLOSE_TRIGGER.SECTION_SELECT;
    if (item.action) item.action();
    else onSelect(item.id);
    onClose();
  };
  const handleArenaSelect = (id) => {
    closeTriggerRef.current = CLOSE_TRIGGER.ARENA_SELECT;
    onSelectArena(id);
  };
  const handleToggleMenu = () => {
    closeTriggerRef.current = CLOSE_TRIGGER.MENU_TAPPED_AGAIN;
    onToggleMenu();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-x-0 top-0 z-[var(--z-fullscreen-menu)] h-dvh bg-background data-[state=open]:animate-[mobile-menu-backdrop-in_180ms_ease-out] data-[state=closed]:animate-[mobile-menu-backdrop-out_190ms_ease-in] motion-reduce:animate-none"
        />
        <DialogPrimitive.Content
          id="mobile-fullscreen-menu"
          aria-label={`${title} navigation`}
          className="fixed inset-x-0 top-0 z-[var(--z-fullscreen-menu)] flex h-dvh flex-col bg-background outline-none data-[state=open]:animate-[mobile-menu-content-in_230ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[mobile-menu-content-out_190ms_cubic-bezier(0.4,0,1,1)] motion-reduce:animate-none"
          onEscapeKeyDown={() => { closeTriggerRef.current = CLOSE_TRIGGER.ESCAPE; }}
          onOpenAutoFocus={(e) => {
            // Focus entry rule: the active arena section link if one exists
            // (so a returning user lands exactly where they are), otherwise
            // the close button — never the hidden/removed background Menu
            // trigger, and never a scroll jump (focusing an already-visible
            // element at the top of the list doesn't move the scroll
            // position). Independent of animation: this fires on mount,
            // not on animation completion.
            e.preventDefault();
            const activeLink = navRef.current?.querySelector('[aria-current="page"]');
            (activeLink ?? closeButtonRef.current)?.focus();
          }}
          onCloseAutoFocus={(e) => {
            // Opened programmatically from the bottom nav, not a
            // <DialogTrigger>, so Radix has nothing to auto-return to.
            // Deferred one frame: App.jsx only remounts the shell's
            // MobileBottomNav (and #mobile-menu-trigger with it) once
            // `open` has propagated back down to false, and this callback
            // can otherwise fire before that commit lands — waiting a
            // frame (not an arbitrary timeout) guarantees the target
            // exists before we look it up.
            e.preventDefault();
            const intent = focusIntentForCloseTrigger(closeTriggerRef.current);
            requestAnimationFrame(() => {
              if (intent === "navigate") onFocusMainContent?.();
              else document.getElementById("mobile-menu-trigger")?.focus();
            });
          }}
        >
          {/* Header — the top-right X is the primary, clearest close
              affordance (see MobileBottomNav's Menu item, which stays a
              plain burger and never shows a second competing X). Sized as
              a restrained icon button, not a dominant CTA. */}
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
            <DialogPrimitive.Title className="text-base font-bold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              ref={closeButtonRef}
              onClick={() => { closeTriggerRef.current = CLOSE_TRIGGER.CLOSE_BUTTON; }}
              aria-label="Close menu"
              className="grid size-12 place-items-center rounded-2xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-6" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Browse {title} sections, or switch products using the navigation below.
          </DialogPrimitive.Description>

          {/* Vertical structure: primary list pinned to the top, a flexible
              spacer absorbs any extra height so the utility group sits
              near the bottom on tall screens without being absolutely
              pinned (which would break short screens) — the whole nav
              scrolls internally instead when content exceeds the viewport.
              The bottom nav below is now a real flex sibling that reserves
              its own space, so this region no longer needs to guess and
              pad for an externally-elevated bar — plain `pb-3` is enough. */}
          <nav
            ref={navRef}
            aria-label={`${title} sections`}
            className="tribet-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3 pt-3"
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

          <MobileBottomNav product={product} menuOpen={open} onSelectArena={handleArenaSelect} onToggleMenu={handleToggleMenu} />
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
