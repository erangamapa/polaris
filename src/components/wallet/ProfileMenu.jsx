import { useRef } from "react";
import { User, ChevronDown, Wallet as WalletIcon, ShieldCheck, LifeBuoy, LogOut } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/web3/useWallet";
import { StatusBadge } from "@/components/ui/status-badge";

// accountStatus is a Developer-Panel-only concept today (see
// lib/devMock.js) — the real app has no account-tier system yet, so
// "normal" (the only real value in production) renders no badge at all;
// the other two only ever appear while testing via the panel. Gated on the
// build-time `import.meta.env.DEV` constant (not just left as a plain
// object) so these dev-only strings don't ship in the production bundle at
// all — confirmed via a production build grep (see DEV-ONLY REQUIREMENT:
// "tree-shake where practical").
const ACCOUNT_BADGE = import.meta.env.DEV ? {
  vip: { label: "VIP", variant: "success" },
  restricted: { label: "Restricted", variant: "attention" },
} : {};

// Profile control: "Profile = account/settings" (see TopBar.jsx's mental-
// model comment) — kept intentionally basic per this task's own scope
// ("Do not fully build every profile destination unless already
// supported"). Only links to what genuinely already exists in this app:
// Funds/wallet management (FundsDialog), Responsible Gambling and Support
// (both already exist as dialogs, previously reachable only from the
// page-bottom Footer) and Sign out. VIP/Settings/Security have no real
// surface anywhere in this app yet, so they're deliberately absent rather
// than faked — the architecture (one DropdownMenu, one row per real
// destination) is exactly how they'd slot in once they exist.
//
// `open`/`onOpenChange` are controlled by TopBar (one shared `activePopover`
// state — see OVERLAY OWNERSHIP), not owned locally.
export function ProfileMenu({ open, onOpenChange, address, accountStatus = "normal", onManageWallet, onResponsibleGambling, onSupport, onSignOut }) {
  const triggerRef = useRef(null);
  const badge = ACCOUNT_BADGE[accountStatus];

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          aria-label={`Profile, ${shortAddress(address)}`}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-1.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
            <User className="size-4" aria-hidden="true" />
          </span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          onCloseAutoFocus={(e) => { e.preventDefault(); triggerRef.current?.focus(); }}
          className="z-[var(--z-header-popover)] w-56 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <span className="truncate font-mono text-xs text-muted-foreground">{shortAddress(address)}</span>
            {badge && <StatusBadge variant={badge.variant} size="small" label={badge.label} ariaLabel={`Account status: ${badge.label}`} />}
          </div>
          <DropdownMenuPrimitive.Separator className="my-1 border-t" />

          <MenuItem icon={WalletIcon} label="Manage wallet" onSelect={onManageWallet} />
          <MenuItem icon={ShieldCheck} label="Responsible gambling" onSelect={onResponsibleGambling} />
          <MenuItem icon={LifeBuoy} label="Support" onSelect={onSupport} />

          <DropdownMenuPrimitive.Separator className="my-1 border-t" />
          <MenuItem icon={LogOut} label="Sign out" onSelect={onSignOut} />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

function MenuItem({ icon: Icon, label, onSelect }) {
  return (
    <DropdownMenuPrimitive.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground"
    >
      <Icon className="size-4" aria-hidden="true" /> {label}
    </DropdownMenuPrimitive.Item>
  );
}
