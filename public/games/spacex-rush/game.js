// SpaceX Rush — a crash game. Presentation only; the HOST owns money + randomness
// via the TriBet Game Bridge. The player launches, the rocket climbs an accelerating
// multiplier curve, and they cash out (manually or at their auto-cashout) before the
// bust. We NEVER decide the payout here — we send a weighted outcome table encoding
// the chosen cashout, and animate whatever the host returns.
//
// Crash math (why the outcome table looks like it does):
//   A fair crash game pays `cashout×` with survival probability S(m) = HOUSE / m.
//   So RTP = m · S(m) = HOUSE for ANY cashout m — a constant ~4% edge (HOUSE 0.96).
//   The design brief's buckets approximate this curve:
//     <1.2× w28 | 1.2–2× w34 | 2–5× w26 | 5–20× w10 | 20×+ w2
//   ≈ 100·(S(1.0)-S(1.2)), 100·(S(1.2)-S(2)), … — i.e. the 0.96/m survival tail.
//   Because the payout multiplier IS the player's cashout, the bet is settled at the
//   moment of resolution with a 2-outcome table [{ win@m }, { bust }].

const HOUSE = 0.96;                 // target RTP (≈4% house edge)
const MIN_CASHOUT = 1.01;
const MAX_CASHOUT = 100;
const survival = (m) => Math.min(0.999, HOUSE / m); // P(rocket clears m×)

// ── Sound (WebAudio, self-contained — no assets; unlocked on first Launch click).
const Sound = (() => {
  let ctx, master, thrust, muted = false;
  const ensure = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const tone = (freq, dur, type = "sine", vol = 0.3, slideTo) => {
    if (muted || !ensure()) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.03);
  };
  const noise = (dur, vol = 0.5) => {
    if (muted || !ensure()) return;
    const t0 = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(1400, t0); lp.frequency.exponentialRampToValueAtTime(120, t0 + dur);
    src.connect(lp).connect(g).connect(master); src.start(t0); src.stop(t0 + dur);
  };
  return {
    unlock: ensure,
    get muted() { return muted; },
    setMuted(m) { muted = m; if (m) this.stopThrust(); },
    launch() { tone(170, 0.5, "sawtooth", 0.35, 720); },
    startThrust() {
      if (muted || !ensure()) return;
      this.stopThrust();
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 90;
      const g = ctx.createGain(); g.gain.value = 0.05;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
      o.connect(lp).connect(g).connect(master); o.start();
      thrust = { o, g, lp };
    },
    setThrust(p) {
      if (!thrust) return;
      const t = ctx.currentTime;
      thrust.o.frequency.setTargetAtTime(90 + p * 300, t, 0.06);
      thrust.lp.frequency.setTargetAtTime(320 + p * 1600, t, 0.06);
    },
    stopThrust() {
      if (!thrust) return;
      try { thrust.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); thrust.o.stop(ctx.currentTime + 0.25); } catch { /* already stopped */ }
      thrust = null;
    },
    tick(p) { tone(520 + p * 1100, 0.045, "square", 0.045); },
    cashout() { tone(660, 0.12, "sine", 0.4); setTimeout(() => tone(990, 0.16, "sine", 0.4), 90); setTimeout(() => tone(1320, 0.22, "triangle", 0.35), 200); },
    crash() { noise(0.55, 0.55); tone(150, 0.5, "sawtooth", 0.3, 42); },
  };
})();

// ── BRIDGE ── protocol constant (must match src/lib/gameBridge.js)
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

// ── BRIDGE ── place a bet: send the weighted outcome table for cashout `target`.
// index 0 = rocket cleared target (win, pays target×); index 1 = bust (lose).
function placeBet(amount, target) {
  const s = survival(target);
  const outcomes = [
    { label: `cashout ${target.toFixed(2)}×`, weight: Math.round(s * 10000), multiplier: +target.toFixed(2) },
    { label: "bust", weight: Math.round((1 - s) * 10000), multiplier: 0 },
  ];
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return new Promise((res) => { waiting[id] = res; post({ type: "bet", id, amount, outcomes, meta: { target } }); });
}

// ── Elements
const arena = document.getElementById("arena");
const flyer = document.getElementById("flyer");
const mascot = document.getElementById("mascot");
const burst = document.getElementById("burst");
const trailLine = document.getElementById("trailLine");
const trailArea = document.getElementById("trailArea");
const multEl = document.getElementById("multiplier");
const statusEl = document.getElementById("status");
const flash = document.getElementById("flash");
const boom = document.getElementById("boom");
const amountEl = document.getElementById("amount");
const cashoutEl = document.getElementById("cashout");
const oddsEl = document.getElementById("odds");
const launchBtn = document.getElementById("launch");

const DISPLAY_MAX = 30;             // multiplier mapped to top of arena (log scale)
const VW = 400, VH = 300;           // trail viewBox

// ── State machine: idle → flying → (resolving) → idle
let state = "idle";
let raf = 0, startTs = 0, liveMult = 1, autoTarget = 2, resolving = false, lastTick = 0;

const clampCashout = () => {
  let v = Number(cashoutEl.value);
  if (!Number.isFinite(v)) v = 2;
  v = Math.min(MAX_CASHOUT, Math.max(MIN_CASHOUT, v));
  return +v.toFixed(2);
};

function updateOdds() {
  const t = clampCashout();
  const chance = Math.round(survival(t) * 100);
  oddsEl.innerHTML = `Cash out at <b>${t.toFixed(2)}×</b> — win chance <b>${chance}%</b>`;
}
cashoutEl.addEventListener("input", () => { if (state === "idle") updateOdds(); });
updateOdds();

// Map a multiplier to a point on the rising curve (log scale so it accelerates).
function curvePoint(m) {
  const p = Math.min(1, Math.log(m) / Math.log(DISPLAY_MAX)); // 0..1 progress
  const x = 0.06 + p * 0.82;   // left fraction 0..1
  const y = p * 0.72;          // bottom fraction 0..1
  return { p, x, y };
}

function drawTrail(m) {
  const steps = 24;
  let line = "";
  for (let i = 0; i <= steps; i++) {
    const mi = 1 + (m - 1) * (i / steps);
    const { x, y } = curvePoint(mi);
    const px = x * VW, py = VH - y * VH;
    line += (i === 0 ? "M" : "L") + px.toFixed(1) + " " + py.toFixed(1) + " ";
  }
  trailLine.setAttribute("d", line);
  const { x } = curvePoint(m);
  trailArea.setAttribute("d", `${line} L ${(x * VW).toFixed(1)} ${VH} L ${(0.06 * VW).toFixed(1)} ${VH} Z`);
}

function placeFlyer(m) {
  const { x, y } = curvePoint(m);
  flyer.style.setProperty("--x", x.toFixed(4));
  flyer.style.setProperty("--y", y.toFixed(4));
}

function setMult(m, cls = "") {
  multEl.textContent = `${m.toFixed(2)}×`;
  multEl.className = `multiplier ${cls}`;
}
function setStatus(text, cls = "") { statusEl.textContent = text; statusEl.className = `status ${cls}`; }
function setMascot(cls) { mascot.className = `mascot ${cls}`; }

// ── Live climb loop (presentation). Accelerating: m = exp(k · t^1.35).
function tick(ts) {
  if (!startTs) startTs = ts;
  const t = (ts - startTs) / 1000;
  liveMult = Math.exp(0.11 * Math.pow(t, 1.35));

  if (liveMult >= autoTarget) { resolve(autoTarget); return; }

  setMult(liveMult, liveMult >= 5 ? "hot" : "");
  drawTrail(liveMult);
  placeFlyer(liveMult);
  setMascot(liveMult >= 5 ? "moon" : "climb");

  const prog = Math.min(1, Math.log(liveMult) / Math.log(DISPLAY_MAX));
  Sound.setThrust(prog);
  const step = Math.floor(liveMult * 4); // a rising blip as the multiplier climbs
  if (step > lastTick) { lastTick = step; Sound.tick(prog); }

  raf = requestAnimationFrame(tick);
}

// ── Resolve the round at cashout multiplier `target` — settle with the host.
async function resolve(target) {
  if (resolving) return;
  resolving = true;
  cancelAnimationFrame(raf);
  state = "resolving";
  launchBtn.disabled = true;

  const amount = Math.max(0, Number(amountEl.value) || 0);
  const res = await placeBet(amount, target);

  if (res.type === "rejected") {
    setStatus(`Rejected: ${res.reason}`, "lose");
    return reset();
  }

  const won = res.isWin;              // host owns this decision
  const at = target;
  Sound.stopThrust();
  drawTrail(at); placeFlyer(at); setMult(at, won ? "won" : "bust");

  if (won) {
    // Cashed out in time — green burst, thumbs-up / to-the-moon.
    Sound.cashout();
    flash.className = "flash green";
    setMascot(at >= 5 ? "moon" : "win");
    showBurst(`+${res.payout.toFixed(2)} 💸`, at >= 10 ? "gold" : "green");
    setStatus(`Cashed out ${at.toFixed(2)}× — won ${res.payout.toFixed(2)}`, "win");
  } else {
    // Rocket didn't clear the cashout line — explosion, shake, dizzy face-plant.
    Sound.crash();
    explode();
    setMascot("crash");
    setStatus(`Crashed at ${at.toFixed(2)}× — stake lost`, "lose");
  }
  setTimeout(reset, 1500);
}

function showBurst(text, cls) {
  burst.textContent = text;
  burst.className = "burst";
  void burst.offsetWidth; // restart animation
  burst.className = `burst show ${cls}`;
}

function explode() {
  flash.className = "flash red";
  const { x, y } = curvePoint(liveMult);
  boom.style.left = `${(x * 100).toFixed(1)}%`;
  boom.style.bottom = `${(y * 72).toFixed(1)}%`;
  boom.className = "boom";
  void boom.offsetWidth;
  boom.className = "boom go";
  arena.classList.remove("shake"); void arena.offsetWidth; arena.classList.add("shake");
}

function reset() {
  Sound.stopThrust();
  state = "idle";
  resolving = false;
  liveMult = 1; startTs = 0; lastTick = 0;
  flyer.classList.add("idle");
  setMascot("");
  drawTrail(1); placeFlyer(1);
  setMult(1);
  flash.className = "flash";
  launchBtn.disabled = false;
  launchBtn.dataset.state = "idle";
  launchBtn.textContent = "🚀 Launch";
  amountEl.disabled = false; cashoutEl.disabled = false;
  updateOdds();
}

// ── Launch / Cash Out button
launchBtn.addEventListener("click", () => {
  if (state === "idle") {
    const amount = Math.max(0, Number(amountEl.value) || 0);
    if (amount <= 0) { setStatus("Enter a bet amount", "lose"); return; }
    if (amount > balance) { setStatus("Insufficient balance", "lose"); return; }
    autoTarget = clampCashout();
    cashoutEl.value = autoTarget.toFixed(2);

    Sound.unlock(); Sound.launch(); Sound.startThrust();
    lastTick = 0;
    state = "flying";
    flyer.classList.remove("idle");
    amountEl.disabled = true; cashoutEl.disabled = true;
    oddsEl.innerHTML = `Auto-cashout at <b>${autoTarget.toFixed(2)}×</b> — tap to bail early`;
    launchBtn.dataset.state = "flying";
    launchBtn.textContent = "💰 Cash Out";
    setStatus("Liftoff!", "");
    startTs = 0;
    raf = requestAnimationFrame(tick);
  } else if (state === "flying") {
    // Manual cash out at the live multiplier (never above the auto target).
    resolve(Math.min(liveMult, autoTarget));
  }
});

// ── Mute toggle
const muteBtn = document.getElementById("mute");
muteBtn.addEventListener("click", () => {
  Sound.setMuted(!Sound.muted);
  muteBtn.textContent = Sound.muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-pressed", String(Sound.muted));
});

// initial paint
reset();
