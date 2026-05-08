import { describe, expect, it } from "vitest";

import {
  isDadosCadastraisComplete,
  isGheInfoComplete,
  isInicioDraftComplete,
  isRiskComplete,
} from "./step-schemas";
import {
  isValidCnpj,
  isValidCpf,
  isValidEmail,
  isValidPhoneBr,
  isValidRiskGrade,
  maskCpf,
  maskPhoneBr,
} from "./br-field-utils";

describe("step schemas", () => {
  it("validates inicio draft required fields", () => {
    const complete = {
      syncedAt: null,
      pipefyCardId: "1",
      documentTitle: "PGR Teste",
      companyName: "Empresa X",
      unitName: "Unidade 1",
      cnpj: "04.252.011/0001-10",
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
      empresaCnpj: "04.252.011/0001-10",
      empresaCnae: "01.11-3-01",
      empresaEndereco: "Rua A",
      empresaCidade: "Rio",
      empresaEstado: "RJ",
      empresaGrauRisco: "2",
      estabelecimentoCnpj: "33.000.167/0001-01",
      estabelecimentoGrauRisco: "3",
      contratantes: [
        {
          id: "contr-1",
          nomeFantasia: "Cliente X",
          razaoSocial: "Cliente X LTDA",
          cnpj: "45.543.915/0001-81",
          cnae: "62.01-5-01",
          endereco: "Rua B",
          cep: "20000-000",
          cidade: "Rio de Janeiro",
          estado: "RJ",
          grauRisco: "3",
          atividadePrincipal: "Serviços",
        },
      ],
      responsavelPgrNome: "Joao",
      responsavelPgrFuncao: "Engenheiro",
      responsavelPgrTelefone: "(21) 99999-9999",
      responsavelPgrEmail: "joao@empresa.com",
      responsavelPgrCpf: "529.982.247-25",
    };

    const invalid = { ...complete, responsavelPgrEmail: "" };

    expect(isDadosCadastraisComplete(complete as never)).toBe(true);
    expect(isDadosCadastraisComplete(invalid as never)).toBe(false);
  });

  it("allows empty contractors list", () => {
    const completeWithoutContractors = {
      empresaRazaoSocial: "Razao",
      empresaCnpj: "04.252.011/0001-10",
      empresaCnae: "01.11-3-01",
      empresaEndereco: "Rua A",
      empresaCidade: "Rio",
      empresaEstado: "RJ",
      empresaGrauRisco: "2",
      estabelecimentoCnpj: "33.000.167/0001-01",
      estabelecimentoGrauRisco: "3",
      contratantes: [],
      responsavelPgrNome: "Joao",
      responsavelPgrFuncao: "Engenheiro",
      responsavelPgrTelefone: "(21) 99999-9999",
      responsavelPgrEmail: "joao@empresa.com",
      responsavelPgrCpf: "529.982.247-25",
    };

    expect(isDadosCadastraisComplete(completeWithoutContractors as never)).toBe(true);
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
      epc: "Barreira acustica",
      epi: "Protetor auricular",
    };

    expect(isGheInfoComplete(gheInfo)).toBe(true);
    expect(isRiskComplete(risk)).toBe(true);
    expect(isRiskComplete({ ...risk, epc: "", epi: "" })).toBe(true);
  });

  it("accepts UI risk payload shape without perigo and with string epc/epi", () => {
    const uiRisk = {
      id: "r-ui-1",
      tipoAgente: "Fisico",
      descricaoAgente: "Ruido",
      meioPropagacao: "Ar",
      fontes: "Maquinas",
      tipoAvaliacao: "Quantitativa",
      intensidade: "85 dB",
      severidade: "Alta",
      probabilidade: "3",
      classificacao: "Moderado",
      medidasControle: "Isolamento",
      epc: "Barreira acustica",
      epi: "Protetor auricular",
    };

    expect(isRiskComplete(uiRisk as never)).toBe(true);
  });

  it("validates cpf/cnpj/email/phone/risk-grade helpers", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCnpj("04.252.011/0001-10")).toBe(true);
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(isValidEmail("contato@empresa.com.br")).toBe(true);
    expect(isValidEmail("contato@empresa")).toBe(false);
    expect(isValidPhoneBr("(21) 99999-9999")).toBe(true);
    expect(isValidPhoneBr("123")).toBe(false);
    expect(maskPhoneBr("21999999999")).toBe("(21) 99999-9999");
    expect(maskCpf("52998224725")).toBe("529.982.247-25");
    expect(isValidRiskGrade("1")).toBe(true);
    expect(isValidRiskGrade("5")).toBe(false);
  });
});
