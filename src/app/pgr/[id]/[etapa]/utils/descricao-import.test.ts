import { describe, expect, it } from "vitest";

import {
  DESCRICAO_IMPORT_GUIDES,
  buildDescricaoImportTemplate,
  parseDescricaoExcel,
} from "./descricao-import";

const asFile = (buffer: ArrayBuffer, name: string) =>
  ({ name, arrayBuffer: async () => buffer }) as unknown as File;

describe("modelos de planilha da importação da Descrição do GHE", () => {
  it("o modelo de total geral reimporta somando a coluna Quantitativo", async () => {
    const buffer = await buildDescricaoImportTemplate("total-geral");
    const parsed = await parseDescricaoExcel(asFile(buffer, "total.xlsx"), {
      countMode: "quantitativo",
    });

    expect(parsed.functions.map((item) => [item.funcao, item.quantitativo])).toEqual([
      ["Assistente Administrativo", "3"],
      ["Operador de Máquinas", "5"],
    ]);
    expect(parsed.gheGroups.map((ghe) => ghe.name)).toEqual(["GHE 1", "GHE 2"]);
  });

  it("o modelo de ativos reimporta contando uma linha por funcionário", async () => {
    const buffer = await buildDescricaoImportTemplate("planilha-ativos");
    const parsed = await parseDescricaoExcel(asFile(buffer, "ativos.xlsx"), {
      countMode: "line",
    });

    expect(parsed.functions.map((item) => [item.funcao, item.quantitativo])).toEqual([
      ["Assistente Administrativo", "2"],
      ["Operador de Máquinas", "1"],
    ]);
  });

  it("todo modelo traz as colunas obrigatórias anunciadas", () => {
    for (const guide of Object.values(DESCRICAO_IMPORT_GUIDES)) {
      const headers = guide.templateRows[0];
      for (const column of guide.requiredColumns) {
        expect(headers).toContain(column);
      }
    }
  });
});
