import { describe, expect, it } from "vitest";

import {
  isDadosCadastraisComplete,
  isGheInfoComplete,
  isInicioDraftComplete,
  isRiskComplete,
} from "./step-schemas";

describe("step schemas", () => {
  it("validates inicio draft required fields", () => {
    const complete = {
      syncedAt: null,
      pipefyCardId: "1",
      documentTitle: "PGR Teste",
      companyName: "Empresa X",
      unitName: "Unidade 1",
      cnpj: "12.345.678/0001-90",
      responsible: "Maria",
      email: "maria@empresa.com",
      notes: "",
    };

    const invalid = { ...complete, companyName: "   " };

    expect(isInicioDraftComplete(complete)).toBe(true);
    expect(isInicioDraftComplete(invalid)).toBe(false);
  });

  it("validates dados cadastrais required subset", () => {
    const complete = {
      empresaRazaoSocial: "Razao",
      empresaCnpj: "12.345.678/0001-90",
      empresaCnae: "01.11-3-01",
      empresaEndereco: "Rua A",
      empresaCidade: "Rio",
      empresaEstado: "RJ",
      responsavelPgrNome: "Joao",
      responsavelPgrFuncao: "Engenheiro",
      responsavelPgrTelefone: "2199999999",
      responsavelPgrEmail: "joao@empresa.com",
      responsavelPgrCpf: "00000000000",
    };

    const invalid = { ...complete, responsavelPgrEmail: "" };

    expect(isDadosCadastraisComplete(complete as never)).toBe(true);
    expect(isDadosCadastraisComplete(invalid as never)).toBe(false);
  });

  it("validates ghe info and risk completeness", () => {
    const gheInfo = {
      processo: "Soldagem",
      observacoes: "Area ventilada",
      ambiente: "Offshore",
    };
    const risk = {
      id: "r1",
      tipoAgente: "Fisico",
      descricaoAgente: "Ruido",
      perigo: "Exposicao alta",
      meioPropagacao: "Ar",
      fontes: "Maquinas",
      tipoAvaliacao: "Quantitativa",
      intensidade: "85 dB",
      severidade: "Alta",
      probabilidade: "Media",
      classificacao: "Significativo",
      medidasControle: "Isolamento",
      epc: ["Barreira acustica"],
      epi: ["Protetor auricular"],
    };

    expect(isGheInfoComplete(gheInfo)).toBe(true);
    expect(isRiskComplete(risk)).toBe(true);
    expect(isRiskComplete({ ...risk, epc: [] })).toBe(false);
  });
});
