// GET /api/history?address=0x...
// Sports bet history for a wallet, read from the Azuro bets subgraph (on-chain).
// Casino (BetSwirl) history is read client-side from chain/receipts (its studio
// subgraph is unavailable — see docs/architecture/23), so this endpoint serves
// the sports leg; the UI merges the two.
import { AZURO_BETS_SUBGRAPH, isAddress, json } from './_shared.js';

const QUERY = `query Bets($actor: String!) {
  bets(first: 50, orderBy: createdBlockTimestamp, orderDirection: desc, where: { actor: $actor }) {
    betId affiliate amount odds potentialPayout payout status result
    createdBlockTimestamp createdTxHash resolvedTxHash isRedeemable isRedeemed
    selections { outcome { outcomeId } }
  }
}`;

export default async function handler(req, res) {
  const address = req.query?.address;
  if (!isAddress(address)) return json(res, 400, { error: 'Valid ?address= required' });
  try {
    const r = await fetch(AZURO_BETS_SUBGRAPH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { actor: address.toLowerCase() } }),
    });
    const body = await r.json();
    if (body.errors) return json(res, 502, { error: 'Subgraph error', detail: body.errors });
    const bets = (body.data?.bets ?? []).map((b) => ({
      product: 'sports',
      betId: b.betId,
      affiliate: b.affiliate,
      stake: b.amount,
      odds: b.odds,
      potential: b.potentialPayout,
      payout: b.payout,
      status: b.status,
      result: b.result,
      placedAt: Number(b.createdBlockTimestamp) * 1000,
      txHash: b.createdTxHash,
      resolvedTxHash: b.resolvedTxHash,
    }));
    return json(res, 200, { address, count: bets.length, bets });
  } catch (e) {
    return json(res, 502, { error: 'History read failed', detail: e.message });
  }
}
