import { describe, expect, it } from "vitest";
import {
  createPersistPayloadSnapshot,
  selectChangedPersistPayload,
  selectSafeQueuedPersistPayload,
} from "./step-persistence";

const persisted = {
  completedSteps: 3,
  meta: { pgrId: "pgr-1", progressPercent: 43 },
  dadosCadastrais: { empresaNome: "Empresa" },
  historico: { changes: [] as Array<{ id: string }> },
  riskGheGroups: [{ id: "ghe-1", risks: [] as Array<{ id: string }> }],
  anexos: [{ id: "anexo-1", files: [] as string[] }],
};

describe("selectChangedPersistPayload", () => {
  it("envia somente a chave de topo alterada", () => {
    const current = {
      ...persisted,
      dadosCadastrais: { empresaNome: "Empresa atualizada" },
    };

    expect(
      selectChangedPersistPayload(createPersistPayloadSnapshot(persisted), current)
    ).toEqual({
      dadosCadastrais: current.dadosCadastrais,
    });
  });

  it("captura alterações automáticas em blocos diferentes", () => {
    const current = {
      ...persisted,
      historico: { changes: [{ id: "historico-1" }] },
      riskGheGroups: [
        { id: "ghe-1", risks: [{ id: "risco-normalizado" }] },
      ],
    };

    expect(
      selectChangedPersistPayload(createPersistPayloadSnapshot(persisted), current)
    ).toEqual({
      historico: current.historico,
      riskGheGroups: current.riskGheGroups,
    });
  });

  it("não inclui blocos sem alteração", () => {
    const current = { ...persisted };

    expect(
      selectChangedPersistPayload(createPersistPayloadSnapshot(persisted), current)
    ).toEqual({});
  });

  it("captura mutação in-place mesmo quando outra seção também mudou", () => {
    const previous = {
      dados: { nome: "Empresa" },
      riscos: [{ id: "risco-1", descricao: "Antes" }],
    };
    const snapshot = createPersistPayloadSnapshot(previous);
    previous.riscos[0].descricao = "Depois";
    const current = {
      ...previous,
      dados: { nome: "Empresa atualizada" },
    };

    expect(selectChangedPersistPayload(snapshot, current)).toEqual({
      dados: current.dados,
      riscos: current.riscos,
    });
  });

  it("mantém o payload completo quando ainda não existe baseline", () => {
    expect(selectChangedPersistPayload(null, persisted)).toBe(persisted);
  });

  it("envia uma reversão feita enquanto o valor intermediário está na fila", () => {
    const confirmedState = { nome: "Original", observacao: "" };
    const enqueuedState = { nome: "Intermediário", observacao: "" };
    const revertedState = { nome: "Original", observacao: "Nova" };

    expect(
      selectSafeQueuedPersistPayload(
        createPersistPayloadSnapshot(confirmedState),
        createPersistPayloadSnapshot(enqueuedState),
        revertedState,
        createPersistPayloadSnapshot(revertedState)
      )
    ).toEqual(revertedState);
  });

  it("mantém mudanças do snapshot completo se o save anterior falhar", () => {
    const confirmedState = { nome: "Original", observacao: "" };
    const failedEnqueuedState = { nome: "Novo", observacao: "" };
    const currentState = { nome: "Novo", observacao: "Preenchida" };

    expect(
      selectSafeQueuedPersistPayload(
        createPersistPayloadSnapshot(confirmedState),
        createPersistPayloadSnapshot(failedEnqueuedState),
        currentState,
        createPersistPayloadSnapshot(currentState)
      )
    ).toEqual(currentState);
  });
});
