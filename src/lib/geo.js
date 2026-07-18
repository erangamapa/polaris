// Geo-block check — stubbed for now (always allows). Real implementation
// would call an edge/IP-based endpoint; swapping that in only means changing
// this function's body, since every caller just reads { loading, blocked }.
export function useGeoCheck() {
  return { loading: false, blocked: false, reason: null };
}
