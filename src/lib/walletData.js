export const ASSETS = [
  { id: "usdt-trc20", label: "USDT", network: "TRC-20", min: 1, confirms: 1, eta: "~1 min" },
  { id: "usdt-erc20", label: "USDT", network: "ERC-20", min: 5, confirms: 12, eta: "~3 min" },
  { id: "usdt-sol", label: "USDT", network: "Solana", min: 1, confirms: 1, eta: "~30 sec" },
];

export const DEPOSIT_STAGES = ["detected", "confirming", "credited"];
export const WITHDRAW_STAGES = ["requested", "review", "sent on-chain", "confirming", "completed"];

export const WITHDRAW_FEE = 1.0;
export const MIN_WITHDRAW = 10;

export function txHash() {
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 12; i++) s += hex[Math.floor(Math.random() * 16)];
  return `0x${s}…${hex[Math.floor(Math.random() * 16)]}${hex[Math.floor(Math.random() * 16)]}`;
}

export function nowLabel() {
  return new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const INITIAL_TXNS = [
  { id: "t1", type: "Deposit", amount: 250, status: "Completed", hash: "0x7a3f…9c", time: "Jun 28, 14:02", network: "TRC-20" },
  { id: "t2", type: "Withdrawal", amount: 80, status: "Completed", hash: "0x2b9e…4d", time: "Jun 27, 19:41", network: "TRC-20" },
];
