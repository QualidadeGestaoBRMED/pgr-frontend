import { describe, expect, it } from "vitest";
import {
  describeFunctionInclusionRequestNumbers,
  FUNCTION_INCLUSION_INLINE_NUMBERS_LIMIT,
} from "./function-inclusion-request-summary";

describe("resumo dos números de solicitação no banner", () => {
  it("não escreve nada quando não há número", () => {
    expect(describeFunctionInclusionRequestNumbers([])).toBeNull();
    expect(describeFunctionInclusionRequestNumbers(["", "  "])).toBeNull();
  });

  it("usa o singular com uma solicitação", () => {
    expect(describeFunctionInclusionRequestNumbers(["122535"])).toBe(
      "Solicitação nº 122535"
    );
  });

  it("lista os números até o limite", () => {
    expect(
      describeFunctionInclusionRequestNumbers(["121788", "121362", "121180"])
    ).toBe("Solicitações nº 121788, 121362, 121180");
    expect(FUNCTION_INCLUSION_INLINE_NUMBERS_LIMIT).toBe(3);
  });

  it("aponta para o botão quando passa do limite", () => {
    expect(
      describeFunctionInclusionRequestNumbers([
        "121788",
        "121362",
        "121180",
        "120915",
      ])
    ).toBe(
      '4 solicitações pendentes — clique em "Verificar solicitações" para ver os números.'
    );
  });

  it("conta só os números válidos ao decidir pelo limite", () => {
    expect(
      describeFunctionInclusionRequestNumbers(["1", "2", "3", "  ", ""])
    ).toBe("Solicitações nº 1, 2, 3");
  });
});
