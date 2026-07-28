import { describe, expect, it } from "vitest";
import { resolveReviewItemStatus } from "./revisao-review-items";

describe("resolveReviewItemStatus", () => {
  it("never blocks anexos even when empty — shows warning instead", () => {
    const status = resolveReviewItemStatus({
      stepId: "anexos",
      isDoneFromStatus: false,
      isAnexosEmpty: true,
      missingItemsCount: 0,
    });
    expect(status.isDone).toBe(true);
    expect(status.hasWarnings).toBe(true);
  });

  it("shows anexos as complete without warnings once it has files", () => {
    const status = resolveReviewItemStatus({
      stepId: "anexos",
      isDoneFromStatus: true,
      isAnexosEmpty: false,
      missingItemsCount: 0,
    });
    expect(status.isDone).toBe(true);
    expect(status.hasWarnings).toBe(false);
  });

  it("ignores isDoneFromStatus for anexos — it must never read as blocking", () => {
    // stepStatusById passed to the checklist is the display version, which
    // reports anexos as false when empty; the review item must not honor
    // that for blocking purposes even if isDoneFromStatus says false.
    const status = resolveReviewItemStatus({
      stepId: "anexos",
      isDoneFromStatus: false,
      isAnexosEmpty: false,
      missingItemsCount: 0,
    });
    expect(status.isDone).toBe(true);
  });

  it("keeps normal blocking behavior for every other step", () => {
    const incomplete = resolveReviewItemStatus({
      stepId: "descricao",
      isDoneFromStatus: false,
      isAnexosEmpty: false,
      missingItemsCount: 0,
    });
    expect(incomplete.isDone).toBe(false);
    expect(incomplete.hasWarnings).toBe(false);

    const doneWithWarnings = resolveReviewItemStatus({
      stepId: "descricao",
      isDoneFromStatus: true,
      isAnexosEmpty: false,
      missingItemsCount: 2,
    });
    expect(doneWithWarnings.isDone).toBe(true);
    expect(doneWithWarnings.hasWarnings).toBe(true);

    const doneNoWarnings = resolveReviewItemStatus({
      stepId: "descricao",
      isDoneFromStatus: true,
      isAnexosEmpty: false,
      missingItemsCount: 0,
    });
    expect(doneNoWarnings.isDone).toBe(true);
    expect(doneNoWarnings.hasWarnings).toBe(false);
  });

  it("does not treat dados specially — only anexos is optional", () => {
    const status = resolveReviewItemStatus({
      stepId: "dados",
      isDoneFromStatus: false,
      isAnexosEmpty: true,
      missingItemsCount: 0,
    });
    expect(status.isDone).toBe(false);
  });
});
