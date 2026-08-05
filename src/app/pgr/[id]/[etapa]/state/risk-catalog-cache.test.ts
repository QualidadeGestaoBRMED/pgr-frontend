import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RiskCatalogPayload } from "../types";
import {
  RISK_CATALOG_CLIENT_TTL_MS,
  clearRiskCatalogCache,
  getCachedRiskCatalog,
} from "./risk-catalog-cache";

const catalog = (id: number): RiskCatalogPayload =>
  ({
    riskAgents: [{ id, name: `Agente ${id}` }],
    riskMatrix: {
      qualitative: [],
      quantitative: [],
    },
  }) as unknown as RiskCatalogPayload;

describe("getCachedRiskCatalog", () => {
  beforeEach(() => {
    clearRiskCatalogCache();
  });

  it("reutiliza o catálogo durante o TTL", async () => {
    const loader = vi.fn().mockResolvedValue(catalog(1));
    let now = 1_000;

    const first = await getCachedRiskCatalog(loader, () => now);
    now += RISK_CATALOG_CLIENT_TTL_MS - 1;
    const second = await getCachedRiskCatalog(loader, () => now);

    expect(second).toBe(first);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("compartilha a requisição enquanto o primeiro download está pendente", async () => {
    let resolveRequest!: (value: RiskCatalogPayload) => void;
    const loader = vi.fn(
      () =>
        new Promise<RiskCatalogPayload>((resolve) => {
          resolveRequest = resolve;
        })
    );

    const first = getCachedRiskCatalog(loader);
    const second = getCachedRiskCatalog(loader);
    resolveRequest(catalog(2));

    await expect(first).resolves.toEqual(catalog(2));
    await expect(second).resolves.toEqual(catalog(2));
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("renova o catálogo após o TTL", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce(catalog(1))
      .mockResolvedValueOnce(catalog(2));
    let now = 10_000;

    await getCachedRiskCatalog(loader, () => now);
    now += RISK_CATALOG_CLIENT_TTL_MS;
    const refreshed = await getCachedRiskCatalog(loader, () => now);

    expect(refreshed.riskAgents[0]?.id).toBe(2);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("preserva o último catálogo válido se a renovação falhar", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce(catalog(1))
      .mockRejectedValueOnce(new Error("indisponível"));
    let now = 20_000;

    const first = await getCachedRiskCatalog(loader, () => now);
    now += RISK_CATALOG_CLIENT_TTL_MS;
    const stale = await getCachedRiskCatalog(loader, () => now);

    expect(stale).toBe(first);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("não guarda uma resposta vazia", async () => {
    const empty = {
      riskAgents: [],
      riskMatrix: { qualitative: [], quantitative: [] },
    } as unknown as RiskCatalogPayload;
    const loader = vi
      .fn()
      .mockResolvedValueOnce(empty)
      .mockResolvedValueOnce(catalog(3));

    await expect(getCachedRiskCatalog(loader)).rejects.toThrow(
      "Catálogo de riscos vazio"
    );
    await expect(getCachedRiskCatalog(loader)).resolves.toEqual(catalog(3));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("ignora resposta antiga que termina depois da invalidação", async () => {
    let resolveOld!: (value: RiskCatalogPayload) => void;
    let resolveNew!: (value: RiskCatalogPayload) => void;
    const loader = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<RiskCatalogPayload>((resolve) => {
            resolveOld = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<RiskCatalogPayload>((resolve) => {
            resolveNew = resolve;
          })
      );

    const oldRequest = getCachedRiskCatalog(loader);
    clearRiskCatalogCache();
    const newRequest = getCachedRiskCatalog(loader);
    resolveOld(catalog(1));
    await oldRequest;

    const concurrentWithNew = getCachedRiskCatalog(loader);
    expect(concurrentWithNew).toBe(newRequest);
    resolveNew(catalog(2));

    await expect(newRequest).resolves.toEqual(catalog(2));
    await expect(concurrentWithNew).resolves.toEqual(catalog(2));
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
