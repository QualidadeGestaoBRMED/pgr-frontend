import { describe, expect, it } from "vitest";
import {
  calculatePlanActionVigencia,
  completeVigenciaInterval,
  maskVigenciaInterval,
} from "./vigencia";

describe("maskVigenciaInterval", () => {
  it("formats a compact interval", () => {
    expect(maskVigenciaInterval("1003202510032026")).toBe(
      "10/03/2025 - 10/03/2026"
    );
  });

  it("does not auto-complete the end date while typing the start date", () => {
    expect(maskVigenciaInterval("10032025")).toBe("10/03/2025");
  });

  it("does not recalculate the end date while an existing start date is edited", () => {
    expect(maskVigenciaInterval("11/03/2025 - 09/03/2027")).toBe(
      "11/03/2025 - 09/03/2027"
    );
  });

  it("preserves a manually edited end date", () => {
    expect(maskVigenciaInterval("11/03/2025 - 10/03/2026")).toBe(
      "11/03/2025 - 10/03/2026"
    );
  });

  it("keeps focus on the first date when it is being deleted in an interval", () => {
    expect(maskVigenciaInterval("10/03/202 - 10/03/2026")).toBe("10/03/202");
  });

  it("keeps the first date stable when the second date is being deleted", () => {
    expect(maskVigenciaInterval("10/03/2025 - 10/03/202")).toBe(
      "10/03/2025 - 10/03/202"
    );
  });
});

describe("completeVigenciaInterval", () => {
  it("auto-calculates the end date after the start date is complete", () => {
    expect(completeVigenciaInterval("10/03/2025")).toBe(
      "10/03/2025 - 09/03/2027"
    );
  });

  it("preserves an explicitly typed end date", () => {
    expect(completeVigenciaInterval("10/03/2025 - 10/03/2026")).toBe(
      "10/03/2025 - 10/03/2026"
    );
  });
});

describe("calculatePlanActionVigencia", () => {
  it("calculates a two-year interval from the latest analysis", () => {
    expect(
      calculatePlanActionVigencia([
        { analysis: "01", change: "01", date: "2025-03-10" },
      ])
    ).toBe("10/03/2025 - 09/03/2027");
  });
});
