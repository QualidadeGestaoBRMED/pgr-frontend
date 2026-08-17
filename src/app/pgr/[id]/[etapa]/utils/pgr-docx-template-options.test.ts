import { describe, expect, it } from "vitest";
import type { PgrDocxTemplateOption } from "../types";
import {
  buildPgrDiretrizOptions,
  resolveTemplateNrCode,
} from "./pgr-docx-template-options";

function template(
  overrides: Partial<PgrDocxTemplateOption>
): PgrDocxTemplateOption {
  return {
    id: 1,
    name: "Template",
    nrCode: "NR-01",
    ...overrides,
  };
}

describe("buildPgrDiretrizOptions", () => {
  it("uses the admin name for the effective default", () => {
    const options = buildPgrDiretrizOptions(
      [
        template({
          id: 10,
          name: "Nome definido no painel",
          isDefault: true,
        }),
        template({ id: 11, name: "Alternativo" }),
      ],
      "NR-01"
    );

    expect(options[0]).toMatchObject({
      label: "Nome definido no painel",
      templateId: null,
      isDefault: true,
    });
    expect(options.map((option) => option.label)).toEqual([
      "Nome definido no painel",
      "Alternativo",
    ]);
  });

  it("prefers a company default over the global default", () => {
    const options = buildPgrDiretrizOptions(
      [
        template({
          id: 10,
          name: "Global",
          isDefault: true,
          companyId: null,
        }),
        template({
          id: 20,
          name: "Da empresa",
          isDefault: true,
          companyId: 7,
        }),
      ],
      "NR-01"
    );

    expect(options[0].label).toBe("Da empresa");
    expect(options.some((option) => option.templateId === 20)).toBe(false);
    expect(options.some((option) => option.templateId === 10)).toBe(true);
  });

  it("keeps the BRMED fallback when no database default exists", () => {
    const options = buildPgrDiretrizOptions([], "NR-30");

    expect(options[0].label).toBe("Padrão BRMED NR-30");
  });
});

describe("resolveTemplateNrCode", () => {
  it("keeps each NR on its own template family", () => {
    // Regressão: era um `if` que devolvia NR-01 para tudo que não fosse NR-30,
    // então a NR-18 recebia a lista de modelos do NR-01.
    expect(resolveTemplateNrCode("NR-01")).toBe("NR-01");
    expect(resolveTemplateNrCode("NR-18")).toBe("NR-18");
    expect(resolveTemplateNrCode("NR-30")).toBe("NR-30");
  });

  it("keeps NR-29 on the NR-01 family, which is intentional", () => {
    expect(resolveTemplateNrCode("NR-29")).toBe("NR-01");
  });

  it("tolerates spacing and casing, and falls back for unknown NRs", () => {
    expect(resolveTemplateNrCode("nr-18")).toBe("NR-18");
    expect(resolveTemplateNrCode("  NR-30  ")).toBe("NR-30");
    expect(resolveTemplateNrCode("NR-99")).toBe("NR-01");
    expect(resolveTemplateNrCode("")).toBe("NR-01");
  });
});

describe("buildPgrDiretrizOptions for NR-18", () => {
  it("offers the NR-18 templates instead of the NR-01 ones", () => {
    const options = buildPgrDiretrizOptions(
      [
        template({ id: 13, name: "Modelo NR-01", nrCode: "NR-01", isDefault: true }),
        template({ id: 15, name: "Modelo NR-18", nrCode: "NR-18", isDefault: true }),
      ],
      "NR-18"
    );

    expect(options).toHaveLength(1);
    expect(options[0].nrCode).toBe("NR-18");
    expect(options[0].label).toBe("Modelo NR-18");
  });
});
