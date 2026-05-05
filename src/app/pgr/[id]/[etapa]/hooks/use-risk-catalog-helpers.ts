import { useCallback, useMemo } from "react";
import type {
  GheRisk,
  RiskCatalogPayload,
  TechnicalCriteriaCatalogItem,
} from "../types";
import { useRiskClassification } from "./use-risk-classification";

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

const toSafeCatalogText = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
};

const toValuesFromUnknown = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toValuesFromUnknown(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [
      toSafeCatalogText(record.name),
      toSafeCatalogText(record.value),
      toSafeCatalogText(record.source),
      toSafeCatalogText(record.propagationPath ?? record.propagation_path),
      toSafeCatalogText(record.unit),
      toSafeCatalogText(record.source__name),
      toSafeCatalogText(record.propagation_path__name),
      toSafeCatalogText(record.unit__name),
      ...toValuesFromUnknown(record.source_children),
      ...toValuesFromUnknown(record.propagation_path_children),
      ...toValuesFromUnknown(record.unit_children),
      ...toValuesFromUnknown(record.sourceChildren),
      ...toValuesFromUnknown(record.propagationPathChildren),
      ...toValuesFromUnknown(record.unitChildren),
    ].filter(Boolean);
  }
  const safe = toSafeCatalogText(value);
  return safe ? [safe] : [];
};

const uniqueValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const resolveSourceValues = (item: TechnicalCriteriaCatalogItem) =>
  uniqueValues([
    ...toValuesFromUnknown(item.source),
    ...toValuesFromUnknown(item.sourceChildren),
    ...toValuesFromUnknown(item.source_children),
  ]);

const resolvePropagationPathValues = (item: TechnicalCriteriaCatalogItem) =>
  uniqueValues(
    [
      ...toValuesFromUnknown(item.propagationPath ?? item.propagation_path),
      ...toValuesFromUnknown(item.propagationPathChildren),
      ...toValuesFromUnknown(item.propagation_path_children),
    ].filter((value) => !isGenericPropagationValue(value))
  );

const resolveUnitValues = (item: TechnicalCriteriaCatalogItem) =>
  uniqueValues([
    ...toValuesFromUnknown(item.unit),
    ...toValuesFromUnknown(item.unitChildren),
    ...toValuesFromUnknown(item.unit_children),
  ]);

const resolveControlMeasureValues = (item: TechnicalCriteriaCatalogItem) =>
  uniqueValues([
    ...toValuesFromUnknown(item.controlMeasureDescriptionChildren),
    ...toValuesFromUnknown(item.control_measure_description_children),
  ]);

const resolveActionDescriptionValues = (item: TechnicalCriteriaCatalogItem) =>
  uniqueValues([
    ...toValuesFromUnknown(item.actionDescriptionChildren),
    ...toValuesFromUnknown(item.action_description_children),
  ]);

const resolvePpeValues = (item: TechnicalCriteriaCatalogItem) =>
  uniqueValues([
    ...toValuesFromUnknown(item.ppeChildren),
    ...toValuesFromUnknown(item.ppe_children),
  ]);

const resolveCpeValues = (item: TechnicalCriteriaCatalogItem) =>
  uniqueValues([
    ...toValuesFromUnknown(item.cpeChildren),
    ...toValuesFromUnknown(item.cpe_children),
  ]);

const resolveEvaluationType = (item: TechnicalCriteriaCatalogItem) => {
  const rawType = toSafeCatalogText(
    item.evaluationType ?? item.evaluation_type
  ).toLowerCase();
  if (rawType.startsWith("quant")) return "Quantitativa";
  if (rawType.startsWith("qual")) return "Qualitativa";

  const toleranceLimit = item.toleranceLimit ?? item.tolerance_limit ?? item.limit;
  const actionLevel = item.actionLevel ?? item.action_level;
  const hasToleranceLimit =
    toleranceLimit !== undefined &&
    toleranceLimit !== null &&
    toSafeCatalogText(toleranceLimit) !== "";
  const hasActionLevel =
    actionLevel !== undefined &&
    actionLevel !== null &&
    toSafeCatalogText(actionLevel) !== "";

  return hasToleranceLimit || hasActionLevel ? "Quantitativa" : "Qualitativa";
};

const resolveHasQuantitative = (item: TechnicalCriteriaCatalogItem) => {
  const rawValue: unknown = item.hasQuantitative ?? item.has_quantitative;
  if (typeof rawValue === "boolean") return rawValue;
  if (typeof rawValue === "number") return rawValue !== 0;
  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().toLowerCase();
    return ["1", "true", "t", "yes", "y", "sim", "s"].includes(normalized);
  }

  const rawType = toSafeCatalogText(
    item.evaluationType ?? item.evaluation_type
  ).toLowerCase();
  if (rawType.startsWith("quant")) return true;
  if (rawType.startsWith("qual")) return false;

  const toleranceLimit = item.toleranceLimit ?? item.tolerance_limit ?? item.limit;
  const actionLevel = item.actionLevel ?? item.action_level;
  const hasToleranceLimit =
    toleranceLimit !== undefined &&
    toleranceLimit !== null &&
    toSafeCatalogText(toleranceLimit) !== "";
  const hasActionLevel =
    actionLevel !== undefined &&
    actionLevel !== null &&
    toSafeCatalogText(actionLevel) !== "";
  return hasToleranceLimit || hasActionLevel;
};

const resolveIntensity = (item: TechnicalCriteriaCatalogItem) => {
  const toleranceLimit = item.toleranceLimit ?? item.tolerance_limit ?? item.limit;
  const limitText = toSafeCatalogText(toleranceLimit);
  const unitText = resolveUnitValues(item)[0] || "";
  if (!limitText) return "N/A";
  return `${limitText}${unitText ? ` ${unitText}` : ""}`;
};

const resolveActionLevel = (item: TechnicalCriteriaCatalogItem) => {
  const rawActionLevel = item.actionLevel ?? item.action_level;
  const actionLevelText = toSafeCatalogText(rawActionLevel);
  const unitText = resolveUnitValues(item)[0] || "";
  if (!actionLevelText) return "Calculado";
  return `${actionLevelText}${unitText ? ` ${unitText}` : ""}`;
};

const resolveIsCalculated = (item: TechnicalCriteriaCatalogItem) => {
  const rawValue: unknown = item.isCalculated ?? item.is_calculated;
  if (typeof rawValue === "boolean") return rawValue;
  if (typeof rawValue === "number") return rawValue !== 0;
  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().toLowerCase();
    return ["1", "true", "t", "yes", "y", "sim", "s"].includes(normalized);
  }
  return false;
};

const resolveSeverity = (value: TechnicalCriteriaCatalogItem["severity"]) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const maybeName = toSafeCatalogText(value.name);
    if (maybeName) return maybeName;
    return toSafeCatalogText(value.value);
  }
  return "";
};

const uniqueNonEmptyValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const withCurrentValue = (options: string[], currentValue: string) => {
  const safeCurrentValue = String(currentValue || "").trim();
  if (!safeCurrentValue) return options;
  if (options.includes(safeCurrentValue)) return options;
  return [...options, safeCurrentValue];
};

const buildCatalogValuesByAgent = (
  items: Array<{ name: string; agent: number } | { name: string; agent: string }>
) => {
  const grouped = new Map<number, string[]>();
  items.forEach((item) => {
    const safeAgentId = toCatalogAgentId((item as { agent?: unknown }).agent);
    if (!safeAgentId) return;
    const safeName = toSafeCatalogText(item.name);
    if (!safeName) return;
    const current = grouped.get(safeAgentId) || [];
    if (!current.includes(safeName)) current.push(safeName);
    grouped.set(safeAgentId, current);
  });
  return grouped;
};

type TechnicalCriteriaResolved = {
  description: string;
  descriptionToken: string;
  source: string;
  sourceValues: string[];
  propagationPath: string;
  propagationPathValues: string[];
  unit: string;
  unitValues: string[];
  evaluationType: string;
  intensity: string;
  actionLevel: string;
  isCalculated: boolean;
  hasQuantitative: boolean;
  severity: string;
  controlMeasureValues: string[];
  actionDescriptionValues: string[];
  ppeValues: string[];
  cpeValues: string[];
};

export const hasMeaningfulSelections = (values: string[] | undefined) =>
  Array.isArray(values) && values.some((item) => item.trim().length > 0);

export const areStringArraysEqual = (a: string[] | undefined, b: string[] | undefined) => {
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

export function useRiskCatalogHelpers(riskCatalogs: RiskCatalogPayload | null) {
  const {
    calculateRiskClassification,
    calculateActionPlanClassification,
    calculateExposureLevel,
    calculateExposureFromWorkforceRatio,
  } = useRiskClassification(riskCatalogs);
  const normalizeAgentName = useCallback(
    (value: string) => normalizeCatalogToken((value || "").trim()),
    []
  );

  const riskAgentNameById = useMemo(() => {
    const map = new Map<number, string>();
    (riskCatalogs?.riskAgents || []).forEach((item) => {
      const safeId = toCatalogAgentId((item as { id?: unknown }).id);
      const safeName = String(item.name || "").trim();
      if (!safeId || !safeName) return;
      map.set(safeId, safeName);
    });
    return map;
  }, [riskCatalogs]);

  const riskDescriptionsByAgent = useMemo(
    () => buildCatalogValuesByAgent(riskCatalogs?.riskDescriptions || []),
    [riskCatalogs]
  );

  const riskSourcesByAgent = useMemo(
    () => buildCatalogValuesByAgent(riskCatalogs?.riskSources || []),
    [riskCatalogs]
  );

  const propagationPathsByAgent = useMemo(
    () => buildCatalogValuesByAgent(riskCatalogs?.propagationPaths || []),
    [riskCatalogs]
  );

  const technicalCriteriaByAgent = useMemo(() => {
    const grouped = new Map<number, TechnicalCriteriaResolved[]>();
    (riskCatalogs?.technicalCriteria || []).forEach((item: TechnicalCriteriaCatalogItem) => {
      const safeAgentId = toCatalogAgentId((item as { agent?: unknown }).agent);
      if (!safeAgentId) return;

      const description = toSafeCatalogText(item.description);
      const descriptionToken = normalizeCatalogToken(description);
      if (!descriptionToken) return;

      const sourceValues = resolveSourceValues(item);
      const propagationPathValues = resolvePropagationPathValues(item);
      const unitValues = resolveUnitValues(item);
      const controlMeasureValues = resolveControlMeasureValues(item);
      const actionDescriptionValues = resolveActionDescriptionValues(item);
      const ppeValues = resolvePpeValues(item);
      const cpeValues = resolveCpeValues(item);
      const source = sourceValues[0] || "";
      const propagationPath = propagationPathValues[0] || "";
      const unit = unitValues[0] || "";
      const evaluationType = resolveEvaluationType(item);
      const hasQuantitative = resolveHasQuantitative(item);
      const intensity = resolveIntensity(item);
      const actionLevel = resolveActionLevel(item);
      const isCalculated = resolveIsCalculated(item);
      const severity = resolveSeverity(item.severity);

      const current = grouped.get(safeAgentId) || [];
      const dedupeKey = [
        descriptionToken,
        source,
        sourceValues.join("|"),
        propagationPath,
        propagationPathValues.join("|"),
        unit,
        unitValues.join("|"),
        hasQuantitative ? "1" : "0",
        controlMeasureValues.join("|"),
        actionDescriptionValues.join("|"),
        ppeValues.join("|"),
        cpeValues.join("|"),
        evaluationType,
        intensity,
        actionLevel,
        isCalculated ? "1" : "0",
        severity,
      ].join("||");

      if (
        !current.some(
          (entry) =>
            [
              entry.descriptionToken,
              entry.source,
              entry.sourceValues.join("|"),
              entry.propagationPath,
              entry.propagationPathValues.join("|"),
              entry.unit,
              entry.unitValues.join("|"),
              entry.hasQuantitative ? "1" : "0",
              entry.controlMeasureValues.join("|"),
              entry.actionDescriptionValues.join("|"),
              entry.ppeValues.join("|"),
              entry.cpeValues.join("|"),
              entry.evaluationType,
              entry.intensity,
              entry.actionLevel,
              entry.isCalculated ? "1" : "0",
              entry.severity,
            ].join("||") === dedupeKey
        )
      ) {
        current.push({
          description,
          descriptionToken,
          source,
          sourceValues,
          propagationPath,
          propagationPathValues,
          unit,
          unitValues,
          evaluationType,
          hasQuantitative,
          intensity,
          actionLevel,
          isCalculated,
          severity,
          controlMeasureValues,
          actionDescriptionValues,
          ppeValues,
          cpeValues,
        });
      }
      grouped.set(safeAgentId, current);
    });
    return grouped;
  }, [riskCatalogs]);

  const tipoAgenteOptions = useMemo(() => {
    const ids = Array.from(technicalCriteriaByAgent.keys()).sort((a, b) => a - b);
    const fromTechnicalCriteria = ids
      .map((id) => riskAgentNameById.get(id) || "")
      .filter((name) => name.length > 0);
    if (fromTechnicalCriteria.length) return fromTechnicalCriteria;
    return Array.from(riskAgentNameById.values());
  }, [riskAgentNameById, technicalCriteriaByAgent]);

  const riskAgentIdByNameExact = useMemo(() => {
    const map = new Map<string, number>();
    riskAgentNameById.forEach((name, id) => {
      map.set(name, id);
    });
    return map;
  }, [riskAgentNameById]);

  const riskAgentIdByNameNormalized = useMemo(() => {
    const map = new Map<string, number>();
    riskAgentIdByNameExact.forEach((id, name) => {
      map.set(normalizeAgentName(name), id);
    });
    return map;
  }, [normalizeAgentName, riskAgentIdByNameExact]);

  const resolveRiskAgentId = useCallback(
    (agentName: string): number | undefined => {
      const safeName = String(agentName || "").trim();
      if (!safeName) return undefined;
      const exact = riskAgentIdByNameExact.get(safeName);
      if (typeof exact === "number") return exact;
      const normalized = normalizeAgentName(safeName);
      const normalizedMatch = riskAgentIdByNameNormalized.get(normalized);
      if (typeof normalizedMatch === "number") return normalizedMatch;

      for (const [token, id] of riskAgentIdByNameNormalized.entries()) {
        if (token.includes(normalized) || normalized.includes(token)) {
          return id;
        }
      }
      return undefined;
    },
    [normalizeAgentName, riskAgentIdByNameExact, riskAgentIdByNameNormalized]
  );

  const resolveTechnicalCriteriaOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string) => {
      const agentId = resolveRiskAgentId(tipoAgente);
      if (!agentId) return [];
      const options = technicalCriteriaByAgent.get(agentId) || [];
      const safeDescriptionToken = normalizeCatalogToken(String(descricaoAgente || "").trim());
      if (!safeDescriptionToken) return options;
      const filtered = options.filter((item) => item.descriptionToken === safeDescriptionToken);
      return filtered.length ? filtered : options;
    },
    [resolveRiskAgentId, technicalCriteriaByAgent]
  );

  const getRiskDefaults = useCallback(
    (risk: GheRisk): Partial<GheRisk> => {
      const agentId = resolveRiskAgentId(risk.tipoAgente);
      const technicalCriteriaDefaults = resolveTechnicalCriteriaOptions(
        risk.tipoAgente,
        risk.descricaoAgente
      );
      const firstTechnicalCriteria = technicalCriteriaDefaults[0];
      const calculatedDefaultValue =
        firstTechnicalCriteria?.isCalculated &&
        (!firstTechnicalCriteria?.intensity || isNaSelection(firstTechnicalCriteria.intensity))
          ? "Calculado"
          : "";
      const controlMeasureDefaults = uniqueNonEmptyValues(
        technicalCriteriaDefaults.map((item) => item.controlMeasureValues).flat()
      );
      const ppeDefaults = uniqueNonEmptyValues(
        technicalCriteriaDefaults.map((item) => item.ppeValues).flat()
      );
      const cpeDefaults = uniqueNonEmptyValues(
        technicalCriteriaDefaults.map((item) => item.cpeValues).flat()
      );
      return {
        meioPropagacao:
          firstTechnicalCriteria?.propagationPath ||
          getFirstCatalogValue(propagationPathsByAgent, agentId),
        fontes:
          firstTechnicalCriteria?.source ||
          getFirstCatalogValue(riskSourcesByAgent, agentId),
        unidadeMedida: firstTechnicalCriteria?.unit || "",
        tipoAvaliacao: firstTechnicalCriteria?.evaluationType || "",
        intensidade: calculatedDefaultValue || firstTechnicalCriteria?.intensity || "",
        nivelAcao: firstTechnicalCriteria?.actionLevel || "",
        severidade: firstTechnicalCriteria?.severity || "3",
        probabilidade:
          firstTechnicalCriteria?.hasQuantitative ||
          normalizeCatalogToken(firstTechnicalCriteria?.evaluationType || "").includes("quantit")
            ? ""
            : "3",
        classificacao: "",
        medidasControle: controlMeasureDefaults.join(", "),
        epc: cpeDefaults.join(", "),
        epi: ppeDefaults.join(", "),
      };
    },
    [propagationPathsByAgent, resolveRiskAgentId, resolveTechnicalCriteriaOptions, riskSourcesByAgent]
  );

  const applyMissingRiskDefaults = useCallback(
    (risk: GheRisk): GheRisk => {
      const normalizedRisk: GheRisk = {
        ...risk,
      };
      if (!normalizedRisk.tipoAgente || !normalizedRisk.descricaoAgente) {
        return normalizedRisk;
      }
      const defaults = getRiskDefaults(normalizedRisk);
      const shouldUseDefaultPropagation =
        !normalizedRisk.meioPropagacao ||
        isGenericPropagationValue(normalizedRisk.meioPropagacao);
      const classification = calculateRiskClassification({
        severidade: normalizedRisk.severidade || defaults.severidade || "",
        probabilidade: normalizedRisk.probabilidade || defaults.probabilidade || "",
        tipoAvaliacao: normalizedRisk.tipoAvaliacao || defaults.tipoAvaliacao || "",
        valorMedido: normalizedRisk.valorMedido || "",
        intensidade: normalizedRisk.intensidade || defaults.intensidade || "",
        nivelAcao: normalizedRisk.nivelAcao || defaults.nivelAcao || "",
      });
      return {
        ...normalizedRisk,
        meioPropagacao: shouldUseDefaultPropagation
          ? defaults.meioPropagacao || ""
          : normalizedRisk.meioPropagacao,
        fontes: normalizedRisk.fontes || defaults.fontes || "",
        unidadeMedida: normalizedRisk.unidadeMedida || defaults.unidadeMedida || "",
        tipoAvaliacao: normalizedRisk.tipoAvaliacao || defaults.tipoAvaliacao || "",
        intensidade: normalizedRisk.intensidade || defaults.intensidade || "",
        nivelAcao: normalizedRisk.nivelAcao || defaults.nivelAcao || "",
        severidade: normalizedRisk.severidade || defaults.severidade || "",
        probabilidade: normalizedRisk.probabilidade || defaults.probabilidade || "",
        classificacao:
          classification?.classification ||
          normalizedRisk.classificacao ||
          defaults.classificacao ||
          "",
        medidasControle: normalizedRisk.medidasControle || defaults.medidasControle || "",
        epc: normalizedRisk.epc || defaults.epc || "",
        epi: normalizedRisk.epi || defaults.epi || "",
      };
    },
    [calculateRiskClassification, getRiskDefaults]
  );

  const getDescricaoAgenteOptions = useCallback(
    (tipoAgente: string, currentValue: string) => {
      const agentId = resolveRiskAgentId(tipoAgente);
      const optionsFromCriteria = !agentId
        ? []
        : uniqueNonEmptyValues(
            (technicalCriteriaByAgent.get(agentId) || []).map((item) => item.description)
          );
      const optionsFromCatalog = !agentId ? [] : riskDescriptionsByAgent.get(agentId) || [];
      const options = optionsFromCriteria.length ? optionsFromCriteria : optionsFromCatalog;
      return withCurrentValue(options, currentValue);
    },
    [resolveRiskAgentId, riskDescriptionsByAgent, technicalCriteriaByAgent]
  );

  const getMeioPropagacaoOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.propagationPathValues
        )
        .flat()
      );
      const agentId = resolveRiskAgentId(tipoAgente);
      const optionsFromCatalog = !agentId ? [] : propagationPathsByAgent.get(agentId) || [];
      const options = optionsFromCriteria.length ? optionsFromCriteria : optionsFromCatalog;
      return withCurrentValue(options, currentValue);
    },
    [propagationPathsByAgent, resolveRiskAgentId, resolveTechnicalCriteriaOptions]
  );

  const getFontesOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.sourceValues
        )
        .flat()
      );
      const agentId = resolveRiskAgentId(tipoAgente);
      const optionsFromCatalog = !agentId ? [] : riskSourcesByAgent.get(agentId) || [];
      const options = optionsFromCriteria.length ? optionsFromCriteria : optionsFromCatalog;
      return withCurrentValue(options, currentValue);
    },
    [resolveRiskAgentId, resolveTechnicalCriteriaOptions, riskSourcesByAgent]
  );

  const getTipoAvaliacaoOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.evaluationType
        )
      );
      const options = optionsFromCriteria.length
        ? optionsFromCriteria
        : ["Qualitativa", "Quantitativa"];
      return withCurrentValue(options, currentValue);
    },
    [resolveTechnicalCriteriaOptions]
  );

  const getHasQuantitativeCriteria = useCallback(
    (tipoAgente: string, descricaoAgente: string) =>
      resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).some(
        (item) => item.hasQuantitative
      ),
    [resolveTechnicalCriteriaOptions]
  );

  const getUnidadeMedidaOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.unitValues
        )
        .flat()
      );
      const options = optionsFromCriteria.length ? optionsFromCriteria : ["N/A"];
      return withCurrentValue(options, currentValue);
    },
    [resolveTechnicalCriteriaOptions]
  );

  const getIntensidadeOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.intensity
        )
      );
      const options = optionsFromCriteria.length ? optionsFromCriteria : ["N/A"];
      return withCurrentValue(options, currentValue);
    },
    [resolveTechnicalCriteriaOptions]
  );

  const getIsCalculatedCriteria = useCallback(
    (tipoAgente: string, descricaoAgente: string) =>
      resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).some(
        (item) => item.isCalculated
      ),
    [resolveTechnicalCriteriaOptions]
  );

  const getNivelAcaoOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.actionLevel
        )
      );
      const options = optionsFromCriteria.length ? optionsFromCriteria : ["Calculado"];
      return withCurrentValue(options, currentValue);
    },
    [resolveTechnicalCriteriaOptions]
  );

  const getSeveridadeOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.severity
        )
      );
      const options = optionsFromCriteria.length ? optionsFromCriteria : ["3"];
      return withCurrentValue(options, currentValue);
    },
    [resolveTechnicalCriteriaOptions]
  );

  const getMedidasControleOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.controlMeasureValues
        )
        .flat()
      );
      return withCurrentValue(optionsFromCriteria, currentValue);
    },
    [resolveTechnicalCriteriaOptions]
  );

  const getActionDescriptionOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.actionDescriptionValues
        )
        .flat()
      );
      return optionsFromCriteria;
    },
    [resolveTechnicalCriteriaOptions]
  );

  const getEpiOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.ppeValues
        )
        .flat()
      );
      return withCurrentValue(optionsFromCriteria, currentValue);
    },
    [resolveTechnicalCriteriaOptions]
  );

  const getEpcOptions = useCallback(
    (tipoAgente: string, descricaoAgente: string, currentValue: string) => {
      const optionsFromCriteria = uniqueNonEmptyValues(
        resolveTechnicalCriteriaOptions(tipoAgente, descricaoAgente).map(
          (item) => item.cpeValues
        )
        .flat()
      );
      return withCurrentValue(optionsFromCriteria, currentValue);
    },
    [resolveTechnicalCriteriaOptions]
  );

  return {
    tipoAgenteOptions,
    applyMissingRiskDefaults,
    getDescricaoAgenteOptions,
    getMeioPropagacaoOptions,
    getFontesOptions,
    getTipoAvaliacaoOptions,
    getUnidadeMedidaOptions,
    getIntensidadeOptions,
    getIsCalculatedCriteria,
    getHasQuantitativeCriteria,
    getNivelAcaoOptions,
    getSeveridadeOptions,
    getMedidasControleOptions,
    getActionDescriptionOptions,
    getEpiOptions,
    getEpcOptions,
    calculateRiskClassification,
    calculateActionPlanClassification,
    calculateExposureLevel,
    calculateExposureFromWorkforceRatio,
  };
}
