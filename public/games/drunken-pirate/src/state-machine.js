export const PHASE_DEBUG = new URLSearchParams(location.search).get("debug") === "1";

export const RoundPhase = {
  IDLE: "idle",
  ROUND_ACTIVE: "roundActive",
  SHOOTING: "shooting",
  WHEEL_OFFER: "wheelOffer",
  GAMBLED: "gambled",
  WHEEL_SPINNING: "wheelSpinning",
  WHEEL_REVEALING: "wheelRevealing",
  WHEEL_CINEMATIC: "wheelCinematic",
  ENDED: "ended"
};

export const BuyinPhase = {
  CONFIRMING: "confirming",
  SPINNING: "spinning",
  REVEALING: "revealing",
  CINEMATIC: "cinematic"
};

/**
 * @param {object} state
 * @param {object} deps
 * @param {HTMLElement} deps.wheelModal
 * @param {HTMLElement} deps.wheelBuyinConfirmModal
 * @param {() => number} deps.wheelBuyinCostAmount
 */
export function createStateMachine(state, deps) {
  const { wheelModal, wheelBuyinConfirmModal, wheelBuyinCostAmount } = deps;

  function setRoundPhase(next, reason) {
    const prev = state.roundPhase;
    if (prev === next) return;
    if (PHASE_DEBUG) {
      console.warn("[phase]", prev, "→", next, reason || "");
    }
    state.roundPhase = next;
  }

  function setBuyinPhase(next, reason) {
    const prev = state.buyinPhase;
    if (prev === next) return;
    if (PHASE_DEBUG) {
      console.warn("[buyin]", prev, "→", next, reason || "");
    }
    state.buyinPhase = next;
  }

  function logPhaseContext(label) {
    if (!PHASE_DEBUG) return;
    console.warn("[phase ctx]", label, {
      roundPhase: state.roundPhase,
      buyinPhase: state.buyinPhase,
      roundActive: state.roundActive,
      hits: state.hits,
      wheelOffer: state.wheelOffer,
      wheelStreakGambled: state.wheelStreakGambled
    });
  }

  function canShoot() {
    if (state.roundPhase === RoundPhase.SHOOTING || state.animating) return false;
    if (state.roundPhase === RoundPhase.WHEEL_OFFER || state.roundPhase === RoundPhase.GAMBLED
      || state.roundPhase === RoundPhase.WHEEL_SPINNING || state.roundPhase === RoundPhase.WHEEL_REVEALING
      || state.roundPhase === RoundPhase.WHEEL_CINEMATIC || state.roundPhase === RoundPhase.ENDED) {
      return false;
    }
    if (state.wheelIntro || state.buyinPhase) return false;
    if (!state.roundActive && state.balance < state.bet - 1e-9) return false;
    return true;
  }

  function canCashOut() {
    if (state.roundPhase !== RoundPhase.ROUND_ACTIVE) return false;
    if (!state.roundActive || state.hits < 1 || state.animating) return false;
    return true;
  }

  function canTakeWheel() {
    if (state.roundPhase !== RoundPhase.WHEEL_OFFER) return false;
    if (state.wheelIntro || state.wheelSpinning) return false;
    if (!state.wheelOffer || state.wheelMode !== "streak") return false;
    return true;
  }

  function canGambleWheel() {
    if (state.roundPhase !== RoundPhase.WHEEL_OFFER) return false;
    if (state.wheelIntro || state.wheelSpinning) return false;
    if (!wheelModal.classList.contains("open")) return false;
    if (state.wheelMode !== "streak") return false;
    if (!state.wheelOffer && !state.roundActive) return false;
    return true;
  }

  function canBuyIn() {
    if (state.roundPhase !== RoundPhase.IDLE) return false;
    if (state.roundActive || state.animating || state.buyinPhase) return false;
    if (wheelBuyinConfirmModal.classList.contains("open")) return false;
    const buyinCost = wheelBuyinCostAmount();
    if (state.balance < buyinCost - 1e-9) return false;
    return true;
  }

  function isWheelBlockedForBetting() {
    return state.roundPhase === RoundPhase.WHEEL_OFFER || state.roundPhase === RoundPhase.GAMBLED
      || state.roundPhase === RoundPhase.WHEEL_SPINNING || state.roundPhase === RoundPhase.WHEEL_REVEALING
      || state.roundPhase === RoundPhase.WHEEL_CINEMATIC || state.wheelIntro
      || !!state.buyinPhase || wheelBuyinConfirmModal.classList.contains("open");
  }

  return {
    setRoundPhase,
    setBuyinPhase,
    logPhaseContext,
    canShoot,
    canCashOut,
    canTakeWheel,
    canGambleWheel,
    canBuyIn,
    isWheelBlockedForBetting
  };
}
