import { describe, expect, it } from "vitest";
import {
  calculatePlanActionVigencia,
  completeVigenciaInterval,
  getVigenciaYearsForNr,
  maskVigenciaInterval,
  recalculateVigenciaForNr,
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

  it("calculates a three-year interval for NR-30", () => {
    expect(
      calculatePlanActionVigencia(
        [{ analysis: "01", change: "01", date: "2025-03-10" }],
        "NR-30"
      )
    ).toBe("10/03/2025 - 09/03/2028");
  });
});

describe("getVigenciaYearsForNr", () => {
  it("uses three years only for NR-30", () => {
    expect(getVigenciaYearsForNr("NR-30")).toBe(3);
    expect(getVigenciaYearsForNr("NR-01")).toBe(2);
    expect(getVigenciaYearsForNr("NR-18")).toBe(2);
    expect(getVigenciaYearsForNr("NR-29")).toBe(2);
  });

  it("tolerates spacing and casing variations of the NR label", () => {
    expect(getVigenciaYearsForNr("nr-30")).toBe(3);
    expect(getVigenciaYearsForNr("NR 30")).toBe(3);
    expect(getVigenciaYearsForNr("NR30")).toBe(3);
  });

  it("falls back to two years when the NR is missing", () => {
    expect(getVigenciaYearsForNr("")).toBe(2);
    expect(getVigenciaYearsForNr(undefined)).toBe(2);
  });
});

describe("completeVigenciaInterval with NR", () => {
  it("auto-calculates a three-year end date for NR-30", () => {
    expect(completeVigenciaInterval("10/03/2025", "NR-30")).toBe(
      "10/03/2025 - 09/03/2028"
    );
  });

  it("keeps two years for the other NRs", () => {
    expect(completeVigenciaInterval("10/03/2025", "NR-01")).toBe(
      "10/03/2025 - 09/03/2027"
    );
  });
});

describe("recalculateVigenciaForNr", () => {
  it("converts an existing two-year interval when NR-30 is selected", () => {
    expect(recalculateVigenciaForNr("10/03/2025 - 09/03/2027", "NR-30")).toBe(
      "10/03/2025 - 09/03/2028"
    );
  });

  it("converts back to two years when another NR is selected", () => {
    expect(recalculateVigenciaForNr("10/03/2025 - 09/03/2028", "NR-01")).toBe(
      "10/03/2025 - 09/03/2027"
    );
  });

  it("completes the end date when only the start date was filled", () => {
    expect(recalculateVigenciaForNr("10/03/2025", "NR-30")).toBe(
      "10/03/2025 - 09/03/2028"
    );
  });

  it("leaves the value untouched when there is no complete start date", () => {
    expect(recalculateVigenciaForNr("", "NR-30")).toBe("");
    expect(recalculateVigenciaForNr("10/03/202", "NR-30")).toBe("10/03/202");
  });

  it("handles a leap-day start date", () => {
    // 29/02 + 3 anos não existe em 2027: addYearsSafe trava em 28/02 e a regra
    // "menos um dia" leva a 27/02. Comportamento pré-existente, igual ao de 2 anos.
    expect(recalculateVigenciaForNr("29/02/2024", "NR-30")).toBe(
      "29/02/2024 - 27/02/2027"
    );
    expect(recalculateVigenciaForNr("29/02/2024", "NR-01")).toBe(
      "29/02/2024 - 27/02/2026"
    );
  });
});
