// Template game: Coin Flip. Shows how to speak the TriBet Game Bridge.
// Adapt the visuals/animation; keep the bridge calls (marked ── BRIDGE ──).

// ── BRIDGE ── protocol constant (must match src/lib/gameBridge.js)
const CHANNEL = "tribet-game";
const post = (msg) => window.parent.postMessage({ channel: CHANNEL, ...msg }, "*");

// Local UI state
let side = "HEADS";              // player's pick
let balance = 0;                 // authoritative balance comes from the host
let pending = null;              // { id } while a bet is in flight
const pendingResolvers = {};     // id -> resolve fn

const coin = document.getElementById("coin");
const resultEl = document.getElementById("result");
const amountEl = document.getElementById("amount");
const flipBtn = document.getElementById("flip");

// Side picker
document.querySelectorAll(".side").forEach((btn) => {
  btn.addEventListener("click", () => {
    side = btn.dataset.side;
    document.querySelectorAll(".side").forEach((b) => b.classList.toggle("is-active", b === btn));
  });
});

// ── BRIDGE ── tell the host we're ready; it replies with `init` (balance)
window.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.channel !== CHANNEL) return;
  if (m.type === "init") { balance = m.balance; }
  if (m.type === "settled" || m.type === "rejected") {
    balance = m.balance;
    const resolve = pendingResolvers[m.id];
    if (resolve) { delete pendingResolvers[m.id]; resolve(m); }
  }
});
post({ type: "ready" });

// ── BRIDGE ── place a bet: send amount + the weighted outcome table; the HOST
// draws the winner and returns { outcomeIndex, payout, isWin, balance }.
function placeBet(amount, outcomes) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return new Promise((resolve) => {
    pendingResolvers[id] = resolve;
    post({ type: "bet", id, amount, outcomes, meta: { side } });
  });
}

flipBtn.addEventListener("click", async () => {
  if (pending) return;
  const amount = Math.max(0, Number(amountEl.value) || 0);
  if (amount <= 0) { setResult("Enter a bet amount", ""); return; }
  // No balance guard: the mock host is a faucet (tops up when a bet can't be
  // covered), so we send the bet and let the host settle it.

  // Outcomes encode the player's choice already:
  //   index 0 = the chosen side wins (1.96×), index 1 = other side (lose).
  // Weighted-average RTP = 0.5 * 1.96 = 0.98 (2% house edge).
  const outcomes = [
    { label: "win", weight: 1, multiplier: 1.96 },
    { label: "lose", weight: 1, multiplier: 0 },
  ];

  pending = true;
  flipBtn.disabled = true;
  setResult("Flipping…", "");

  const res = await placeBet(amount, outcomes);
  pending = null;
  flipBtn.disabled = false;

  if (res.type === "rejected") { setResult(`Rejected: ${res.reason}`, "lose"); return; }

  // Map the host's outcomeIndex back to a visible face + animate.
  const landed = res.outcomeIndex === 0 ? side : (side === "HEADS" ? "TAILS" : "HEADS");
  animateTo(landed);
  setTimeout(() => {
    setResult(res.isWin ? `Landed ${landed} — won ${res.payout.toFixed(2)}` : `Landed ${landed} — no win`, res.isWin ? "win" : "lose");
  }, 1100);
});

// Presentation only
let flips = 0;
function animateTo(face) {
  flips += 4;
  const base = flips * 180;
  const target = face === "HEADS" ? 0 : 180;
  coin.classList.add("spinning");
  coin.style.transform = `rotateY(${base + target}deg)`;
}
function setResult(text, cls) {
  resultEl.textContent = text;
  resultEl.className = `result ${cls}`;
}
