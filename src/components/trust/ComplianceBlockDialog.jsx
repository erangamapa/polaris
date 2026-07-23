import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getComplianceState } from "@/lib/complianceState";
import { ComplianceBlock } from "./ComplianceBlock";

// Wraps the shared, stateless ComplianceBlock in this app's one Dialog
// primitive — the single blocking surface a game-launch attempt shows when
// canPerformAction() denies it (see App.jsx's attemptLaunch). Same
// component shape every other App-level dialog uses ({ open, onClose }),
// so App.jsx doesn't need to import Dialog primitives directly just for
// this one case (see BLOCKING SURFACE: "use one shared compliance-blocking
// component... do not create separate visually inconsistent blocking
// modals").
//
// Action set depends on the status: Responsible Gaming is only offered
// where the task calls it out as relevant (restricted / self-excluded /
// cool-off — see RESTRICTED ACCOUNT STATE and SELF-EXCLUDED / COOL-OFF
// ACTIVE STATE); every other status only has one real working action —
// Support — since no verification/appeal/region-policy flow exists to
// attach a second button to (see KYC STATES: "only show actions that
// work").
const RG_RELEVANT = new Set(["restricted", "self-excluded", "cool-off"]);

export function ComplianceBlockDialog({ open, onClose, complianceStatus, onSupport, onResponsibleGaming }) {
  const compliance = getComplianceState({ complianceStatus });
  if (compliance.status === "clear") return null;

  const supportAction = { label: "Contact support", trackingId: "contact-support", onClick: () => { onSupport(); onClose(); } };
  const rgAction = { label: "Responsible Gaming", trackingId: "responsible-gaming", onClick: () => { onResponsibleGaming(); onClose(); } };
  const showRg = RG_RELEVANT.has(compliance.status);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>{compliance.title}</DialogTitle>
        </DialogHeader>
        <ComplianceBlock
          status={compliance.status}
          title={compliance.title}
          message={compliance.message}
          primaryAction={showRg ? rgAction : supportAction}
          secondaryAction={showRg ? supportAction : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
