// Fund the player + house wallets on Base Sepolia via the CDP faucet.
// Reads CDP_API_KEY_ID / CDP_API_KEY_SECRET from .env.bootstrap (untracked).
// Player: ETH (gas + BetSwirl bets) + USDC option; House: a little ETH (to claim).
import { CdpClient } from '@coinbase/cdp-sdk';
import { readFileSync } from 'node:fs';
import { createPublicClient, http, formatEther } from 'viem';

// Load .env.bootstrap into process.env (only keys not already set).
for (const line of readFileSync('.env.bootstrap', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const house = JSON.parse(readFileSync('.secrets/house-wallet.json', 'utf8'));
const player = JSON.parse(readFileSync('.secrets/test-wallet.json', 'utf8'));

const pub = createPublicClient({
  chain: { id: 84532, name: 'Base Sepolia', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://sepolia.base.org'] } } },
  transport: http('https://sepolia.base.org'),
});

const cdp = new CdpClient({
  apiKeyId: process.env.CDP_API_KEY_ID,
  apiKeySecret: process.env.CDP_API_KEY_SECRET,
});

async function faucet(address, token) {
  try {
    const { transactionHash } = await cdp.evm.requestFaucet({ address, network: 'base-sepolia', token });
    console.log(`  faucet ${token} -> ${address}: ${transactionHash}`);
    return transactionHash;
  } catch (e) {
    console.log(`  faucet ${token} -> ${address} FAILED: ${e.message}`);
    return null;
  }
}

async function bal(label, address) {
  const b = await pub.getBalance({ address });
  console.log(`  ${label} ${address} ETH=${formatEther(b)}`);
  return b;
}

console.log('Requesting faucet drips...');
// Player needs the most: several ETH drips for gas + bets.
const drips = Number(process.env.PLAYER_ETH_DRIPS || 2);
for (let i = 0; i < drips; i++) await faucet(player.address, 'eth');
await faucet(house.address, 'eth');

console.log('Waiting ~8s for drips to land...');
await new Promise((r) => setTimeout(r, 8000));
await bal('PLAYER', player.address);
await bal('HOUSE ', house.address);
