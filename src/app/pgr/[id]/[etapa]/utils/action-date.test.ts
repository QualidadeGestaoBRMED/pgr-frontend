import { describe, expect, it } from "vitest";

import {
  calculateAutomaticActionDueDate,
  maskActionDate,
  normalizeActionDate,
  toBrDateValue,
} from "./action-date";

describe("action date helpers", () => {
  it("formats and normalizes action dates", () => {
    expect(maskActionDate("01022026")).toBe("01/02/2026");
    expect(normalizeActionDate("31022026")).toBe("31/02/2026");
    expect(normalizeActionDate("01022026")).toBe("01/02/2026");
    expect(toBrDateValue("2026-02-01")).toBe("01/02/2026");
  });

  it("calculates automatic action due dates from plan validity and priority", () => {
    expect(
      calculateAutomaticActionDueDate({
        vigencia: "01/01/2026 - 31/12/2027",
        prioridade: "Alta",
      })
    ).toBe("01/04/2026");
    expect(
      calculateAutomaticActionDueDate({
        vigencia: "01/01/2026 - 31/12/2027",
        prioridade: "Prioridade Média",
      })
    ).toBe("30/06/2026");
  });

  it("does not fall back to risk classification when calculating due dates", () => {
    expect(
      calculateAutomaticActionDueDate({
        vigencia: "01/01/2026 - 31/12/2027",
        prioridade: "Prioridade Média",
      })
    ).toBe("30/06/2026");
    expect(
      calculateAutomaticActionDueDate({
        vigencia: "01/01/2026 - 31/12/2027",
        prioridade: "",
      })
    ).toBe("");
  });
});
