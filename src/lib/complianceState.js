// RESPONSIBLE GAMING AND COMPLIANCE ACCESS — the one shared compliance
// model every surface (Responsible Gaming hub, game launch gating, the
// shared ComplianceBlock) reads from, instead of each screen inventing its
// own restricted/KYC/region booleans (see ONE SHARED SAFETY / COMPLIANCE
// MODEL: "do not create separate compliance stores").
//
// HONESTY NOTE — there is no real backend behind any of this today: no KYC
// provider, no self-exclusion/cool-off persistence, no jurisdiction/region
// service beyond the existing stubbed useGeoCheck() (see lib/geo.js, always
// `blocked: false`), no account-restriction system. `complianceStatus`
// therefore only ever comes from one place — the Developer Panel mock (see
// devMock.js's `complianceStatus` field, default "clear") — exactly the
// same "mocked, presentational only" pattern already established for
// `authStatus`/`gameStatus`/`walletStatus`. A real user always sees "clear"
// unless a real backend signal is wired in later; nothing here guesses a
// user's location, infers KYC from wallet connection, or invents a
// restriction reason (see DATA HONESTY).
export const COMPLIANCE_STATUS = {
  CLEAR: "clear",
  KYC_REQUIRED: "kyc-required",
  KYC_PENDING: "kyc-pending",
  KYC_FAILED: "kyc-failed",
  RESTRICTED: "restricted",
  REGION_BLOCKED: "region-blocked",
  AGE_RESTRICTED: "age-restricted",
  SELF_EXCLUDED: "self-excluded",
  COOL_OFF: "cool-off",
  LOADING: "loading",
  ERROR: "error",
};

// Every string below is the exact customer-safe copy this task specifies
// (or a direct, neutral adaptation of it) — no invented regulator names,
// review timelines, restriction reasons, or appeal process. `primaryAction`/
// `secondaryAction` are omitted wherever this app has no real working
// action to attach (see KYC STATES: "only show actions that work" — this is
// why kyc-required has no "Start verification" button: no verification
// flow exists to start).
const COPY = {
  [COMPLIANCE_STATUS.KYC_REQUIRED]: {
    title: "Verify your account to continue",
    message: "Some account actions require verification before you can continue.",
  },
  [COMPLIANCE_STATUS.KYC_PENDING]: {
    title: "Verification in progress",
    message: "We'll let you know once this is complete.",
  },
  [COMPLIANCE_STATUS.KYC_FAILED]: {
    title: "We couldn't complete verification.",
    message: "Contact support for help completing verification.",
  },
  [COMPLIANCE_STATUS.RESTRICTED]: {
    title: "Account access limited",
    message: "Some account actions are currently unavailable.",
  },
  [COMPLIANCE_STATUS.REGION_BLOCKED]: {
    title: "Casino unavailable in your region",
    message: "Casino play is not available from your current location.",
  },
  [COMPLIANCE_STATUS.AGE_RESTRICTED]: {
    title: "Age restriction",
    message: "This account does not currently meet the age requirement to play.",
  },
  [COMPLIANCE_STATUS.SELF_EXCLUDED]: {
    title: "Self-exclusion active",
    message: "Game launch and betting are blocked while self-exclusion is active.",
  },
  [COMPLIANCE_STATUS.COOL_OFF]: {
    title: "Take a break",
    message: "Game launch and betting are paused during your break.",
  },
  [COMPLIANCE_STATUS.ERROR]: {
    title: "We couldn't confirm your account status.",
    message: "Try again in a moment.",
  },
  [COMPLIANCE_STATUS.LOADING]: {
    title: "Checking your account status",
    message: "This will only take a moment.",
  },
};

// Actions this app can actually gate today. Casino has exactly one
// real-money action (launching a playable onchain BetSwirl game IS placing
// a bet — see App.jsx's ensureAuth, which already keys off the same
// `kind === "onchain" && playable` distinction). `fund-wallet`/`withdraw`
// are included for shape-compatibility with the task's suggested
// `canPerformAction` signature but are never actually invoked anywhere —
// wallet funding/withdrawal architecture is explicitly deferred for this
// task (see PRODUCT SCOPE), so no new gating is wired into FundsDialog.
const SENSITIVE_ACTIONS = new Set(["launch-real-game", "fund-wallet", "withdraw"]);

// Never blocked regardless of compliance status — safety/support access
// must survive every restricted state (see RESTRICTED ACCOUNT STATE:
// "preserve Support... preserve Responsible Gaming", SELF-EXCLUDED/COOL-OFF
// ACTIVE STATE: "history remains accessible... support remains
// accessible... Responsible Gaming remains accessible... account/profile
// access remains available").
const ALWAYS_ALLOWED = new Set([
  "browse-casino", "view-history", "open-support", "open-responsible-gaming", "view-account",
]);

const BLOCKING_STATUSES = new Set([
  COMPLIANCE_STATUS.KYC_REQUIRED,
  COMPLIANCE_STATUS.KYC_PENDING,
  COMPLIANCE_STATUS.KYC_FAILED,
  COMPLIANCE_STATUS.RESTRICTED,
  COMPLIANCE_STATUS.REGION_BLOCKED,
  COMPLIANCE_STATUS.AGE_RESTRICTED,
  COMPLIANCE_STATUS.SELF_EXCLUDED,
  COMPLIANCE_STATUS.COOL_OFF,
  // Fail safe: an unresolved or failed status check must not leave a
  // real-money action open before/while status is uncertain (see LOADING
  // STATE: "do not briefly show unrestricted actions before status
  // resolves"; ERROR STATE: "fail safely for sensitive actions... do not
  // assume unrestricted access").
  COMPLIANCE_STATUS.LOADING,
  COMPLIANCE_STATUS.ERROR,
]);

// The one centralized gate every sensitive action checks (see ACTION
// GATING: "do not scatter independent compliance booleans across cards,
// games and account screens"). Actions outside SENSITIVE_ACTIONS (browsing,
// history, support, Responsible Gaming, account) are always allowed — this
// app has no reason to ever block them, and the task explicitly requires
// they survive every restricted state.
export function canPerformAction({ action, complianceStatus }) {
  if (ALWAYS_ALLOWED.has(action)) return true;
  if (!SENSITIVE_ACTIONS.has(action)) return true;
  return !BLOCKING_STATUSES.has(complianceStatus ?? COMPLIANCE_STATUS.CLEAR);
}

// Derives the one shared, renderable compliance state from the mock status
// (see module doc comment — there is no other source today). `status`
// always falls back to "clear" rather than `undefined`, so every consumer
// can render without a defensive null-check.
export function getComplianceState({ complianceStatus }) {
  const status = complianceStatus ?? COMPLIANCE_STATUS.CLEAR;
  if (status === COMPLIANCE_STATUS.CLEAR) {
    return { status, blockingActions: [], supportAvailable: true, canRetry: false };
  }
  const copy = COPY[status] ?? COPY[COMPLIANCE_STATUS.ERROR];
  return {
    status,
    title: copy.title,
    message: copy.message,
    blockingActions: [...SENSITIVE_ACTIONS].filter((a) => !canPerformAction({ action: a, complianceStatus: status })),
    supportAvailable: true,
    canRetry: status === COMPLIANCE_STATUS.ERROR,
  };
}
