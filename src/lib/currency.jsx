import { createContext, useCallback, useContext, useMemo } from "react";
import { usePlayerSettings } from "./usePlayerSettings.jsx";

// One internal balance is USD-equivalent. Display currency is a view conversion (mock rates).
export const CURRENCIES = [
  { id: "USD", name: "US Dollar", kind: "fiat", symbol: "$", rate: 1, decimals: 2 },
  { id: "EUR", name: "Euro", kind: "fiat", symbol: "€", rate: 0.92, decimals: 2 },
  { id: "GBP", name: "British Pound", kind: "fiat", symbol: "£", rate: 0.79, decimals: 2 },
  { id: "USDT", name: "Tether", kind: "crypto", rate: 1, decimals: 2 },
  { id: "BTC", name: "Bitcoin", kind: "crypto", rate: 1 / 95000, decimals: 6 },
  { id: "ETH", name: "Ethereum", kind: "crypto", rate: 1 / 3600, decimals: 5 },
  { id: "SOL", name: "Solana", kind: "crypto", rate: 1 / 150, decimals: 3 },
];

const BY_ID = Object.fromEntries(CURRENCIES.map((c) => [c.id, c]));
const Ctx = createContext(null);

export function fmtMoney(usd, id) {
  const c = BY_ID[id] ?? BY_ID.USD;
  const v = (usd || 0) * c.rate;
  const num = v.toLocaleString("en-US", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  return c.kind === "fiat" ? `${c.symbol}${num}` : `${num} ${c.id}`;
}

// Display currency is a stored player setting now, not a local-only key — it
// follows the wallet across devices (see lib/usePlayerSettings.jsx). This
// provider keeps no state of its own; it is a typed view over one field of the
// settings store plus the formatting helpers.
//
// The CURRENCIES enum lives here because this is the module that owns it, so
// validation does too: the settings store only guarantees a non-empty string
// (it is shared with the server and deliberately holds no UI data — see
// packages/shared/playerSettings.js), and an unrecognised id falls back to USD
// rather than rendering every balance as "NaN".
export function CurrencyProvider({ children }) {
  const { settings, updateGroup } = usePlayerSettings();
  const stored = settings.preferences.currency;
  const currency = BY_ID[stored] ? stored : "USD";

  const setCurrency = useCallback((next) => {
    if (!BY_ID[next]) return;
    updateGroup("preferences", { currency: next });
  }, [updateGroup]);

  const value = useMemo(
    () => ({ currency, setCurrency, currencies: CURRENCIES, fmtMoney: (usd) => fmtMoney(usd, currency) }),
    [currency, setCurrency]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  return useContext(Ctx) ?? { currency: "USD", setCurrency: () => {}, currencies: CURRENCIES, fmtMoney: (usd) => fmtMoney(usd, "USD") };
}
