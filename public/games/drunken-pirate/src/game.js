import { HIT_PROB } from "./constants.js";

/** Browser console RTP helpers. */
export function attachSimulateApi() {
  window.simulate = function simulate(rounds = 10000) {
    let total = 0;
    for (let i = 0; i < rounds; i++) {
      if (Math.random() < HIT_PROB) total += 2;
    }
    const rtp = total / rounds;
    console.log("The Drunken Pirate simulate(" + rounds + ") [base_1hit]");
    console.log("  Hit rate target:", (HIT_PROB * 100).toFixed(1) + "%");
    console.log("  Avg payout multiplier (cash out after 1 hit):", rtp.toFixed(4));
    console.log("  RTP:", (rtp * 100).toFixed(2) + "%");
    return rtp;
  };

  window.simulateFull = function simulateFullBrowser(opts) {
    return import("../scripts/simulate-rtp.js").then((mod) => {
      const result = mod.simulateFull(opts);
      console.log("simulateFull:", result.mode, "RTP", result.rtpPct.toFixed(3) + "%");
      return result;
    });
  };
}
