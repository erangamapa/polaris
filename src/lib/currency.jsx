import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
const KEY = "polaris_currency";
const Ctx = createContext(null);

export function fmtMoney(usd, id) {
  const c = BY_ID[id] ?? BY_ID.USD;
  const v = (usd || 0) * c.rate;
  const num = v.toLocaleString("en-US", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  return c.kind === "fiat" ? `${c.symbol}${num}` : `${num} ${c.id}`;
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    try { return BY_ID[localStorage.getItem(KEY)] ? localStorage.getItem(KEY) : "USD"; } catch { return "USD"; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, currency); } catch { /* ignore */ } }, [currency]);
  const value = useMemo(
    () => ({ currency, setCurrency, currencies: CURRENCIES, fmtMoney: (usd) => fmtMoney(usd, currency) }),
    [currency]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  return useContext(Ctx) ?? { currency: "USD", setCurrency: () => {}, currencies: CURRENCIES, fmtMoney: (usd) => fmtMoney(usd, "USD") };
}
