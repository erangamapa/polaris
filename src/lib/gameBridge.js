// TriBet Game Bridge — the postMessage contract between an embedded game (iframe)
// and the host app. A game NEVER settles its own bets; it asks the host, and the
// host owns the money + the randomness. That separation is what lets the exact
// same game run on a MOCK balance today and settle ON-CHAIN later by swapping
// only the host handler (see skills/build-casino-game).
//
// Messages are `{ channel: 'tribet-game', type, ... }`:
//   game → host : ready
//   host → game : init      { balance, currency }
//   game → host : bet       { id, amount, outcomes:[{label,weight,multiplier}], meta }
//   host → game : settled   { id, outcomeIndex, multiplier, payout, isWin, balance }
//   host → game : rejected  { id, reason, balance }

export const CHANNEL = 'tribet-game';
const MOCK_KEY = 'tribet_mock_balance';
const DEFAULT_MOCK_BALANCE = 1000;

export function loadMockBalance() {
  const v = Number(localStorage.getItem(MOCK_KEY));
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_MOCK_BALANCE;
}
export function saveMockBalance(v) {
  localStorage.setItem(MOCK_KEY, String(Math.max(0, Number(v) || 0)));
}

// Draw an outcome index from a weighted list. Swap this for on-chain VRF later.
export function drawWeighted(outcomes, rng = Math.random) {
  const total = outcomes.reduce((s, o) => s + Number(o.weight || 0), 0);
  if (total <= 0) return 0;
  let r = rng() * total;
  for (let i = 0; i < outcomes.length; i++) {
    r -= Number(outcomes[i].weight || 0);
    if (r < 0) return i;
  }
  return outcomes.length - 1;
}

// Settle a bet against a balance (pure). Returns the settled result + new balance.
export function settleBet({ amount, outcomes, balance }, rng = Math.random) {
  if (!(amount > 0) || amount > balance) {
    return { rejected: true, reason: amount > balance ? 'insufficient' : 'invalid', balance };
  }
  const outcomeIndex = drawWeighted(outcomes, rng);
  const multiplier = Number(outcomes[outcomeIndex]?.multiplier || 0);
  const payout = +(amount * multiplier).toFixed(6);
  const newBalance = +(balance - amount + payout).toFixed(6);
  return { rejected: false, outcomeIndex, multiplier, payout, isWin: payout > 0, balance: newBalance };
}

// Attach a MOCK host to an iframe: handles the bridge messages against a local
// mock balance. Returns a cleanup fn. `onBalance(n)` lets the UI show the balance.
// For on-chain, pass a custom `settle` (async) — see the skill's on-chain guide.
export function attachMockHost(iframe, { currency = 'TBET', onBalance, settle } = {}) {
  let balance = loadMockBalance();
  onBalance?.(balance);
  const post = (msg) => iframe.contentWindow?.postMessage({ channel: CHANNEL, ...msg }, '*');

  const onMessage = async (e) => {
    if (e.source !== iframe.contentWindow) return;
    const m = e.data;
    if (!m || m.channel !== CHANNEL) return;

    if (m.type === 'ready') { post({ type: 'init', balance, currency }); return; }

    if (m.type === 'bet') {
      const result = settle
        ? await settle({ amount: m.amount, outcomes: m.outcomes, meta: m.meta, balance })
        : settleBet({ amount: m.amount, outcomes: m.outcomes, balance });
      balance = result.balance;
      saveMockBalance(balance);
      onBalance?.(balance);
      if (result.rejected) post({ type: 'rejected', id: m.id, reason: result.reason, balance });
      else post({ type: 'settled', id: m.id, ...result });
    }
  };

  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
