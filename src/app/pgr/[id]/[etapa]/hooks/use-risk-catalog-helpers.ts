import { useCallback, useMemo } from "react";
import { DEFAULT_DESCRICAO_AGENTE_OPTIONS, DEFAULT_TIPO_AGENTE_OPTIONS } from "../defaults";
import type { GheRisk, RiskCatalogPayload } from "../types";

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
    epc: nextEpc.length ? nextEpc : ["N/A"],
    epi: nextEpi.length ? nextEpi : ["N/A"],
  };
};

export function useRiskCatalogHelpers(riskCatalogs: RiskCatalogPayload | null) {
  const tipoAgenteOptions = useMemo(() => {
    const fromCatalog = (riskCatalogs?.riskAgents || []).map((item) => item.name);
    return fromCatalog.length ? fromCatalog : DEFAULT_TIPO_AGENTE_OPTIONS;
  }, [riskCatalogs]);

  const riskAgentIdByName = useMemo(() => {
    const map = new Map<string, number>();
    (riskCatalogs?.riskAgents || []).forEach((item) => {
      map.set(item.name, item.id);
    });
    return map;
  }, [riskCatalogs]);

  const riskDescriptionsByAgent = useMemo(() => {
    const grouped = new Map<number, string[]>();
    (riskCatalogs?.riskDescriptions || []).forEach((item) => {
      if (!item.agent || !item.name) return;
      const current = grouped.get(item.agent) || [];
      if (!current.includes(item.name)) current.push(item.name);
      grouped.set(item.agent, current);
    });
    return grouped;
  }, [riskCatalogs]);

  const hazardsByAgent = useMemo(() => {
    const grouped = new Map<number, string[]>();
    (riskCatalogs?.hazards || []).forEach((item) => {
      if (!item.agent || !item.name) return;
      const current = grouped.get(item.agent) || [];
      if (!current.includes(item.name)) current.push(item.name);
      grouped.set(item.agent, current);
    });
    return grouped;
  }, [riskCatalogs]);

  const riskSourcesByAgent = useMemo(() => {
    const grouped = new Map<number, string[]>();
    (riskCatalogs?.riskSources || []).forEach((item) => {
      if (!item.agent || !item.name) return;
      const current = grouped.get(item.agent) || [];
      if (!current.includes(item.name)) current.push(item.name);
      grouped.set(item.agent, current);
    });
    return grouped;
  }, [riskCatalogs]);

  const propagationPathsByAgent = useMemo(() => {
    const grouped = new Map<number, string[]>();
    (riskCatalogs?.propagationPaths || []).forEach((item) => {
      if (!item.agent || !item.name) return;
      const current = grouped.get(item.agent) || [];
      if (!current.includes(item.name)) current.push(item.name);
      grouped.set(item.agent, current);
    });
    return grouped;
  }, [riskCatalogs]);

  const healthDamagesByAgent = useMemo(() => {
    const grouped = new Map<number, string[]>();
    (riskCatalogs?.healthDamages || []).forEach((item) => {
      if (!item.agent || !item.name) return;
      const current = grouped.get(item.agent) || [];
      if (!current.includes(item.name)) current.push(item.name);
      grouped.set(item.agent, current);
    });
    return grouped;
  }, [riskCatalogs]);

  const getRiskDefaults = useCallback(
    (risk: GheRisk): Partial<GheRisk> => {
      const agentId = riskAgentIdByName.get(risk.tipoAgente);
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
        probabilidade: "Média",
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
      riskAgentIdByName,
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
      const agentId = riskAgentIdByName.get(tipoAgente);
      let options = agentId
        ? riskDescriptionsByAgent.get(agentId) || []
        : DEFAULT_DESCRICAO_AGENTE_OPTIONS;
      if (!options.length) options = DEFAULT_DESCRICAO_AGENTE_OPTIONS;
      if (currentValue && !options.includes(currentValue)) {
        return [currentValue, ...options];
      }
      return options;
    },
    [riskAgentIdByName, riskDescriptionsByAgent]
  );

  return {
    tipoAgenteOptions,
    applyMissingRiskDefaults,
    getDescricaoAgenteOptions,
  };
}
