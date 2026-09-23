import { describe, expect, it } from "vitest";
import { keepManualValue, mapCnpjLookupToRegistration } from "./cnpj-lookup";

describe("mapCnpjLookupToRegistration", () => {
  it("maps and formats all registration fields returned by the CNPJ lookup", () => {
    expect(
      mapCnpjLookupToRegistration(
        {
          cnpj: "04252011000110",
          razao_social: "Empresa Exemplo LTDA",
          nome_fantasia: "Empresa Exemplo",
          cnae_fiscal: 6201501,
          cnae_fiscal_descricao: "Desenvolvimento de programas",
          logradouro: "Rua Principal",
          numero: "123",
          bairro: "Centro",
          cep: "01001000",
          municipio: "São Paulo",
          uf: "sp",
        },
        3
      )
    ).toEqual({
      nomeFantasia: "Empresa Exemplo",
      razaoSocial: "Empresa Exemplo LTDA",
      cnpj: "04.252.011/0001-10",
      cnae: "62.01-5-01",
      atividadePrincipal: "Desenvolvimento de programas",
      grauRisco: "3",
      endereco: "Rua Principal",
      numero: "123",
      bairro: "Centro",
      cep: "01001-000",
      cidade: "São Paulo",
      estado: "SP",
    });
  });

  it("keeps unavailable fields empty", () => {
    expect(mapCnpjLookupToRegistration({}, null)).toEqual({
      nomeFantasia: "",
      razaoSocial: "",
      cnpj: "",
      cnae: "",
      atividadePrincipal: "",
      grauRisco: "",
      endereco: "",
      numero: "",
      bairro: "",
      cep: "",
      cidade: "",
      estado: "",
    });
  });
});

describe("mapCnpjLookupToRegistration address normalization", () => {
  it("normalizes the uppercase address the BrasilAPI returns", () => {
    // Sintoma relatado: após o sync os campos chegavam ao formulário em CAIXA
    // ALTA e o CEP sem máscara, só ganhando formato quando o usuário editava.
    const registration = mapCnpjLookupToRegistration(
      {
        logradouro: "AVENIDA DAS NACOES UNIDAS",
        bairro: "VILA GERTRUDES",
        municipio: "SAO PAULO",
        uf: "sp",
        cep: "01001000",
      },
      null
    );

    expect(registration.endereco).toBe("Avenida das Nacoes Unidas");
    expect(registration.bairro).toBe("Vila Gertrudes");
    expect(registration.cidade).toBe("Sao Paulo");
    expect(registration.estado).toBe("SP");
    expect(registration.cep).toBe("01001-000");
  });

  it("keeps connectives lowercase, matching the backend normalizer", () => {
    const registration = mapCnpjLookupToRegistration(
      { logradouro: "RUA DAS FLORES", municipio: "RIO DE JANEIRO" },
      null
    );

    expect(registration.endereco).toBe("Rua das Flores");
    expect(registration.cidade).toBe("Rio de Janeiro");
  });
});

describe("keepManualValue", () => {
  it("keeps the name the analyst typed for the establishment", () => {
    // Sintoma relatado (#16): o Nome do Estabelecimento era apagado pelo Nome
    // Fantasia assim que o analista saía do campo de CNPJ.
    expect(keepManualValue("Filial Sul", "EMPRESA EXEMPLO")).toBe("Filial Sul");
  });

  it("falls back to the lookup value when the field is still empty", () => {
    expect(keepManualValue("", "Empresa Exemplo")).toBe("Empresa Exemplo");
    expect(keepManualValue("   ", "Empresa Exemplo")).toBe("Empresa Exemplo");
    expect(keepManualValue(undefined, "Empresa Exemplo")).toBe("Empresa Exemplo");
  });

  it("returns an empty string when neither side has a value", () => {
    expect(keepManualValue("", "")).toBe("");
    expect(keepManualValue(null, undefined)).toBe("");
  });
});
