// Report what the test wallet holds on both chains, and what is still missing.
//
// This is the skill's verification step. Faucets rate-limit, silently queue, and
// occasionally hand out a different token than advertised, so "the faucet said
// OK" is not evidence. On-chain balances are. Run this after every funding
// attempt and believe only what it prints.
//
// Usage:  node skills/setup-test-wallet/scripts/check-balances.mjs [0xaddress]
// With no argument it reads .secrets/player-wallet.json.
import { createPublicClient, erc20Abi, formatEther, formatUnits } from 'viem';
import { readFileSync } from 'node:fs';
import { azuro, baseSepolia, polygonAmoy } from '../../../../packages/shared/chains.js';
import { transportFor } from './rpc.mjs';

// What the app actually needs to be usable, rather than arbitrary round numbers:
// enough Base Sepolia ETH to cover a few casino bets plus their gas, enough POL
// to sign a couple of Amoy transactions, and enough USDT to place a sports bet.
const NEEDS = {
  casinoEth: 0.005,
  sportsPol: 0.05,
  sportsUsdt: 1,
};

const address = process.argv[2]
  ?? JSON.parse(readFileSync('.secrets/player-wallet.json', 'utf8')).address;

if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
  console.error(`Not a valid address: ${address}`);
  process.exit(1);
}

const clientFor = (chain) => createPublicClient({ chain, transport: transportFor(chain) });

// One slow/unreachable public RPC must not stall the whole report — each read
// resolves to null and is reported as "unknown" rather than hanging or throwing.
const guard = (promise) => promise.then((v) => v, () => null);

const [casinoEth, sportsPol, sportsUsdt] = await Promise.all([
  guard(clientFor(baseSepolia).getBalance({ address })),
  guard(clientFor(polygonAmoy).getBalance({ address })),
  guard(clientFor(polygonAmoy).readContract({
    address: azuro.betToken.address, abi: erc20Abi, functionName: 'balanceOf', args: [address],
  })),
]);

const rows = [
  { label: 'Base Sepolia ETH', got: casinoEth === null ? null : Number(formatEther(casinoEth)), need: NEEDS.casinoEth, for: 'Casino bets + gas' },
  { label: 'Polygon Amoy POL', got: sportsPol === null ? null : Number(formatEther(sportsPol)), need: NEEDS.sportsPol, for: 'Sports gas' },
  { label: 'Polygon Amoy USDT', got: sportsUsdt === null ? null : Number(formatUnits(sportsUsdt, azuro.betToken.decimals)), need: NEEDS.sportsUsdt, for: 'Sports stake' },
];

console.log(`\nWallet ${address}\n`);
const missing = [];
for (const row of rows) {
  if (row.got === null) {
    console.log(`  ?  ${row.label.padEnd(18)} could not read (RPC unreachable) — ${row.for}`);
    continue;
  }
  const ok = row.got >= row.need;
  if (!ok) missing.push(row);
  console.log(`  ${ok ? 'OK' : '--'} ${row.label.padEnd(18)} ${String(row.got).padEnd(12)} (need ${row.need})  ${row.for}`);
}

// Casino and sports fund independently, so a wallet can be perfectly usable for
// one and not the other. Say which, instead of a single pass/fail that would
// send someone chasing a faucet they do not need yet.
const canCasino = (casinoEth ?? 0n) > 0n && Number(formatEther(casinoEth ?? 0n)) >= NEEDS.casinoEth;
console.log('');
if (!missing.length) {
  console.log('Ready for both Casino and Sports.\n');
} else if (canCasino) {
  console.log('Ready for CASINO. Sports still needs: ' + missing.map((m) => m.label).join(', ') + '\n');
} else {
  console.log('Not funded yet. Still needed: ' + missing.map((m) => m.label).join(', ') + '\n');
}

process.exit(missing.length ? 1 : 0);
