import { describe, expect, it } from "vitest";
import { mapCnpjLookupToRegistration } from "./cnpj-lookup";

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
