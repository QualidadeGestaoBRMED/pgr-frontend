import { describe, expect, it } from "vitest";
import {
  normalizeContractors,
  syncLegacyContractorFields,
} from "./contractors";

describe("contractors utils", () => {
  it("does not create contractor when both list and legacy fields are empty", () => {
    const result = normalizeContractors({} as never);
    expect(result).toEqual([]);
  });

  it("migrates legacy contractor fields into contratantes[]", () => {
    const result = normalizeContractors({
      contratanteNomeFantasia: "Cliente X",
      contratanteRazaoSocial: "Cliente X LTDA",
      contratanteCnpj: "45543915000181",
      contratanteCep: "20000000",
      contratanteGrauRisco: "3",
    } as never);

    expect(result).toHaveLength(1);
    expect(result[0].nomeFantasia).toBe("Cliente X");
    expect(result[0].razaoSocial).toBe("Cliente X LTDA");
    expect(result[0].cnpj).toBe("45.543.915/0001-81");
    expect(result[0].cep).toBe("20000-000");
    expect(result[0].grauRisco).toBe("3");
  });

  it("keeps legacy fields synced with first contractor", () => {
    const synced = syncLegacyContractorFields({
      contratantes: [
        {
          id: "contr-1",
          nomeFantasia: "Cliente A",
          razaoSocial: "Cliente A LTDA",
          cnpj: "04.252.011/0001-10",
          cnae: "62.01-5-01",
          endereco: "Rua A",
          cep: "20000-000",
          cidade: "Rio",
          estado: "RJ",
          grauRisco: "2",
          atividadePrincipal: "Serviços",
        },
      ],
    } as never);

    expect(synced.contratanteNomeFantasia).toBe("Cliente A");
    expect(synced.contratanteRazaoSocial).toBe("Cliente A LTDA");
    expect(synced.contratanteCnpj).toBe("04.252.011/0001-10");
    expect(synced.contratanteGrauRisco).toBe("2");
  });
});
