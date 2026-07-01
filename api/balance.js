// GET /api/balance?address=0x...
// Per-chain on-chain balances: casino ETH (Base Sepolia) + sports USDT/POL
// (Polygon Amoy). Read-only, non-custodial.
import { readBalances, isAddress, json } from './_shared.js';

export default async function handler(req, res) {
  const address = req.query?.address;
  if (!isAddress(address)) return json(res, 400, { error: 'Valid ?address= required' });
  try {
    const balances = await readBalances(address);
    return json(res, 200, { address, ...balances });
  } catch (e) {
    return json(res, 502, { error: 'RPC read failed', detail: e.message });
  }
}
