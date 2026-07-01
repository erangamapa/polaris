// GET /api/casino-history?address=0x...
// Casino bet history read straight from chain (BetSwirl's subgraph is down, see
// docs/architecture/23). We scan each game contract's `Roll` events filtered by
// the player (receiver is indexed) over a bounded recent window, decode the
// outcome + payout, and return details. The public RPC caps eth_getLogs range,
// so we page in small chunks.
import { createPublicClient, http, formatEther } from 'viem';
import { casinoChainById, CASINO_GAME_ROLL_ABI } from '@betswirl/sdk-core';
import { isAddress, json } from './_shared.js';

const CHAIN_ID = 84532;
const chain = casinoChainById[CHAIN_ID].viemChain;
const games = casinoChainById[CHAIN_ID].contracts.games;
const client = createPublicClient({ chain, transport: http('https://sepolia.base.org') });

const PLAYABLE = ['dice', 'coin-toss', 'roulette', 'keno'];
const LOOKBACK = 24_000n; // ~13h of Base Sepolia blocks
const CHUNK = 1_800n; // under the RPC's getLogs range cap
const POOL = 5; // concurrent RPC calls (public RPC throttles beyond this)

const rollEvent = (key) => CASINO_GAME_ROLL_ABI[key]?.find((x) => x.type === 'event' && x.name === 'Roll');

// Run async tasks with bounded concurrency + one retry, so the public RPC does
// not throttle us into silently dropping windows.
async function mapPool(items, fn, concurrency = POOL) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await fn(items[idx]);
      } catch {
        try { results[idx] = await fn(items[idx]); } catch { results[idx] = undefined; }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// Summarise the rolled outcome for display, per game.
function rolledSummary(key, args) {
  const r = args.rolled;
  if (key === 'dice') return `rolled ${Array.isArray(r) ? r.join(', ') : r} · cap ${args.cap}`;
  if (key === 'coin-toss') return `landed ${(Array.isArray(r) ? r[0] : r) ? 'HEADS' : 'TAILS'} · picked ${args.face ? 'HEADS' : 'TAILS'}`;
  if (key === 'roulette') return `rolled ${Array.isArray(r) ? r.join(', ') : r}`;
  if (key === 'keno') return `hit ${Array.isArray(r) ? r.join(', ') : r}`;
  return '';
}

export default async function handler(req, res) {
  const address = req.query?.address;
  if (!isAddress(address)) return json(res, 400, { error: 'Valid ?address= required' });

  try {
    const head = await client.getBlockNumber();
    const start = head > LOOKBACK ? head - LOOKBACK : 0n;

    // Build (game, fromBlock, toBlock) windows.
    const windows = [];
    for (const key of PLAYABLE) {
      const event = rollEvent(key);
      if (!event) continue;
      for (let from = start; from <= head; from += CHUNK) {
        const to = from + CHUNK - 1n > head ? head : from + CHUNK - 1n;
        windows.push({ key, event, from, to });
      }
    }

    const logsByWindow = await mapPool(windows, async (w) => {
      const logs = await client.getLogs({ address: games[w.key].address, event: w.event, args: { receiver: address }, fromBlock: w.from, toBlock: w.to });
      return logs.map((l) => ({ key: w.key, l }));
    });

    const flat = logsByWindow.filter(Boolean).flat();

    // Fetch timestamps for the distinct blocks we actually hit.
    const blocks = [...new Set(flat.map((x) => x.l.blockNumber))];
    const tsEntries = await mapPool(blocks, async (bn) => [String(bn), Number((await client.getBlock({ blockNumber: bn })).timestamp) * 1000]);
    const tsByBlock = Object.fromEntries(tsEntries.filter(Boolean));

    const bets = flat
      .map(({ key, l }) => {
        const a = l.args;
        const payout = a.payout ?? 0n;
        const stake = a.totalBetAmount ?? 0n;
        return {
          product: 'casino',
          game: key,
          betId: String(a.id),
          stake: formatEther(stake),
          payout: formatEther(payout),
          isWin: payout > 0n,
          outcome: rolledSummary(key, a),
          txHash: l.transactionHash,
          blockNumber: Number(l.blockNumber),
          placedAt: tsByBlock[String(l.blockNumber)],
        };
      })
      .sort((x, y) => y.blockNumber - x.blockNumber);

    return json(res, 200, { address, chainId: CHAIN_ID, count: bets.length, fromBlock: Number(start), bets });
  } catch (e) {
    return json(res, 502, { error: 'On-chain read failed', detail: e.message });
  }
}
