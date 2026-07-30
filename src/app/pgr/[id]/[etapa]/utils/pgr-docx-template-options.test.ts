import { describe, expect, it } from "vitest";
import type { PgrDocxTemplateOption } from "../types";
import { buildPgrDiretrizOptions } from "./pgr-docx-template-options";

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
