import { MIN_BET, MAX_BET } from "./constants.js";

export function formatMoney(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function clampBet(v) {
  if (Number.isNaN(v) || v < MIN_BET) return MIN_BET;
  if (v > MAX_BET) return MAX_BET;
  return Math.round(v * 100) / 100;
}

export function formatHistoryMult(mult) {
  const n = Number(mult);
  if (!Number.isFinite(n)) return "—";
  return (n >= 10 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, "")) + "×";
}
