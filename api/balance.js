// GET /api/balance?address=0x...
// Unified on-chain balance (ETH + WETH) on Base Sepolia. Read-only.
import { readBalances, isAddress, json } from './_shared.js';

export default async function handler(req, res) {
  const address = req.query?.address;
  if (!isAddress(address)) return json(res, 400, { error: 'Valid ?address= required' });
  try {
    const balances = await readBalances(address);
    return json(res, 200, { address, chainId: 84532, ...balances });
  } catch (e) {
    return json(res, 502, { error: 'RPC read failed', detail: e.message });
  }
}
