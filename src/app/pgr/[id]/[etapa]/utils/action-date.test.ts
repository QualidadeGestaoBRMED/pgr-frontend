import { describe, expect, it } from "vitest";

import {
  calculateAutomaticActionDueDate,
  maskActionDate,
  normalizeActionDate,
  resolveActionDateValue,
  toBrDateValue,
} from "./action-date";

describe("action date helpers", () => {
  it("formats and normalizes action dates", () => {
    expect(maskActionDate("01022026")).toBe("01/02/2026");
    expect(normalizeActionDate("31022026")).toBe("31/02/2026");
    expect(normalizeActionDate("01022026")).toBe("01/02/2026");
    expect(toBrDateValue("2026-02-01")).toBe("01/02/2026");
  });

  it("falls back to the calculated row date when local draft is empty", () => {
    expect(resolveActionDateValue("", "2026-02-01")).toBe("01/02/2026");
    expect(resolveActionDateValue(undefined, "01/02/2026")).toBe("01/02/2026");
  });

  it("prefers a filled local action date over the calculated row date", () => {
    expect(resolveActionDateValue("02032026", "2026-02-01")).toBe("02/03/2026");
  });

  it("calculates automatic action due dates from plan validity and priority", () => {
    expect(
      calculateAutomaticActionDueDate({
        vigencia: "01/01/2026 - 31/12/2027",
        prioridade: "Alta",
        classificacao: "",
      })
    ).toBe("01/04/2026");
    expect(
      calculateAutomaticActionDueDate({
        vigencia: "01/01/2026 - 31/12/2027",
        prioridade: "",
        classificacao: "Risco Moderado",
      })
    ).toBe("30/06/2026");
  });
});
