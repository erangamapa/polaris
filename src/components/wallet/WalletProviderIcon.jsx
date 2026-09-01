import { useState } from "react";
import { Wallet } from "lucide-react";
import { getWalletMetadata } from "@/lib/walletMetadata";
import { cn } from "@/lib/utils";

// Cascades through the icon priority order from WALLET ICON ASSET
// STRATEGY: connector-provided icon -> local per-provider asset -> generic
// fallback. Each candidate that fails to load (missing/broken file) simply
// advances to the next one via onError — a missing MetaMask SVG never
// blocks the identity row, it just quietly shows the fallback glyph.
// `key={connectorName}` at the call site resets this on wallet change.
export function WalletProviderIcon({ connectorName, connectorIcon, size = 40, className }) {
  const meta = getWalletMetadata(connectorName);
  const candidates = [connectorIcon, meta.iconPath].filter(Boolean);
  const [tier, setTier] = useState(0);
  const src = candidates[tier];

  // Genuinely informative, not decorative — see ACCESSIBILITY: "the wallet
  // icon should have an accessible name equivalent to 'MetaMask wallet'."
  // The unknown-provider fallback's own label is already the word "Wallet"
  // (see walletMetadata.js), so guard against announcing "Wallet wallet".
  const accessibleLabel = /wallet/i.test(meta.label) ? meta.label : `${meta.label} wallet`;

  if (src) {
    return (
      <img
        src={src}
        alt={accessibleLabel}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-lg object-contain", className)}
        onError={() => setTier((t) => t + 1)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={accessibleLabel}
      className={cn("grid shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground", className)}
      style={{ width: size, height: size }}
    >
      <Wallet className="size-5" aria-hidden="true" />
    </span>
  );
}
