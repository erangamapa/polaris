import {
  CLIENT_SEED_KEY,
  HIT_PROB,
  WHEEL_SLICE_COUNT,
  WHEEL_SLICES
} from "./constants.js";

export function createFairness(deps) {
  const {
    rtpServerHash,
    rtpServerSeed,
    rtpNonce,
    rtpLastRoll,
    rtpWheelNonce,
    rtpLastWheelRoll,
    clientSeedInput,
    getCheatForceWheelApple,
    setCheatForceWheelApple
  } = deps;

  const fairness = {
    serverSeed: "",
    serverSeedHash: "",
    clientSeed: "",
    nonce: 0,
    wheelNonce: 0,
    revealed: false,
    lastRoll: null,
    lastOutcome: null,
    lastWheelRoll: null,
    lastWheelSlice: null,
    lastWheelOutcome: null
  };

  function randomSeed() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function loadClientSeed() {
    try {
      const stored = localStorage.getItem(CLIENT_SEED_KEY);
      if (stored) return stored;
    } catch (e) { /* ignore */ }
    return randomSeed();
  }

  function saveClientSeed() {
    try {
      localStorage.setItem(CLIENT_SEED_KEY, fairness.clientSeed);
    } catch (e) { /* ignore */ }
  }

  function updateFairnessUi() {
    rtpServerHash.textContent = fairness.serverSeedHash || "—";
    rtpServerSeed.textContent = fairness.revealed
      ? (fairness.serverSeed || "—")
      : "Hidden until round ends";
    clientSeedInput.value = fairness.clientSeed || "";
    rtpNonce.textContent = String(fairness.nonce);
    if (fairness.lastRoll == null) {
      rtpLastRoll.textContent = "—";
    } else {
      const label = fairness.lastOutcome === "hit" ? "apple hit" : "face hit";
      rtpLastRoll.textContent = fairness.lastRoll.toFixed(8) + " → " + label;
    }
    rtpWheelNonce.textContent = String(fairness.wheelNonce);
    if (fairness.lastWheelRoll == null) {
      rtpLastWheelRoll.textContent = "—";
    } else {
      const wLabel = fairness.lastWheelOutcome === "apple" ? "apple" : "skull";
      rtpLastWheelRoll.textContent = fairness.lastWheelRoll.toFixed(8)
        + " → slice " + fairness.lastWheelSlice + " (" + wLabel + ")";
    }
  }

  async function commitServerSeed() {
    fairness.serverSeed = randomSeed();
    fairness.serverSeedHash = await sha256Hex(fairness.serverSeed);
    fairness.nonce = 0;
    fairness.wheelNonce = 0;
    fairness.revealed = false;
    fairness.lastRoll = null;
    fairness.lastOutcome = null;
    fairness.lastWheelRoll = null;
    fairness.lastWheelSlice = null;
    fairness.lastWheelOutcome = null;
    updateFairnessUi();
  }

  function revealServerSeed() {
    fairness.revealed = true;
    updateFairnessUi();
  }

  async function fairRollValue(serverSeed, clientSeed, nonce) {
    const digest = await sha256Hex(serverSeed + ":" + clientSeed + ":" + nonce);
    return parseInt(digest.slice(0, 8), 16) / 0x100000000;
  }

  async function fairWheelRollValue(serverSeed, clientSeed, wheelNonce) {
    const digest = await sha256Hex(serverSeed + ":" + clientSeed + ":wheel:" + wheelNonce);
    return parseInt(digest.slice(0, 8), 16) / 0x100000000;
  }

  async function rollWheelSlice() {
    if (getCheatForceWheelApple()) {
      setCheatForceWheelApple(false);
      fairness.wheelNonce += 1;
      const slice = WHEEL_SLICES.findIndex((s) => s === "apple");
      fairness.lastWheelRoll = 0;
      fairness.lastWheelSlice = slice >= 0 ? slice : 1;
      fairness.lastWheelOutcome = "apple";
      updateFairnessUi();
      return fairness.lastWheelSlice;
    }
    fairness.wheelNonce += 1;
    const roll = await fairWheelRollValue(fairness.serverSeed, fairness.clientSeed, fairness.wheelNonce);
    const slice = Math.min(WHEEL_SLICE_COUNT - 1, Math.floor(roll * WHEEL_SLICE_COUNT));
    fairness.lastWheelRoll = roll;
    fairness.lastWheelSlice = slice;
    fairness.lastWheelOutcome = WHEEL_SLICES[slice];
    updateFairnessUi();
    return slice;
  }

  async function rollOutcome() {
    fairness.nonce += 1;
    const roll = await fairRollValue(fairness.serverSeed, fairness.clientSeed, fairness.nonce);
    fairness.lastRoll = roll;
    fairness.lastOutcome = roll < HIT_PROB ? "hit" : "hitPerson";
    updateFairnessUi();
    return fairness.lastOutcome;
  }

  return {
    fairness,
    randomSeed,
    loadClientSeed,
    saveClientSeed,
    updateFairnessUi,
    commitServerSeed,
    revealServerSeed,
    fairRollValue,
    fairWheelRollValue,
    rollWheelSlice,
    rollOutcome
  };
}
