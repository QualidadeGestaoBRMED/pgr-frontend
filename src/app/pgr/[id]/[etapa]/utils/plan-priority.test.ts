import { describe, expect, it } from "vitest";

import {
  getPlanRowOrderRank,
  isManualPlanActionId,
  isModerateOrHigherPriority,
  normalizePriorityText,
  shouldKeepPlanRow,
} from "./plan-priority";

describe("plan priority utils", () => {
  it("normalizes supported priority labels to display text", () => {
    expect(normalizePriorityText("prioridade média")).toBe("Média");
    expect(normalizePriorityText("RISCO ALTO")).toBe("Alta");
    expect(normalizePriorityText("ações imediatas")).toBe("Imediata");
    expect(normalizePriorityText("baixo")).toBe("Baixa");
  });

  it("accepts only moderate-or-higher priorities", () => {
    expect(isModerateOrHigherPriority("Risco Moderado")).toBe(true);
    expect(isModerateOrHigherPriority("Prioridade Alta")).toBe(true);
    expect(isModerateOrHigherPriority("Risco Irrelevante")).toBe(false);
    expect(isModerateOrHigherPriority("texto desconhecido")).toBe(false);
    expect(isModerateOrHigherPriority("")).toBe(false);
  });
});

describe("manual plan actions", () => {
  it("recognises the id of an action created in the plan modal", () => {
    expect(isManualPlanActionId("plan-action-1758480000000-a1b2c3")).toBe(true);
    expect(isManualPlanActionId("nr-general-nr-01-1758480000000-1")).toBe(false);
    expect(isManualPlanActionId("")).toBe(false);
    expect(isManualPlanActionId(undefined)).toBe(false);
  });

  it("keeps a manual action with low priority and still drops the automatic one", () => {
    expect(shouldKeepPlanRow("Baixa", true)).toBe(true);
    expect(shouldKeepPlanRow("Baixa", false)).toBe(false);
    expect(shouldKeepPlanRow("Risco Irrelevante", false)).toBe(false);
    expect(shouldKeepPlanRow("Alta", false)).toBe(true);
    expect(shouldKeepPlanRow("", true)).toBe(true);
  });

  it("sorts template general measures before manual ones, and risks last", () => {
    const rank = (isGeneralMeasure: boolean, isManualAction: boolean) =>
      getPlanRowOrderRank({ isGeneralMeasure, isManualAction });

    expect(rank(true, false)).toBeLessThan(rank(true, true));
    expect(rank(true, true)).toBeLessThan(rank(false, false));
    expect(rank(false, true)).toBe(rank(false, false));
  });
});
