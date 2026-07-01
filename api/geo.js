// GET /api/geo
// Geo gate scaffold. Testnet build allows all regions but demonstrates the check
// (mainnet compliance — licence/geoblock/KYC — is out of scope, docs/architecture/13).
import { json } from './_shared.js';

// Regions blocked in a real deployment; empty effect on testnet.
const BLOCKED = new Set((process.env.BLOCKED_COUNTRIES || '').split(',').map((c) => c.trim()).filter(Boolean));

export default async function handler(req, res) {
  // Vercel provides the caller country on this header.
  const country = req.headers['x-vercel-ip-country'] || 'US';
  const allowed = !BLOCKED.has(country);
  return json(res, 200, { country, allowed, testnet: true });
}
