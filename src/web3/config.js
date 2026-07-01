// Reown AppKit + wagmi config. Single source of truth for wallet connection.
// Testnet-only: Base Sepolia (both BetSwirl casino + Azuro sports live there).
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { baseSepolia } from '@reown/appkit/networks';
import { BRAND_NAME } from '@/lib/brand';

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  // Fail loudly in dev; a missing id yields a silently broken connect button.
  console.error('VITE_REOWN_PROJECT_ID is not set — wallet connect will not work.');
}

export const CHAIN = baseSepolia;
export const networks = [baseSepolia];

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
    url: typeof window !== 'undefined' ? window.location.origin : 'https://wildstakes.vercel.app',
    icons: ['https://wildstakes.vercel.app/favicon.svg'],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: 'dark',
});
