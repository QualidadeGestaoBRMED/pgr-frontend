import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPut } from "@/lib/api";
import {
  putPgrState,
  runInSaveChain,
  setSaveActivityHandler,
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
