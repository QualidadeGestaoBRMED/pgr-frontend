import { describe, expect, it } from "vitest";
import { shouldShowFunctionInclusionBanner } from "./function-inclusion-banner-visibility";

describe("shouldShowFunctionInclusionBanner", () => {
  it("shows while elaborating (not locked) with a pending function inclusion", () => {
    expect(
      shouldShowFunctionInclusionBanner({
        functionInclusionPending: true,
        isInElaborationPhase: true,
        isLocked: false,
      })
    ).toBe(true);
  });

  it("hides once the document is finalized, even with a pending function inclusion", () => {
    // Finalizado vira acesso aberto pra qualquer usuário (outro fluxo),
    // não o aviso interno pro dono.
    expect(
      shouldShowFunctionInclusionBanner({
        functionInclusionPending: true,
        isInElaborationPhase: true,
        isLocked: true,
      })
    ).toBe(false);
  });

  it("hides when there is no pending function inclusion at all", () => {
    expect(
      shouldShowFunctionInclusionBanner({
        functionInclusionPending: false,
        isInElaborationPhase: true,
        isLocked: false,
      })
    ).toBe(false);
  });

  it("hides for a DONE card that was never locked", () => {
    expect(
      shouldShowFunctionInclusionBanner({
        functionInclusionPending: true,
        isInElaborationPhase: false,
        isLocked: false,
      })
    ).toBe(false);
  });
});
