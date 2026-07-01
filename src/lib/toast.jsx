import { useEffect, useState } from "react";

// Tiny toast store (sonner-style singleton) so any file can call toast.success(...).
let items = [];
const listeners = new Set();
let seq = 0;
const MAX = 4;

function emit() { listeners.forEach((l) => l(items)); }
function add(t) {
  const item = { id: ++seq, type: "info", ...t };
  items = [item, ...items].slice(0, MAX);
  emit();
  return item.id;
}
function dismiss(id) { items = items.filter((i) => i.id !== id); emit(); }

export const toast = {
  show: (opts) => add(opts),
  success: (title, opts = {}) => add({ ...opts, type: "success", title }),
  error: (title, opts = {}) => add({ ...opts, type: "error", title }),
  warning: (title, opts = {}) => add({ ...opts, type: "warning", title }),
  info: (title, opts = {}) => add({ ...opts, type: "info", title }),
  dismiss,
};

export function useToasts() {
  const [list, setList] = useState(items);
  useEffect(() => {
    const l = (next) => setList(next);
    listeners.add(l);
    setList(items);
    return () => listeners.delete(l);
  }, []);
  return list;
}
