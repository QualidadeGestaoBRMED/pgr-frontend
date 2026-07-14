import { describe, expect, it } from "vitest";
import type { PgrFunction } from "../types";
import {
  buildGheFunctionSummary,
  calculateGheQuantity,
  calculateGheQuantityPercentage,
  filterAndSortGheFunctions,
  type GheFunctionFilters,
  type GheFunctionSort,
  type GheFunctionTableItem,
} from "./ghe-function-table";

const functions = new Map<string, PgrFunction>([
  ["1", { id: "1", setor: "Administração", funcao: "Auxiliar 10", descricao: "Arquivo", quantitativo: "" }],
  ["2", { id: "2", setor: "Operacional", funcao: "Auxiliar 2", descricao: "Inspeção", quantitativo: "" }],
  ["3", { id: "3", setor: "Administração", funcao: "Auxiliar 1", descricao: "Atendimento", quantitativo: "" }],
]);

const items: GheFunctionTableItem[] = [
  { functionId: "1", funcionarios: "12" },
  { functionId: "2", funcionarios: "2" },
  { functionId: "3", funcionarios: "5" },
];

const emptyFilters: GheFunctionFilters = {
  setor: "",
  funcao: "",
  descricao: "",
  quantitativo: "",
};

const run = (filters = emptyFilters, sort: GheFunctionSort = null) =>
  filterAndSortGheFunctions(items, functions, filters, sort).map((item) => item.functionId);

describe("filterAndSortGheFunctions", () => {
  it("filters text ignoring accents and case", () => {
    expect(run({ ...emptyFilters, setor: "ADMINISTRACAO" })).toEqual(["1", "3"]);
    expect(run({ ...emptyFilters, descricao: "inspecao" })).toEqual(["2"]);
  });

  it("filters the GHE quantity", () => {
    expect(run({ ...emptyFilters, quantitativo: "2" })).toEqual(["1", "2"]);
  });

  it("sorts text in natural alphanumeric order", () => {
    expect(run(emptyFilters, { key: "funcao", direction: "asc" })).toEqual([
      "3",
      "2",
      "1",
    ]);
  });

  it("sorts quantities numerically without mutating the source", () => {
    expect(run(emptyFilters, { key: "quantitativo", direction: "desc" })).toEqual([
      "1",
      "3",
      "2",
    ]);
    expect(items.map((item) => item.functionId)).toEqual(["1", "2", "3"]);
  });
});

describe("calculateGheQuantity", () => {
  it("sums the quantities associated with a GHE", () => {
    expect(calculateGheQuantity(items)).toBe(19);
  });

  it("ignores empty, invalid and negative quantities", () => {
    expect(
      calculateGheQuantity([
        { functionId: "1", funcionarios: "" },
        { functionId: "2", funcionarios: "invalid" },
        { functionId: "3", funcionarios: -2 },
        { functionId: "4", funcionarios: "3" },
      ])
    ).toBe(3);
  });
});

describe("calculateGheQuantityPercentage", () => {
  it("calculates the GHE share of the total quantity", () => {
    expect(calculateGheQuantityPercentage(5, 20)).toBe(25);
  });

  it("returns zero when the total is zero or invalid", () => {
    expect(calculateGheQuantityPercentage(5, 0)).toBe(0);
    expect(calculateGheQuantityPercentage(5, Number.NaN)).toBe(0);
  });
});

describe("buildGheFunctionSummary", () => {
  it("groups functions by sector in natural alphanumeric order", () => {
    expect(buildGheFunctionSummary(items, functions)).toEqual([
      { setor: "Administração", funcoes: ["Auxiliar 1", "Auxiliar 10"] },
      { setor: "Operacional", funcoes: ["Auxiliar 2"] },
    ]);
  });

  it("ignores function ids that are not available", () => {
    expect(buildGheFunctionSummary([{ functionId: "missing" }], functions)).toEqual([]);
  });
});
