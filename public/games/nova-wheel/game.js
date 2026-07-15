// Nova Wheel — 8-segment neon wheel. Presentation only; the HOST owns money +
// randomness via the TriBet Game Bridge. We send the weighted outcome table and
// animate the wheel to whatever index the host returns. RTP ≈ 96.1%.

// ── BRIDGE ──
const CHANNEL = "tribet-game";
const post = (m) => window.parent.postMessage({ channel: CHANNEL, ...m }, "*");
const waiting = {};
let balance = 0;

window.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.channel !== CHANNEL) return;
  if (m.type === "init") balance = m.balance;
  if (m.type === "settled" || m.type === "rejected") {
    balance = m.balance;
    const r = waiting[m.id];
    if (r) { delete waiting[m.id]; r(m); }
  }
});
post({ type: "ready" });

function placeBet(amount, outcomes) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return new Promise((res) => { waiting[id] = res; post({ type: "bet", id, amount, outcomes }); });
}

// ── Segments (order around the wheel). weight = probability, multiplier = payout.
// Σ(w·m)=74, Σw=77 → RTP 96.1%.
const SEGMENTS = [
  { label: "0×",   weight: 10, multiplier: 0,   color: "#20264f" },
  { label: "1.5×", weight: 12, multiplier: 1.5, color: "#23d3ff" },
  { label: "0×",   weight: 10, multiplier: 0,   color: "#20264f" },
  { label: "2×",   weight: 9,  multiplier: 2,   color: "#7d5cff" },
  { label: "0×",   weight: 10, multiplier: 0,   color: "#20264f" },
  { label: "1.5×", weight: 12, multiplier: 1.5, color: "#23d3ff" },
  { label: "0×",   weight: 10, multiplier: 0,   color: "#20264f" },
  { label: "5×",   weight: 4,  multiplier: 5,   color: "#ffd76a" },
];
const N = SEGMENTS.length;
const SLICE = 360 / N;

// ── Build the wheel SVG (segment i centered at angle i*SLICE clockwise from top).
const CX = 150, CY = 150, R = 138, LR = 96;
const pt = (angFromTop, r) => {
  const a = (angFromTop - 90) * Math.PI / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
const group = document.getElementById("wheelGroup");
SEGMENTS.forEach((s, i) => {
  const start = i * SLICE - SLICE / 2, end = i * SLICE + SLICE / 2;
  const [x1, y1] = pt(start, R), [x2, y2] = pt(end, R);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`);
  path.setAttribute("fill", s.color);
  path.setAttribute("class", `seg ${s.multiplier > 0 ? "seg-win" : "seg-lose"}`);
  path.style.color = s.color; // for the win glow (currentColor)
  path.dataset.index = i;
  group.appendChild(path);

  const [lx, ly] = pt(i * SLICE, LR);
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", lx.toFixed(1)); t.setAttribute("y", (ly + 5).toFixed(1));
  t.setAttribute("class", "seg-label");
  t.textContent = s.label; // upright (labels rotate with the wheel as it spins)
  group.appendChild(t);
});

// ── Controls
const amountEl = document.getElementById("amount");
const spinBtn = document.getElementById("spin");
const resultEl = document.getElementById("result");
document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { amountEl.value = c.dataset.set; }));

let rotation = 0;   // accumulated degrees (always increasing)
let busy = false;

function setResult(text, cls) { resultEl.textContent = text; resultEl.className = `result ${cls}`; }
function clearWin() { group.querySelectorAll(".seg.win").forEach((p) => p.classList.remove("win")); }

spinBtn.addEventListener("click", async () => {
  if (busy) return;
  const amount = Math.max(0, Number(amountEl.value) || 0);
  if (amount <= 0) { setResult("Enter a bet amount", ""); return; }
  // No balance guard: the mock host is a faucet (tops up when a bet can't be
  // covered), so we send the bet and let the host settle it.

  busy = true; spinBtn.disabled = true; clearWin(); setResult("Spinning…", "");
  const outcomes = SEGMENTS.map((s) => ({ label: s.label, weight: s.weight, multiplier: s.multiplier }));
  const res = await placeBet(amount, outcomes);
  if (res.type === "rejected") { busy = false; spinBtn.disabled = false; setResult(`Rejected: ${res.reason}`, "lose"); return; }

  const i = res.outcomeIndex;
  // rotate so segment i lands under the top pointer: final mod 360 == (-i*SLICE)
  const targetMod = ((-i * SLICE) % 360 + 360) % 360;
  const curMod = ((rotation % 360) + 360) % 360;
  let delta = targetMod - curMod; if (delta <= 0) delta += 360;
  const jitter = (Math.random() * 2 - 1) * (SLICE * 0.28); // stay well inside the slice
  rotation += 360 * 5 + delta + jitter;
  group.style.transform = `rotate(${rotation}deg)`;

  setTimeout(() => {
    const seg = group.querySelector(`path[data-index="${i}"]`);
    if (seg && res.isWin) seg.classList.add("win");
    const big = res.multiplier >= 5;
    setResult(
      res.isWin ? `${SEGMENTS[i].label} — won ${res.payout.toFixed(2)}` : "No win — spin again",
      res.isWin ? (big ? "big" : "win") : "lose",
    );
    busy = false; spinBtn.disabled = false;
  }, 4700);
});
