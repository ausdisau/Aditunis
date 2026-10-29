import { describe, expect, it } from "vitest";
import { applyLexicon, evaluateGuardian, hasConsent, NOTICE_VERSION, type ConsentEvent } from "../src/index";

const event = (purpose: ConsentEvent["purpose"], allowed=true): ConsentEvent => ({
  eventId: "evt_1", purpose, allowed, occurredAt: "2026-10-29T00:00:00Z",
  noticeVersion: NOTICE_VERSION, method: "direct_accessible_ui"
});
describe("guardian purpose restrictions", () => {
  it("never infers consent from silence", () => {
    expect(evaluateGuardian({purpose:"local_capture",consentEvents:[]}).decision).toBe("HOLD_BRANCH");
  });
  it("revocation wins", () => {
    expect(hasConsent([event("local_capture"),event("local_capture",false)],"local_capture")).toBe(false);
  });
  it("capture permission is not external-transcription permission", () => {
    expect(evaluateGuardian({purpose:"external_transcription",consentEvents:[event("local_capture")],providerApproved:true,crossBorderReviewComplete:true,participantAccessibleReview:true}).decision).toBe("HOLD_BRANCH");
  });
  it("holds research if rights/ethics/owner approvals are absent", () => {
    expect(evaluateGuardian({purpose:"research_training",consentEvents:[event("research_training")]}).holds.length).toBeGreaterThan(1);
  });
  it("permits only the individually cleared research scope", () => {
    expect(evaluateGuardian({purpose:"research_training",consentEvents:[event("research_training")],rightsApproved:true,dataEncrypted:true,humanOversightApproved:true,ethicsReviewRequired:true,ethicsApproved:true}).decision).toBe("ALLOW_WITH_SAFEGUARDS");
  });
  it("personalisation opt-in does not permit training", () => {
    expect(evaluateGuardian({purpose:"research_training",consentEvents:[event("local_personalisation")],rightsApproved:true,dataEncrypted:true,humanOversightApproved:true,ethicsApproved:true}).decision).toBe("HOLD_BRANCH");
  });
});
describe("participant-controlled lexicon", () => {
  it("replaces whole words but not substrings", () => {
    expect(applyLexicon("cat concatenate",[{id:"r1",heard:"cat",replacement:"kitten",enabled:true}])).toBe("kitten concatenate");
  });
  it("supports punctuation in literal phrases", () => {
    expect(applyLexicon("Dr. Lee",[{id:"r2",heard:"Dr. Lee",replacement:"Doctor Lee",enabled:true}])).toBe("Doctor Lee");
  });
  it("keeps disabled rules inert", () => {
    expect(applyLexicon("hello",[{id:"r3",heard:"hello",replacement:"goodbye",enabled:false}])).toBe("hello");
  });
});
