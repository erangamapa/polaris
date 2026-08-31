// Deterministic per-address color avatar — no blockie/jazzicon dependency,
// no invented identity data. Same address always renders the same two-tone
// gradient, purely so the connected identity has something to visually
// anchor on across the nav control, mobile pill, and FundsDialog (see
// WALLET UX AUDIT — "wallet avatar" was a real gap vs. reference products).
function hashHue(address, seed) {
  if (!address) return 220;
  let h = seed;
  for (let i = 0; i < address.length; i++) h = (h * 31 + address.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function WalletAvatar({ address, size = 20, className = "" }) {
  const hueA = hashHue(address, 17);
  const hueB = hashHue(address, 101);
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hueA} 70% 55%), hsl(${hueB} 70% 45%))`,
      }}
    />
  );
}
