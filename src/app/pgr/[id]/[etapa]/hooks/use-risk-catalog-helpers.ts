import { useCallback, useMemo } from "react";
import { DEFAULT_TIPO_AGENTE_OPTIONS } from "../defaults";
import type { GheRisk, RiskCatalogPayload } from "../types";

const DEFAULT_EPC_EPI_TEXT = "A ser evidenciado na fase de reconhecimento";

const normalizeCatalogToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isNaSelection = (value: string) => normalizeCatalogToken(value) === "na";

const isGenericPropagationValue = (value: string) =>
  normalizeCatalogToken(value) === "agentequimico";

const getFirstCatalogValue = (map: Map<number, string[]>, agentId?: number) => {
  if (!agentId) return "";
  const values = map.get(agentId);
  return values?.[0] || "";
};

const toCatalogAgentId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nested =
      record.id ??
      record.pk ??
      record.agent_id ??
      record.agentId ??
      (record.agent as unknown);
    return toCatalogAgentId(nested);
  }
  return null;
};

export const hasMeaningfulSelections = (values: string[] | undefined) =>
  Array.isArray(values) && values.some((item) => item.trim().length > 0);

const hasActionableSelections = (values: string[] | undefined) =>
  Array.isArray(values) &&
  values.some((item) => item.trim().length > 0 && !isNaSelection(item));

export const areStringArraysEqual = (a: string[] | undefined, b: string[] | undefined) => {
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const deriveProtectionDefaults = (risk: GheRisk) => {
  const tipo = normalizeCatalogToken(risk.tipoAgente);
  const descricao = normalizeCatalogToken(risk.descricaoAgente);

  const epc = new Set<string>();
  const epi = new Set<string>();

  const addEpc = (...items: string[]) => {
    items.forEach((item) => epc.add(item));
  };
  const addEpi = (...items: string[]) => {
    items.forEach((item) => epi.add(item));
  };

  if (tipo.includes("quim")) {
    addEpc("Sistema de exaustão", "Ventilação local");
    addEpi("Respirador (CA 67890)", "Óculos de proteção (CA 55555)");
  }

  if (tipo.includes("fis")) {
    addEpc("Barreiras físicas");
  }

  if (tipo.includes("bio")) {
    addEpc("Barreiras físicas");
    addEpi("Respirador (CA 67890)", "Óculos de proteção (CA 55555)");
  }

  if (descricao.includes("ruido")) {
    addEpc("Barreiras físicas");
    addEpi("Protetor auricular (CA 44444)");
  }

  if (
    descricao.includes("poeira") ||
    descricao.includes("fum") ||
    descricao.includes("vap") ||
    descricao.includes("gas")
  ) {
    addEpc("Sistema de exaustão", "Ventilação local");
    addEpi("Respirador (CA 67890)", "Óculos de proteção (CA 55555)");
  }

  if (descricao.includes("solda")) {
    addEpi("Máscara de solda (CA 12345)", "Óculos de proteção (CA 55555)");
    addEpc("Cortinas de proteção");
  }

  const nextEpc = Array.from(epc);
  const nextEpi = Array.from(epi);

  return {
    epc: nextEpc.length ? nextEpc : [DEFAULT_EPC_EPI_TEXT],
    epi: nextEpi.length ? nextEpi : [DEFAULT_EPC_EPI_TEXT],
  };
};

export function useRiskCatalogHelpers(riskCatalogs: RiskCatalogPayload | null) {
  const normalizeAgentName = useCallback((value: string) => normalizeCatalogToken((value || "").trim()), []);

  const tipoAgenteOptions = useMemo(() => {
    const fromCatalog = (riskCatalogs?.riskAgents || [])
      .map((item) => String(item.name || "").trim())
      .filter((name) => name.length > 0);
    return fromCatalog.length ? fromCatalog : DEFAULT_TIPO_AGENTE_OPTIONS;
  }, [riskCatalogs]);

  const riskAgentIdByNameExact = useMemo(() => {
    const map = new Map<string, number>();
    (riskCatalogs?.riskAgents || []).forEach((item) => {
      const safeName = String(item.name || "").trim();
      const safeId = toCatalogAgentId((item as { id?: unknown }).id);
      if (!safeName) return;
      if (!safeId) return;
      map.set(safeName, safeId);
    });
    return map;
  }, [riskCatalogs]);

  const riskAgentIdByNameNormalized = useMemo(() => {
    const map = new Map<string, number>();
    (riskCatalogs?.riskAgents || []).forEach((item) => {
      const safeName = String(item.name || "").trim();
      const safeId = toCatalogAgentId((item as { id?: unknown }).id);
      if (!safeName) return;
      if (!safeId) return;
      map.set(normalizeAgentName(safeName), safeId);
    });
    return map;
  }, [normalizeAgentName, riskCatalogs]);

  const resolveRiskAgentId = useCallback(
    (agentName: string): number | undefined => {
      const safeName = String(agentName || "").trim();
      if (!safeName) return undefined;
      const exact = riskAgentIdByNameExact.get(safeName);
      if (typeof exact === "number") return exact;
      const normalized = normalizeAgentName(safeName);
      const normalizedMatch = riskAgentIdByNameNormalized.get(normalized);
      if (typeof normalizedMatch === "number") return normalizedMatch;

      // Fallback resiliente para catálogos com nomes compostos/legados
      // (ex.: "Químico (não utilizar)") preservando o mapeamento por agente.
      for (const [token, id] of riskAgentIdByNameNormalized.entries()) {
        if (token.includes(normalized) || normalized.includes(token)) {
          return id;
        }
      }
      return undefined;
    },
    [normalizeAgentName, riskAgentIdByNameExact, riskAgentIdByNameNormalized]
  );

  const riskDescriptionsByAgent = useMemo(() => {
      const grouped = new Map<number, string[]>();
      (riskCatalogs?.riskDescriptions || []).forEach((item) => {
        const safeAgentId = toCatalogAgentId((item as { agent?: unknown }).agent);
        if (!safeAgentId || !item.name) return;
        const safeName = String(item.name || "").trim();
        if (!safeName) return;
        const current = grouped.get(safeAgentId) || [];
        if (!current.includes(safeName)) current.push(safeName);
        grouped.set(safeAgentId, current);
      });
      return grouped;
  }, [riskCatalogs]);

  const hazardsByAgent = useMemo(() => {
      const grouped = new Map<number, string[]>();
      (riskCatalogs?.hazards || []).forEach((item) => {
        const safeAgentId = toCatalogAgentId((item as { agent?: unknown }).agent);
        if (!safeAgentId || !item.name) return;
        const safeName = String(item.name || "").trim();
        if (!safeName) return;
        const current = grouped.get(safeAgentId) || [];
        if (!current.includes(safeName)) current.push(safeName);
        grouped.set(safeAgentId, current);
      });
      return grouped;
  }, [riskCatalogs]);

  const riskSourcesByAgent = useMemo(() => {
      const grouped = new Map<number, string[]>();
      (riskCatalogs?.riskSources || []).forEach((item) => {
        const safeAgentId = toCatalogAgentId((item as { agent?: unknown }).agent);
        if (!safeAgentId || !item.name) return;
        const safeName = String(item.name || "").trim();
        if (!safeName) return;
        const current = grouped.get(safeAgentId) || [];
        if (!current.includes(safeName)) current.push(safeName);
        grouped.set(safeAgentId, current);
      });
      return grouped;
  }, [riskCatalogs]);

  const propagationPathsByAgent = useMemo(() => {
      const grouped = new Map<number, string[]>();
      (riskCatalogs?.propagationPaths || []).forEach((item) => {
        const safeAgentId = toCatalogAgentId((item as { agent?: unknown }).agent);
        if (!safeAgentId || !item.name) return;
        const safeName = String(item.name || "").trim();
        if (!safeName) return;
        const current = grouped.get(safeAgentId) || [];
        if (!current.includes(safeName)) current.push(safeName);
        grouped.set(safeAgentId, current);
      });
      return grouped;
  }, [riskCatalogs]);

  const healthDamagesByAgent = useMemo(() => {
      const grouped = new Map<number, string[]>();
      (riskCatalogs?.healthDamages || []).forEach((item) => {
        const safeAgentId = toCatalogAgentId((item as { agent?: unknown }).agent);
        if (!safeAgentId || !item.name) return;
        const safeName = String(item.name || "").trim();
        if (!safeName) return;
        const current = grouped.get(safeAgentId) || [];
        if (!current.includes(safeName)) current.push(safeName);
        grouped.set(safeAgentId, current);
      });
      return grouped;
  }, [riskCatalogs]);

  const getRiskDefaults = useCallback(
    (risk: GheRisk): Partial<GheRisk> => {
      const agentId = resolveRiskAgentId(risk.tipoAgente);
      const perigoDefault =
        getFirstCatalogValue(healthDamagesByAgent, agentId) ||
        getFirstCatalogValue(hazardsByAgent, agentId);
      const meioPropagacaoDefault = getFirstCatalogValue(
        propagationPathsByAgent,
        agentId
      );
      const fontesDefault = getFirstCatalogValue(riskSourcesByAgent, agentId);
      const medidasControleDefault = risk.descricaoAgente
        ? `Implementar medidas de prevenção e controle para exposição a ${risk.descricaoAgente}.`
        : "";
      const protectionDefaults = deriveProtectionDefaults(risk);
      return {
        perigo: perigoDefault,
        meioPropagacao: meioPropagacaoDefault,
        fontes: fontesDefault,
        tipoAvaliacao: "Qualitativa",
        intensidade: "Não avaliado",
        severidade: "Média",
        probabilidade: "3",
        classificacao: "Moderado",
        medidasControle: medidasControleDefault,
        epc: protectionDefaults.epc,
        epi: protectionDefaults.epi,
      };
    },
    [
      hazardsByAgent,
      healthDamagesByAgent,
      propagationPathsByAgent,
      resolveRiskAgentId,
      riskSourcesByAgent,
    ]
  );

  const applyMissingRiskDefaults = useCallback((risk: GheRisk): GheRisk => {
    const normalizedRisk: GheRisk = {
      ...risk,
      epc: Array.isArray(risk.epc) ? risk.epc : [],
      epi: Array.isArray(risk.epi) ? risk.epi : [],
    };
    if (!normalizedRisk.tipoAgente || !normalizedRisk.descricaoAgente) {
      return normalizedRisk;
    }
    const defaults = getRiskDefaults(normalizedRisk);
    const shouldUseDefaultPropagation =
      !normalizedRisk.meioPropagacao ||
      isGenericPropagationValue(normalizedRisk.meioPropagacao);
    return {
      ...normalizedRisk,
      perigo: normalizedRisk.perigo || defaults.perigo || "",
      meioPropagacao: shouldUseDefaultPropagation
        ? defaults.meioPropagacao || ""
        : normalizedRisk.meioPropagacao,
      fontes: normalizedRisk.fontes || defaults.fontes || "",
      tipoAvaliacao: normalizedRisk.tipoAvaliacao || defaults.tipoAvaliacao || "",
      intensidade: normalizedRisk.intensidade || defaults.intensidade || "",
      severidade: normalizedRisk.severidade || defaults.severidade || "",
      probabilidade: normalizedRisk.probabilidade || defaults.probabilidade || "",
      classificacao: normalizedRisk.classificacao || defaults.classificacao || "",
      medidasControle: normalizedRisk.medidasControle || defaults.medidasControle || "",
      epc: hasActionableSelections(normalizedRisk.epc)
        ? normalizedRisk.epc
        : defaults.epc || [],
      epi: hasActionableSelections(normalizedRisk.epi)
        ? normalizedRisk.epi
        : defaults.epi || [],
    };
  }, [getRiskDefaults]);

  const getDescricaoAgenteOptions = useCallback(
    (tipoAgente: string, currentValue: string) => {
      const agentId = resolveRiskAgentId(tipoAgente);
      const options = agentId
        ? riskDescriptionsByAgent.get(agentId) || []
        : [];

      const safeCurrentValue = String(currentValue || "").trim();
      if (!safeCurrentValue) return options;
      if (options.includes(safeCurrentValue)) {
        return options;
      }
      return options;
    },
    [resolveRiskAgentId, riskDescriptionsByAgent]
  );

  return {
    tipoAgenteOptions,
    applyMissingRiskDefaults,
    getDescricaoAgenteOptions,
  };
}
