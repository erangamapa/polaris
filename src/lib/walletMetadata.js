// The one place that maps a connector's display name to a label + local
// icon path — no component branches on wallet identity itself (see WALLET
// IDENTITY REWORK task: "do NOT hardcode if address === ... then
// MetaMask... do not duplicate wallet-specific JSX components").
//
// Icon resolution order lives in WalletProviderIcon.jsx, this file only
// owns the id/label/path lookup:
//   1. the connector's own icon, exposed directly by wagmi/AppKit
//      (a data URI — see useWallet.js's `connectorIcon`)
//   2/3. this map's local asset path
//   4. a generic lucide icon fallback (always available)
//
// ASSETS ARE NOT BUNDLED YET. Icon paths below point at
// `public/img/wallets/<id>.svg` (same convention as the existing
// `public/img/games/` game-tile art — see AGENTS.md) — add real SVGs at
// those exact paths to light up per-provider branding. Until then
// WalletProviderIcon quietly falls through to the generic fallback icon;
// nothing breaks or blocks on a missing file, since public/ paths are
// runtime <img src> lookups, never build-time imports.
const WALLET_ICON_DIR = '/img/wallets';

// Substring match (not exact-equality) against the connector's raw name —
// wagmi/AppKit connector names are fairly stable strings ("MetaMask",
// "Coinbase Wallet", "Phantom", "WalletConnect") but this stays tolerant of
// close variants ("Coinbase Wallet SDK") or casing changes.
const KNOWN_PROVIDERS = [
  { id: 'metamask', label: 'MetaMask', match: /metamask/i },
  { id: 'phantom', label: 'Phantom', match: /phantom/i },
  { id: 'coinbase', label: 'Coinbase Wallet', match: /coinbase/i },
  { id: 'walletconnect', label: 'WalletConnect', match: /walletconnect/i },
];

export function getWalletMetadata(connectorName) {
  const known = KNOWN_PROVIDERS.find((provider) => provider.match.test(connectorName || ''));
  if (known) {
    return { id: known.id, label: known.label, iconPath: `${WALLET_ICON_DIR}/${known.id}.svg` };
  }
  return { id: 'fallback', label: connectorName || 'Wallet', iconPath: null };
}
