import { describe, expect, it } from "vitest";

import { computeDescricaoProgressRatio, computeWeightedProgressPercent } from "./progress";

describe("progress utils", () => {
  it("computeDescricaoProgressRatio returns 0 for empty list", () => {
    expect(computeDescricaoProgressRatio([])).toBe(0);
  });

  it("computeDescricaoProgressRatio counts only fully described ghe", () => {
    const gheGroups = [
      {
        id: "g1",
        name: "GHE 1",
        info: { processo: "Proc", observacoes: "Obs", ambiente: "Amb" },
        items: [{ functionId: "f1", funcionarios: "2" }],
      },
      {
        id: "g2",
        name: "GHE 2",
        info: { processo: "Proc", observacoes: "", ambiente: "Amb" },
        items: [{ functionId: "f1", funcionarios: "2" }],
      },
      {
        id: "g3",
        name: "GHE 3",
        info: { processo: "Proc", observacoes: "Obs", ambiente: "Amb" },
        items: [],
      },
    ];

    expect(computeDescricaoProgressRatio(gheGroups)).toBeCloseTo(1 / 3);
  });

  it("computeWeightedProgressPercent forces 100 when locked", () => {
    const percent = computeWeightedProgressPercent({
      isLocked: true,
      gheGroups: [],
      stepStatusById: {},
    });
    expect(percent).toBe(100);
  });

  it("computeWeightedProgressPercent uses weighted descricao ratio", () => {
    const percent = computeWeightedProgressPercent({
      isLocked: false,
      gheGroups: [
        {
          id: "g1",
          name: "GHE 1",
          info: { processo: "Proc", observacoes: "Obs", ambiente: "Amb" },
          items: [{ functionId: "f1", funcionarios: "2" }],
        },
        {
          id: "g2",
          name: "GHE 2",
          info: { processo: "Proc", observacoes: "", ambiente: "Amb" },
          items: [{ functionId: "f1", funcionarios: "2" }],
        },
      ],
      stepStatusById: {
        inicio: true,
        historico: true,
        dados: true,
        caracterizacao: true,
        plano: true,
        anexos: true,
        revisao: true,
      },
    });

    // revisao não conta (gate pós-100%, não unidade de progresso):
    // (6 + 0.5) / 7 = 92.85... => round(93)
    expect(percent).toBe(93);
  });

  it("computeWeightedProgressPercent ignores revisao completion for the percentage", () => {
    const withRevisaoDone = computeWeightedProgressPercent({
      isLocked: false,
      gheGroups: [],
      stepStatusById: {
        inicio: true,
        historico: true,
        dados: true,
        caracterizacao: true,
        plano: true,
        anexos: true,
        revisao: true,
      },
    });
    const withoutRevisao = computeWeightedProgressPercent({
      isLocked: false,
      gheGroups: [],
      stepStatusById: {
        inicio: true,
        historico: true,
        dados: true,
        caracterizacao: true,
        plano: true,
        anexos: true,
        revisao: false,
      },
    });

    expect(withRevisaoDone).toBe(withoutRevisao);
  });
});
