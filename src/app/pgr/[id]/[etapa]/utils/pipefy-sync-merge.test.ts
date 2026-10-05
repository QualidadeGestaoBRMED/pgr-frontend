import { describe, expect, it } from "vitest";

import { initialDadosCadastrais } from "../defaults";
import type { DadosCadastraisDraft } from "../steps/types";
import { syncLegacyContractorFields } from "./contractors";
import { syncLegacyEstablishmentFields } from "./establishments";
import { mergeSyncedDadosCadastrais, selectSyncedDados } from "./pipefy-sync-merge";

const syncLegacy = (dados: DadosCadastraisDraft) =>
  syncLegacyContractorFields(syncLegacyEstablishmentFields(dados));

// Resposta do sync-pipefy: cópia do banco (ainda com o que a tela acabou de
// limpar) com os campos do card por cima.
const FULL_RESPONSE: Partial<DadosCadastraisDraft> = {
  empresaNome: "Empresa do Card",
  empresaCnpj: "20.414.799/0001-70",
  empresaRazaoSocial: "Razao Antiga do Banco",
  empresaCidade: "Cidade Antiga",
  responsavelPgrNome: "Responsavel Antigo",
  contratanteCnpj: "33.000.167/0001-01",
};

const runSync = (
  prev: DadosCadastraisDraft,
  syncedFields: unknown,
  fallbackCompany = "Empresa do Card"
) =>
  syncLegacy(
    mergeSyncedDadosCadastrais({
      initial: initialDadosCadastrais,
      prev,
      syncedDados: selectSyncedDados(FULL_RESPONSE, syncedFields),
      hasSyncedFields: Array.isArray(syncedFields),
      fallbackCompany,
    })
  );

describe("pipefy sync merge", () => {
  it("keeps a field the user cleared when sync does not report it", () => {
    const cleared = syncLegacy({ ...initialDadosCadastrais });

    const result = runSync(cleared, ["empresaNome", "empresaCnpj"]);

    expect(result.empresaNome).toBe("Empresa do Card");
    expect(result.empresaCnpj).toBe("20.414.799/0001-70");
    // Vinham só da cópia do banco: não podem voltar para a tela.
    expect(result.empresaCidade).toBe("");
    expect(result.responsavelPgrNome).toBe("");
  });

  it("does not replace a razão social already on screen with the company name", () => {
    const prev = syncLegacy({ ...initialDadosCadastrais, empresaRazaoSocial: "Razao da Tela" });

    expect(runSync(prev, ["empresaNome"]).empresaRazaoSocial).toBe("Razao da Tela");
    expect(runSync(syncLegacy({ ...initialDadosCadastrais }), ["empresaNome"]).empresaRazaoSocial).toBe(
      "Empresa do Card"
    );
  });

  it("puts the card contratante CNPJ into the contratante list", () => {
    const withoutContratante = syncLegacy({ ...initialDadosCadastrais });
    const created = runSync(withoutContratante, ["contratanteCnpj"]);
    expect(created.contratantes).toHaveLength(1);
    expect(created.contratantes[0].cnpj).toBe("33.000.167/0001-01");

    const withContratante = syncLegacy({
      ...initialDadosCadastrais,
      contratantes: [
        { ...created.contratantes[0], cnpj: "11.111.111/0001-11", razaoSocial: "Da Tela" },
      ],
    });
    const updated = runSync(withContratante, ["contratanteCnpj"]);
    expect(updated.contratantes[0].cnpj).toBe("33.000.167/0001-01");
    expect(updated.contratantes[0].razaoSocial).toBe("Da Tela");
  });

  it("keeps a contratante untouched when the card has no contratante CNPJ", () => {
    const prev = syncLegacy({ ...initialDadosCadastrais });
    expect(runSync(prev, ["empresaNome"]).contratantes).toEqual([]);
  });

  it("applies the whole response for an old backend without syncedFields", () => {
    const result = runSync(syncLegacy({ ...initialDadosCadastrais }), undefined);
    expect(result.empresaCidade).toBe("Cidade Antiga");
    expect(result.empresaRazaoSocial).toBe("Razao Antiga do Banco");
  });
});
