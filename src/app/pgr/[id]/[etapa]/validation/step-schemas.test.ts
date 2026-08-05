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
  isValidMeasuredValue,
  isValidQuantitativeMeasurementValue,
  isCalculatedLimitValue,
  maskCpf,
  maskPhoneBr,
  normalizeMeasuredValue,
  sanitizeQuantitativeMeasurementInput,
  sanitizeMeasuredValueInput,
  normalizeQuantitativeMeasurementValue,
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
      responsibleRole: "",
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
      empresaNumero: "123",
      empresaBairro: "",
      empresaCidade: "Rio",
      empresaEstado: "RJ",
      empresaGrauRisco: "2",
      estabelecimentoEndereco: "Rua Est",
      estabelecimentoNumero: "10",
      estabelecimentoBairro: "",
      estabelecimentoCep: "20000-000",
      estabelecimentoCidade: "Rio",
      estabelecimentoEstado: "RJ",
      estabelecimentos: [
        {
          id: "est-1",
          tipo: "Próprio",
          nome: "Unidade Centro",
          cnpj: "33.000.167/0001-01",
          razaoSocial: "Unidade Centro LTDA",
          cnae: "01.11-3-01",
          numero: "10",
          endereco: "",
          bairro: "",
          cep: "",
          cidade: "",
          estado: "",
          grauRisco: "3",
          atividadePrincipal: "Operação",
          camposAdicionais: [],
        },
      ],
      estabelecimentoNome: "Unidade Centro",
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
          numero: "456",
          bairro: "",
          cep: "20000-000",
          cidade: "Rio de Janeiro",
          estado: "RJ",
          grauRisco: "3",
          atividadePrincipal: "Serviços",
          camposAdicionais: [],
        },
      ],
      responsavelPgrNome: "Joao",
      responsavelPgrFuncao: "Engenheiro",
      responsavelPgrTelefone: "(21) 99999-9999",
      responsavelPgrEmail: "joao@empresa.com",
      responsavelPgrCpf: "529.982.247-25",
    };

    const completeWithOptionalContactsEmpty = {
      ...complete,
      responsavelPgrTelefone: "",
      responsavelPgrEmail: "",
      responsavelPgrCpf: "",
    };
    const invalid = { ...complete, responsavelPgrEmail: "email-invalido" };

    expect(isDadosCadastraisComplete(complete as never)).toBe(true);
    expect(isDadosCadastraisComplete(completeWithOptionalContactsEmpty as never)).toBe(true);
    expect(isDadosCadastraisComplete(invalid as never)).toBe(false);
  });

  it("accepts empty contractors list", () => {
    const completeWithoutContractors = {
      empresaRazaoSocial: "Razao",
      empresaCnpj: "04.252.011/0001-10",
      empresaCnae: "01.11-3-01",
      empresaEndereco: "Rua A",
      empresaNumero: "123",
      empresaBairro: "",
      empresaCidade: "Rio",
      empresaEstado: "RJ",
      empresaGrauRisco: "2",
      estabelecimentoEndereco: "Rua Est",
      estabelecimentoNumero: "10",
      estabelecimentoBairro: "",
      estabelecimentoCep: "20000-000",
      estabelecimentoCidade: "Rio",
      estabelecimentoEstado: "RJ",
      estabelecimentos: [
        {
          id: "est-1",
          tipo: "Próprio",
          nome: "Unidade Centro",
          cnpj: "33.000.167/0001-01",
          razaoSocial: "Unidade Centro LTDA",
          cnae: "01.11-3-01",
          numero: "10",
          endereco: "",
          bairro: "",
          cep: "",
          cidade: "",
          estado: "",
          grauRisco: "3",
          atividadePrincipal: "Operação",
          camposAdicionais: [],
        },
      ],
      estabelecimentoNome: "Unidade Centro",
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

  it("does not require calculated fields", () => {
    const quantitativeRisk = {
      id: "r-quantitative-1",
      tipoAgente: "Fisico",
      descricaoAgente: "Ruido",
      meioPropagacao: "Ar",
      fontes: "Maquinas",
      tipoAvaliacao: "Quantitativa",
      intensidade: "85 dB",
      severidade: "Alta",
      probabilidade: "",
      classificacao: "",
      medidasControle: "Isolamento",
      epc: "",
      epi: "",
    };

    expect(isRiskComplete(quantitativeRisk as never)).toBe(true);
    expect(
      isRiskComplete({
        ...quantitativeRisk,
        tipoAvaliacao: "Qualitativa",
      } as never)
    ).toBe(false);
    expect(
      isRiskComplete({
        ...quantitativeRisk,
        tipoAvaliacao: "Qualitativa",
        probabilidade: "Media",
      } as never)
    ).toBe(true);
  });

  it("accepts calculated tolerance limit text for qualitative risks", () => {
    const calculatedRisk = {
      id: "r-calculated-1",
      tipoAgente: "Fisico",
      descricaoAgente: "Calor",
      meioPropagacao: "Ar",
      fontes: "Ambiente externo",
      tipoAvaliacao: "Qualitativa",
      intensidade: "Calculado",
      nivelAcao: "Calculado",
      severidade: "Alta",
      probabilidade: "Media",
      classificacao: "",
      medidasControle: "Pausas programadas",
      epc: "",
      epi: "",
    };

    expect(isRiskComplete(calculatedRisk as never)).toBe(true);
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
    expect(isCalculatedLimitValue(" calculado ")).toBe(true);
    expect(isCalculatedLimitValue("85")).toBe(false);
  });

  it("normalizes and validates quantitative measurement values", () => {
    expect(sanitizeQuantitativeMeasurementInput("ab<80x")).toBe("<80");
    expect(sanitizeQuantitativeMeasurementInput("n / d")).toBe("N/D");
    expect(sanitizeQuantitativeMeasurementInput(">=80")).toBe(">=80");

    expect(normalizeQuantitativeMeasurementValue(" 80 ")).toBe("80");
    expect(normalizeQuantitativeMeasurementValue(" < 80 ")).toBe("<80");
    expect(normalizeQuantitativeMeasurementValue(">= 80")).toBe(">=80");
    expect(normalizeQuantitativeMeasurementValue("n/d")).toBe("N/D");
    expect(normalizeQuantitativeMeasurementValue("<lq")).toBe("<LQ");
    expect(normalizeQuantitativeMeasurementValue("lld")).toBe("LLD");

    expect(isValidQuantitativeMeasurementValue("80")).toBe(true);
    expect(isValidQuantitativeMeasurementValue("<80")).toBe(true);
    expect(isValidQuantitativeMeasurementValue(">80")).toBe(true);
    expect(isValidQuantitativeMeasurementValue("<=80")).toBe(true);
    expect(isValidQuantitativeMeasurementValue(">=80")).toBe(true);
    expect(isValidQuantitativeMeasurementValue("N/D")).toBe(true);
    expect(isValidQuantitativeMeasurementValue("<LQ")).toBe(true);
    expect(isValidQuantitativeMeasurementValue("LLD")).toBe(true);
    expect(isValidQuantitativeMeasurementValue("abc")).toBe(false);
  });

  it("normalizes and validates measured values", () => {
    expect(sanitizeMeasuredValueInput("n / d")).toBe("N/D");
    expect(sanitizeMeasuredValueInput("<lq")).toBe("<LQ");
    expect(sanitizeMeasuredValueInput("<80")).toBe("80");
    expect(sanitizeMeasuredValueInput("12,5")).toBe("12,5");
    expect(sanitizeMeasuredValueInput("12.5")).toBe("12.5");
    expect(sanitizeMeasuredValueInput("12,5.8")).toBe("12,58");

    expect(normalizeMeasuredValue(" 80 ")).toBe("80");
    expect(normalizeMeasuredValue("12,5")).toBe("12,5");
    expect(normalizeMeasuredValue("12.5")).toBe("12.5");
    expect(normalizeMeasuredValue("n/d")).toBe("N/D");
    expect(normalizeMeasuredValue("<lq")).toBe("<LQ");
    expect(normalizeMeasuredValue("lld")).toBe("");

    expect(isValidMeasuredValue("80")).toBe(true);
    expect(isValidMeasuredValue("12,5")).toBe(true);
    expect(isValidMeasuredValue("12.5")).toBe(true);
    expect(isValidMeasuredValue("N/D")).toBe(true);
    expect(isValidMeasuredValue("<LQ")).toBe(true);
    expect(isValidMeasuredValue("N/D", { allowShortcuts: false })).toBe(false);
    expect(isValidMeasuredValue("<80")).toBe(false);
    expect(isValidMeasuredValue("LLD")).toBe(false);
    expect(isValidMeasuredValue("abc")).toBe(false);
  });
});
