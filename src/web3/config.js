// Reown AppKit + wagmi config. Single source of truth for wallet connection.
// Testnet-only: Base Sepolia (both BetSwirl casino + Azuro sports live there).
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { baseSepolia, polygonAmoy } from '@reown/appkit/networks';
import { CASINO_CHAIN_ID, SPORTS_CHAIN_ID } from '@shared/chains';
import { BRAND_NAME } from '@/lib/brand';

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  // Fail loudly in dev; a missing id yields a silently broken connect button.
  console.error('VITE_REOWN_PROJECT_ID is not set — wallet connect will not work.');
}

// Casino (BetSwirl) lives on Base Sepolia, sports (Azuro) on Polygon Amoy.
export const CASINO_CHAIN = baseSepolia;
export const SPORTS_CHAIN = polygonAmoy;
// Back-compat default used where a single "home" chain is assumed (casino).
export const CHAIN = baseSepolia;
export const networks = [baseSepolia, polygonAmoy];
export { CASINO_CHAIN_ID, SPORTS_CHAIN_ID };

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// createAppKit is a side-effectful singleton; running it here at import time
// registers the modal once for the whole app.
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  defaultNetwork: baseSepolia,
  metadata: {
    name: BRAND_NAME,
    description: `${BRAND_NAME} — on-chain casino, predictions & sports`,
    url: typeof window !== 'undefined' ? window.location.origin : 'https://tribet.vercel.app',
    icons: ['https://tribet.vercel.app/favicon.svg'],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: 'dark',
});
