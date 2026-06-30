import { describe, expect, it, vi } from "vitest";

import {
  buildPgrExportFileBase,
  sanitizeExportFilenamePart,
} from "./export-filename";

describe("export filename helpers", () => {
  it("normalizes unicode dashes into a single filename separator", () => {
    expect(
      sanitizeExportFilenamePart(
        "INSTALAÇÕES ELÉTRICAS PREDIAL – MANUTENÇÃO PREDIAL PERFIL X"
      )
    ).toBe("INSTALAÇÕES-ELÉTRICAS-PREDIAL-MANUTENÇÃO-PREDIAL-PERFIL-X");
  });

  it("builds PGR export filenames without duplicated dash separators", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00Z"));

    expect(
      buildPgrExportFileBase({
        companyName:
          "INSTALAÇÕES ELÉTRICAS PREDIAL – MANUTENÇÃO PREDIAL PERFIL X",
        fallbackPgrId: "pgr-1",
        historico: {
          title: "Historico",
          subtitle: "Alteracoes",
          changes: [
            {
              id: "hist-1",
              company: "Empresa",
              analysis: "ANL 00",
              change: "ALT 00",
              reason: "Inicial",
              date: "2026-01-01",
            },
          ],
        },
      })
    ).toBe(
      "PGR-INSTALAÇÕES-ELÉTRICAS-PREDIAL-MANUTENÇÃO-PREDIAL-PERFIL-X-ANL00-ALT00-2026"
    );

    vi.useRealTimers();
  });
});
