/**
 * Consent and accessible text primitives. No disability or diagnosis inference.
 * An advisory decision MUST also be enforced at the data access layer.
 */
export type Purpose =
  | "local_capture"
  | "local_personalisation"
  | "external_transcription"
  | "research_training"
  | "research_sharing";
export type GuardianDecision =
  | "ALLOW"
  | "ALLOW_WITH_SAFEGUARDS"
  | "HOLD_BRANCH"
  | "ESCALATE"
  | "BLOCK_HARD_INVARIANT";
export interface ConsentEvent {
  eventId: string;
  purpose: Purpose;
  allowed: boolean;
  occurredAt: string;
  noticeVersion: string;
  method: "direct_accessible_ui" | "participant_signed";
}
export interface GuardianContext {
  consentEvents: ConsentEvent[];
  purpose: Purpose;
  rightsApproved?: boolean;
  dataEncrypted?: boolean;
  providerApproved?: boolean;
  crossBorderReviewComplete?: boolean;
  ethicsReviewRequired?: boolean;
  ethicsApproved?: boolean;
  participantAccessibleReview?: boolean;
  humanOversightApproved?: boolean;
}
export interface GuardianResult {
  decision: GuardianDecision;
  scope: Purpose;
  holds: string[];
  safeguards: string[];
  evidenceRefs: string[];
  invariantRefs: string[];
  publicRationale: string;
  metacognitiveRoute: "FAST_REVIEW" | "DELIBERATIVE_REVIEW" | "HOLD_FOR_EVIDENCE";
}
export interface LexiconRule {
  id: string;
  heard: string;
  replacement: string;
  enabled: boolean;
}
export const PURPOSES: Purpose[] = [
  "local_capture", "local_personalisation", "external_transcription",
  "research_training", "research_sharing"
];
export const NOTICE_VERSION = "speechprint-v0.1-2026-10";

/** Requires insertion-ordered events. The last matching consent event wins. */
export function hasConsent(events: readonly ConsentEvent[], purpose: Purpose): boolean {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].purpose === purpose) return events[i].allowed;
  }
  return false;
}

/** Conservative rights gate. Missing evidence cannot become permission. */
export function evaluateGuardian(c: GuardianContext): GuardianResult {
  const holds: string[] = [];
  const safeguards = [
    "Participant can correct, stop, decline and withdraw",
    "Never infer diagnosis, cognition or capacity from speech"
  ];
  if (!hasConsent(c.consentEvents, c.purpose)) holds.push("Purpose-specific consent is not active");
  if (c.purpose === "external_transcription") {
    if (!c.providerApproved) holds.push("Vendor contract and data processing review missing");
    if (!c.crossBorderReviewComplete) holds.push("Cross-border privacy review missing");
    if (!c.participantAccessibleReview) holds.push("Accessible chance to review before disclosure missing");
  }
  if (c.purpose === "research_training" || c.purpose === "research_sharing") {
    if (!c.rightsApproved) holds.push("Source licence and data use rights not verified");
    if (!c.dataEncrypted) holds.push("Approved encrypted research storage not verified");
    if (!c.humanOversightApproved) holds.push("Accountable research owner approval missing");
    if (c.ethicsReviewRequired !== false && !c.ethicsApproved) holds.push("Ethics/HREC requirement not resolved");
  }
  if (c.purpose === "local_personalisation") {
    safeguards.push("Participant chooses each learned correction; no silent model training");
  }
  return {
    decision: holds.length ? "HOLD_BRANCH" : "ALLOW_WITH_SAFEGUARDS",
    scope: c.purpose, holds, safeguards, evidenceRefs: [],
    invariantRefs: ["AGENCY_CONSENT", "COMMUNICATION_ACCESS", "PRIVACY_PURPOSE_LIMITATION"],
    publicRationale: holds.length
      ? "This purpose must wait for explicit consent, access and rights prerequisites."
      : "Only the specified activity is permitted with safeguards; other purposes need separate consent.",
    metacognitiveRoute: holds.length ? "HOLD_FOR_EVIDENCE" : "DELIBERATIVE_REVIEW"
  };
}

/** Explicit and reversible text correction layer; this is not ASR weight training. */
export function applyLexicon(text: string, rules: readonly LexiconRule[]): string {
  const enabled = rules.filter(r => r.enabled && r.heard.trim() && r.replacement.trim())
    .sort((a,b) => b.heard.length - a.heard.length);
  let output = text;
  for (const rule of enabled) {
    const escaped = rule.heard.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const re = new RegExp("(^|[^\\p{L}\\p{N}])(" + escaped + ")(?=$|[^\\p{L}\\p{N}])", "giu");
    output = output.replace(re, (_, left: string) => left + rule.replacement);
  }
  return output;
}
