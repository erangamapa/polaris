import { useEffect, useState } from "react";

// Returns false for `ms`, then true — a small skeleton window on first mount
// so sync mock data feels like it's loading.
export function useBriefLoad(ms = 450) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return ready;
}
