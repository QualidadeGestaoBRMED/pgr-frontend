import { describe, expect, it } from "vitest";

import {
  isModerateOrHigherPriority,
  normalizePriorityText,
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
