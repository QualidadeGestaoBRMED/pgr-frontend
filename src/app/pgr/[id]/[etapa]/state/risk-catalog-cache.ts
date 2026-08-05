import type { RiskCatalogPayload } from "../types";

export const RISK_CATALOG_CLIENT_TTL_MS = 10 * 60 * 1000;

type RiskCatalogCacheEntry = {
  data: RiskCatalogPayload;
  loadedAt: number;
};

let cachedEntry: RiskCatalogCacheEntry | null = null;
let pendingRequest: Promise<RiskCatalogPayload> | null = null;
let cacheGeneration = 0;

const hasCatalogData = (data: RiskCatalogPayload): boolean => {
  const hasMatrixData =
    Array.isArray(data.riskMatrix?.qualitative) &&
    data.riskMatrix.qualitative.length > 0 &&
    Array.isArray(data.riskMatrix?.quantitative) &&
    data.riskMatrix.quantitative.length > 0;

  return (
    (Array.isArray(data.riskAgents) && data.riskAgents.length > 0) ||
    hasMatrixData
  );
};

/**
 * Cache compartilhado entre as rotas do wizard. A Promise também é
 * compartilhada para impedir downloads duplicados quando duas montagens
 * acontecem antes da primeira resposta terminar.
 *
 * Se a renovação falhar, conserva o último catálogo válido. Catálogo antigo é
 * mais seguro do que zerar opções e normalizações já usadas pelo documento.
 */
export function getCachedRiskCatalog(
  loader: () => Promise<RiskCatalogPayload>,
  now: () => number = Date.now
): Promise<RiskCatalogPayload> {
  const currentTime = now();
  if (
    cachedEntry &&
    currentTime - cachedEntry.loadedAt < RISK_CATALOG_CLIENT_TTL_MS
  ) {
    return Promise.resolve(cachedEntry.data);
  }
  if (pendingRequest) return pendingRequest;

  const staleEntry = cachedEntry;
  const requestGeneration = cacheGeneration;
  const request = loader()
    .then((data) => {
      if (!hasCatalogData(data)) {
        throw new Error("Catálogo de riscos vazio");
      }
      if (requestGeneration === cacheGeneration) {
        cachedEntry = {
          data,
          loadedAt: now(),
        };
      }
      return data;
    })
    .catch((error) => {
      if (requestGeneration === cacheGeneration && staleEntry) {
        return staleEntry.data;
      }
      throw error;
    })
    .finally(() => {
      if (pendingRequest === request) {
        pendingRequest = null;
      }
    });

  pendingRequest = request;
  return request;
}

export function clearRiskCatalogCache(): void {
  cacheGeneration += 1;
  cachedEntry = null;
  pendingRequest = null;
}
