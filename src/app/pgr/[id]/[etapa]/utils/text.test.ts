import { describe, expect, it } from "vitest";

import { slugify, truncatePreview } from "./text";

describe("text utils", () => {
  it("truncatePreview normalizes spaces and limits length", () => {
    expect(truncatePreview("  abc   def  ")).toBe("abc def");
    expect(truncatePreview("1234567890", 5)).toBe("12345...");
  });

  it("slugify strips accents and punctuation", () => {
    expect(slugify("Árvore de Decisão / Teste!")).toBe("arvore-de-decisao-teste");
  });
});
