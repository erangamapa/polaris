// Picks the real-provider bet slip for the active sports provider. Both
// AzuroBetSlip and SxBetSlip take identical props and support the same
// modal/panel/sheet presentations, so render sites stay provider-agnostic —
// they render <ProviderBetSlip> for any source !== "mock".
import { isSxbet } from "@/lib/sportsProvider";
import { AzuroBetSlip } from "./AzuroBetSlip";
import { SxBetSlip } from "./SxBetSlip";

export function ProviderBetSlip(props) {
  return isSxbet() ? <SxBetSlip {...props} /> : <AzuroBetSlip {...props} />;
}
