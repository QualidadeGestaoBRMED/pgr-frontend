import { describe, expect, it } from "vitest";
import { shouldShowFunctionInclusionBanner } from "./function-inclusion-banner-visibility";

describe("shouldShowFunctionInclusionBanner", () => {
  it("shows while elaborating (not locked) with a pending function inclusion", () => {
    expect(
      shouldShowFunctionInclusionBanner({
        functionInclusionPending: true,
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
        isLocked: true,
      })
    ).toBe(false);
  });

  it("hides when there is no pending function inclusion at all", () => {
    expect(
      shouldShowFunctionInclusionBanner({
        functionInclusionPending: false,
        isLocked: false,
      })
    ).toBe(false);
  });
});
