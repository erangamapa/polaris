// POST /api/bet/prepare
// Enforces our affiliate on an Azuro bet order server-side. The client cannot
// forge a different affiliate: whatever it sends is overwritten with the
// server's authoritative address (or rejected if it tries to smuggle one).
import { AFFILIATE, isAddress, json } from '../_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!AFFILIATE) return json(res, 500, { error: 'Affiliate not configured on server' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
  }
  const clientData = body?.clientData ?? {};
  const bet = body?.bet ?? {};

  // Reject a forged affiliate outright so tampering is visible, not silently fixed.
  if (clientData.affiliate && clientData.affiliate.toLowerCase() !== AFFILIATE) {
    return json(res, 403, { error: 'Forged affiliate rejected', expected: AFFILIATE });
  }
  if (!bet.conditionId || bet.outcomeId === undefined || !bet.amount) {
    return json(res, 400, { error: 'Missing bet fields (conditionId, outcomeId, amount)' });
  }

  // Return the order with the affiliate authoritatively set to ours.
  return json(res, 200, {
    clientData: { ...clientData, affiliate: AFFILIATE },
    bet,
    affiliateEnforced: true,
  });
}
