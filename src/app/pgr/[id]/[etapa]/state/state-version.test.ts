import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPut } from "@/lib/api";
import { ApiError } from "@/lib/api";
import {
  allowEmptyFieldsOnNextSave,
  clearKnownUpdatedAt,
  isSavingPaused,
  putPgrState,
  resumeSaving,
  runInSaveChain,
  setConflictHandler,
  setKnownUpdatedAt,
  setSaveActivityHandler,
  setSaveErrorHandler,
} from "./state-version";

vi.mock("@/lib/api", () => ({
  apiPut: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const mockedApiPut = vi.mocked(apiPut);

afterEach(() => {
  setSaveActivityHandler(null);
  mockedApiPut.mockReset();
});

describe("atividade da fila de save", () => {
  it("mantém o indicador como salvando até a requisição terminar", async () => {
    let resolveSave!: (value: { updatedAt: string }) => void;
    mockedApiPut.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    const activity: boolean[] = [];
    setSaveActivityHandler((isSaving) => activity.push(isSaving));

    const save = putPgrState("pgr-indicator-1", { inicioDraft: { notes: "A" } });
    await vi.waitFor(() => expect(mockedApiPut).toHaveBeenCalledTimes(1));
    expect(activity.at(-1)).toBe(true);

    resolveSave({ updatedAt: "2026-08-05T12:00:00.000Z" });
    await save;

    expect(activity.at(-1)).toBe(false);
  });

  it("permanece como salvando enquanto existir outra operação na fila", async () => {
    let resolveFirst!: (value: { updatedAt: string }) => void;
    let resolveSecond!: (value: { updatedAt: string }) => void;
    mockedApiPut
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );
    const activity: boolean[] = [];
    setSaveActivityHandler((isSaving) => activity.push(isSaving));

    const first = putPgrState("pgr-indicator-2", { completedSteps: 1 });
    const second = putPgrState("pgr-indicator-2", { completedSteps: 2 });
    await vi.waitFor(() => expect(mockedApiPut).toHaveBeenCalledTimes(1));

    resolveFirst({ updatedAt: "2026-08-05T12:00:00.000Z" });
    await first;
    expect(activity.at(-1)).toBe(true);
    await vi.waitFor(() => expect(mockedApiPut).toHaveBeenCalledTimes(2));

    resolveSecond({ updatedAt: "2026-08-05T12:00:01.000Z" });
    await second;
    expect(activity.at(-1)).toBe(false);
  });

  it("também acompanha uploads e exclusões executados na mesma fila", async () => {
    let resolveMutation!: (value: { updatedAt: string }) => void;
    const activity: boolean[] = [];
    setSaveActivityHandler((isSaving) => activity.push(isSaving));

    const mutation = runInSaveChain(
      "pgr-indicator-3",
      () =>
        new Promise<{ updatedAt: string }>((resolve) => {
          resolveMutation = resolve;
        })
    );
    expect(activity.at(-1)).toBe(true);

    await vi.waitFor(() => expect(resolveMutation).toBeTypeOf("function"));
    resolveMutation({ updatedAt: "2026-08-05T12:00:02.000Z" });
    await mutation;
    expect(activity.at(-1)).toBe(false);
  });
});

describe("limpeza intencional de etapa", () => {
  it("envia allowEmptyFields na próxima gravação e só descarta após sucesso", async () => {
    const pgrId = "pgr-allow-empty-1";
    allowEmptyFieldsOnNextSave(pgrId, ["functions"]);

    // Primeira tentativa falha (rede): a intenção não pode ser perdida, senão
    // a limpeza volta a bater 409 na tentativa seguinte.
    mockedApiPut.mockRejectedValueOnce(new Error("network"));
    await putPgrState(pgrId, { functions: [] }).catch(() => undefined);
    expect(mockedApiPut.mock.calls[0]?.[1]).toMatchObject({
      allowEmptyFields: ["functions"],
    });

    mockedApiPut.mockResolvedValueOnce({ updatedAt: "2026-08-19T12:00:00.000Z" });
    await putPgrState(pgrId, { functions: [] });
    expect(mockedApiPut.mock.calls[1]?.[1]).toMatchObject({
      allowEmptyFields: ["functions"],
    });

    // Depois de gravar, o servidor já está com a lista vazia: a permissão não
    // deve continuar grudada nos autosaves seguintes.
    mockedApiPut.mockResolvedValueOnce({ updatedAt: "2026-08-19T12:00:01.000Z" });
    await putPgrState(pgrId, { functions: [] });
    expect(
      (mockedApiPut.mock.calls[2]?.[1] as Record<string, unknown>)
        .allowEmptyFields
    ).toBeUndefined();
  });

  it("não envia allowEmptyFields quando nada foi declarado", async () => {
    mockedApiPut.mockResolvedValueOnce({ updatedAt: "2026-08-19T12:00:00.000Z" });
    await putPgrState("pgr-allow-empty-2", { functions: [] });
    expect(
      (mockedApiPut.mock.calls[0]?.[1] as Record<string, unknown>)
        .allowEmptyFields
    ).toBeUndefined();
  });
});

describe("409 que não é conflito de versão", () => {
  it("não abre o diálogo de conflito quando o save foi sem expectedUpdatedAt", async () => {
    const pgrId = "pgr-409-sem-token";
    clearKnownUpdatedAt(pgrId);
    resumeSaving();

    let conflicts = 0;
    const errors: boolean[] = [];
    setConflictHandler(() => {
      conflicts += 1;
    });
    setSaveErrorHandler((hasError) => errors.push(hasError));

    mockedApiPut.mockRejectedValueOnce(new ApiError("guarda", 409));
    await putPgrState(pgrId, { functions: [] }).catch(() => undefined);

    // Era aqui que nascia o loop: o diálogo abria, "Continuar editando" limpava
    // o token e repetia a mesma gravação, recusada pelo mesmo motivo.
    expect(conflicts).toBe(0);
    expect(errors.at(-1)).toBe(true);
    expect(isSavingPaused()).toBe(false);

    setConflictHandler(null);
    setSaveErrorHandler(null);
  });

  it("abre o diálogo de conflito quando havia expectedUpdatedAt", async () => {
    const pgrId = "pgr-409-com-token";
    resumeSaving();
    setKnownUpdatedAt(pgrId, "2026-08-19T12:00:00.000Z");

    let conflicts = 0;
    setConflictHandler(() => {
      conflicts += 1;
    });

    mockedApiPut.mockRejectedValueOnce(new ApiError("lost update", 409));
    await putPgrState(pgrId, { functions: [{ id: "f-1" }] }).catch(
      () => undefined
    );

    expect(conflicts).toBe(1);
    expect(isSavingPaused()).toBe(true);

    setConflictHandler(null);
    resumeSaving();
    clearKnownUpdatedAt(pgrId);
  });
});
