// Mock session helpers. No backend — this only simulates auth for the prototype.
const KEY = "polaris_session";

export const WALLETS = [
  { id: "metamask", name: "MetaMask", color: "#f6851b", initial: "M" },
  { id: "walletconnect", name: "WalletConnect", display: "Wallet Connect", color: "#3b99fc", initial: "W" },
  { id: "coinbase", name: "Coinbase", color: "#1652f0", glyph: "#4d7cf5", initial: "C" },
  { id: "phantom", name: "Phantom", color: "#ab9ff2", initial: "P" },
];

export function shortAddress() {
  const hex = "0123456789abcdef";
  const r = (n) => Array.from({ length: n }, () => hex[Math.floor(Math.random() * 16)]).join("");
  return `0x${r(4)}…${r(4)}`;
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(user) {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    // localStorage may be unavailable; session just won't persist
  }
}
