import { describe, expect, it } from "vitest";
import { clearGheFunctionAssignments } from "./descricao-reset";
import type { GheGroup } from "../types";

const gheGroups: GheGroup[] = [
  {
    id: "ghe-1",
    name: "Administrativo",
    info: { processo: "Rotinas de escritório", observacoes: "-", ambiente: "Interno" },
    items: [
      { functionId: "fn-1", funcionarios: "3" },
      { functionId: "fn-2", funcionarios: "1" },
    ],
  },
  {
    id: "ghe-2",
    name: "Produção",
    info: { processo: "Linha de montagem", observacoes: "-", ambiente: "Fabril" },
    items: [{ functionId: "fn-3", funcionarios: "12" }],
  },
];

describe("clearGheFunctionAssignments", () => {
  it("remove as funções de todos os GHEs", () => {
    const next = clearGheFunctionAssignments(gheGroups);
    expect(next.map((ghe) => ghe.items)).toEqual([[], []]);
  });

  it("preserva os GHEs e suas descrições — é o que mantém os riscos já caracterizados", () => {
    const next = clearGheFunctionAssignments(gheGroups);
    expect(next.map((ghe) => ghe.id)).toEqual(["ghe-1", "ghe-2"]);
    expect(next.map((ghe) => ghe.name)).toEqual(["Administrativo", "Produção"]);
    expect(next.map((ghe) => ghe.info)).toEqual(gheGroups.map((ghe) => ghe.info));
  });

  it("não muta a lista original", () => {
    clearGheFunctionAssignments(gheGroups);
    expect(gheGroups[0].items).toHaveLength(2);
  });
});
