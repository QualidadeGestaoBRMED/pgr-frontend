import { useCallback, useMemo } from "react";
import type { GheRisk, RiskCatalogPayload } from "../types";

type RiskClassificationResult = {
  classification: string;
  classificationId?: number;
  qualitativeId?: number;
  levelId?: number;
  quantitativeLevel?: number;
};

type ActionPlanClassificationResult = {
  classification: string;
  classificationId?: number;
  exposureValue?: number;
  exposureId?: number;
};

type ExposureLevelInput = {
  valorMedido?: string;
  intensidade?: string;
  nivelAcao?: string;
};

type ExposureByWorkforceResult = {
  exposureId: number;
  exposureValue: number;
};

const normalizeToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isQuantitativeEvaluation = (value: string) => {
  const token = normalizeToken(String(value || ""));
  return token.includes("quantit");
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, "").replace(/,/g, ".");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseInteger = (value: unknown): number | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  const rounded = Math.trunc(parsed);
  return Number.isFinite(rounded) ? rounded : null;
};

const calculateQuantitativeLevel = (
  measuredValue: number,
  toleranceLimit: number,
  actionLevel: number
): number => {
  if (measuredValue > toleranceLimit) return 5;
  if (measuredValue === toleranceLimit) return 4;
  if (measuredValue >= actionLevel) return 3;
  if (measuredValue < actionLevel) return 2;
  return 1;
};

const resolveQuantitativeLevelInputs = (risk: {
  valorMedido?: string;
  intensidade?: string;
  nivelAcao?: string;
}) => {
  const measuredValue = parseNumber(risk.valorMedido);
  const toleranceLimit = parseNumber(risk.intensidade);
  const parsedActionLevel = parseNumber(risk.nivelAcao);

  if (measuredValue === null || toleranceLimit === null) return null;

  // Mantém compatibilidade com regra de backend onde, em ausência de nível de ação,
  // usa o próprio limite de tolerância como referência.
  const actionLevel = parsedActionLevel ?? toleranceLimit;

  return {
    measuredValue,
    toleranceLimit,
    actionLevel,
  };
};

export function useRiskClassification(riskCatalogs: RiskCatalogPayload | null) {
  const riskMatrix = riskCatalogs?.riskMatrix;

  const activeTemplateId = useMemo(() => {
    const fromPayload = parseInteger(riskMatrix?.activeTemplateId);
    if (fromPayload && fromPayload > 0) return fromPayload;

    const activeTemplate = (riskMatrix?.templates || []).find((item) => item?.isActive);
    const activeId = parseInteger(activeTemplate?.id);
    if (activeId && activeId > 0) return activeId;

    const firstTemplateId = parseInteger((riskMatrix?.templates || [])[0]?.id);
    return firstTemplateId && firstTemplateId > 0 ? firstTemplateId : null;
  }, [riskMatrix]);

  const qualitativeByKey = useMemo(() => {
    const map = new Map<
      string,
      { qualitativeId: number; classificationId: number; classificationName: string }
    >();

    (riskMatrix?.qualitative || []).forEach((item) => {
      const templateId = parseInteger(item.templateId);
      const severityValue = parseInteger(item.severityValue);
      const probabilityValue = parseInteger(item.probabilityValue);
      const qualitativeId = parseInteger(item.id);
      const classificationId = parseInteger(item.classificationId);
      const classificationName = String(item.classificationName || "").trim();

      if (
        !templateId ||
        !severityValue ||
        !probabilityValue ||
        !qualitativeId ||
        !classificationId ||
        !classificationName
      ) {
        return;
      }

      const key = `${templateId}|${severityValue}|${probabilityValue}`;
      map.set(key, {
        qualitativeId,
        classificationId,
        classificationName,
      });
    });

    return map;
  }, [riskMatrix]);

  const exposureRangesByTemplate = useMemo(() => {
    const map = new Map<
      number,
      Array<{ id: number; value: number; minLimit: number; maxLimit: number }>
    >();

    (riskMatrix?.exposure || []).forEach((item) => {
      const templateId = parseInteger(item.templateId);
      const id = parseInteger(item.id);
      const value = parseInteger(item.value);
      const minLimit = parseNumber(item.minLimit);
      const maxLimit = parseNumber(item.maxLimit);

      if (
        !templateId ||
        !id ||
        !value ||
        minLimit === null ||
        maxLimit === null
      ) {
        return;
      }

      const current = map.get(templateId) || [];
      current.push({ id, value, minLimit, maxLimit });
      map.set(templateId, current);
    });

    map.forEach((ranges, templateId) => {
      map.set(
        templateId,
        ranges.sort((a, b) => {
          if (a.minLimit === b.minLimit) return a.maxLimit - b.maxLimit;
          return a.minLimit - b.minLimit;
        })
      );
    });

    return map;
  }, [riskMatrix]);

  const qualitativeSeverityByQualitativeRowId = useMemo(() => {
    const map = new Map<number, number>();
    (riskMatrix?.qualitative || []).forEach((item) => {
      const qualitativeRowId = parseInteger(item.id);
      const severityValue = parseInteger(item.severityValue);
      if (!qualitativeRowId || !severityValue) return;
      map.set(qualitativeRowId, severityValue);
    });
    return map;
  }, [riskMatrix]);

  const quantitativeByKey = useMemo(() => {
    const map = new Map<
      string,
      {
        classificationId: number;
        classificationName: string;
        levelId: number;
        levelValue: number;
      }
    >();

    (riskMatrix?.quantitative || []).forEach((item) => {
      const templateId = parseInteger(item.templateId);
      const severityValue = parseInteger(item.severityValue);
      const qualitativeId = parseInteger(item.qualitativeId);
      const resolvedSeverityFromQualitativeRow = qualitativeId
        ? qualitativeSeverityByQualitativeRowId.get(qualitativeId) || null
        : null;
      const levelValue = parseInteger(item.levelValue ?? item.levelId);
      const levelId = parseInteger(item.levelId ?? item.levelValue);
      const classificationId = parseInteger(item.classificationId);
      const classificationName = String(item.classificationName || "").trim();

      if (
        !templateId ||
        !classificationId ||
        !classificationName ||
        !levelValue
      ) {
        return;
      }

      const severityCandidates = [
        severityValue,
        resolvedSeverityFromQualitativeRow,
        qualitativeId,
      ].filter((value): value is number => Boolean(value));

      if (!severityCandidates.length) {
        return;
      }

      severityCandidates.forEach((severityCandidate) => {
        // Eixo X esperado: nível calculado (1..5) => levelValue.
        const keyByLevelValue = `${templateId}|${severityCandidate}|${levelValue}`;
        map.set(keyByLevelValue, {
          classificationId,
          classificationName,
          levelId: levelId || levelValue,
          levelValue,
        });

        // Compatibilidade com payloads legados que possam cruzar por levelId.
        if (levelId) {
          const keyByLevelId = `${templateId}|${severityCandidate}|${levelId}`;
          map.set(keyByLevelId, {
            classificationId,
            classificationName,
            levelId,
            levelValue,
          });
        }
      });
    });

    return map;
  }, [qualitativeSeverityByQualitativeRowId, riskMatrix]);

  const actionPlanByKey = useMemo(() => {
    const map = new Map<
      string,
      {
        classificationId: number;
        classificationName: string;
        exposureId: number;
        exposureValue: number;
      }
    >();

    (riskMatrix?.actionPlan || []).forEach((item) => {
      const templateId = parseInteger(item.templateId);
      const riskEvaluationClassificationId = parseInteger(
        item.riskEvaluationClassificationId
      );
      const exposureValue = parseInteger(item.exposureValue);
      const exposureId = parseInteger(item.exposureId);
      const classificationId = parseInteger(item.classificationId);
      const classificationName = String(item.classificationName || "").trim();

      if (
        !templateId ||
        !riskEvaluationClassificationId ||
        !exposureValue ||
        !classificationId ||
        !classificationName
      ) {
        return;
      }

      const key = `${templateId}|${riskEvaluationClassificationId}|${exposureValue}`;
      map.set(key, {
        classificationId,
        classificationName,
        exposureId: exposureId || exposureValue,
        exposureValue,
      });
    });

    return map;
  }, [riskMatrix]);

  const calculateRiskClassification = useCallback(
    (risk: Pick<GheRisk, "severidade" | "probabilidade" | "tipoAvaliacao" | "valorMedido" | "intensidade" | "nivelAcao">): RiskClassificationResult | null => {
      if (!activeTemplateId) return null;

      const severityValue = parseInteger(risk.severidade);
      if (!severityValue) return null;

      if (!isQuantitativeEvaluation(risk.tipoAvaliacao)) {
        const probabilityValue = parseInteger(risk.probabilidade);
        if (!probabilityValue) return null;

        const qualitativeKey = `${activeTemplateId}|${severityValue}|${probabilityValue}`;
        const qualitative = qualitativeByKey.get(qualitativeKey);
        if (!qualitative) return null;

        const finalResult: RiskClassificationResult = {
          classification: qualitative.classificationName,
          classificationId: qualitative.classificationId,
          qualitativeId: qualitative.qualitativeId,
        };
        return finalResult;
      }

      const quantitativeInputs = resolveQuantitativeLevelInputs({
        valorMedido: risk.valorMedido,
        intensidade: risk.intensidade,
        nivelAcao: risk.nivelAcao,
      });

      if (!quantitativeInputs) {
        // No tipo quantitativo, o nível depende desses 3 campos.
        return null;
      }

      const quantLevel = calculateQuantitativeLevel(
        quantitativeInputs.measuredValue,
        quantitativeInputs.toleranceLimit,
        quantitativeInputs.actionLevel
      );
      // Nova regra: quantitativo cruza severidade x nível.
      const quantitativeKey = `${activeTemplateId}|${severityValue}|${quantLevel}`;
      const quantitative = quantitativeByKey.get(quantitativeKey);

      if (!quantitative) {
        return null;
      }

      const finalResult: RiskClassificationResult = {
        classification: quantitative.classificationName,
        classificationId: quantitative.classificationId,
        levelId: quantitative.levelId,
        quantitativeLevel: quantLevel,
      };

      return finalResult;
    },
    [activeTemplateId, qualitativeByKey, quantitativeByKey]
  );

  const calculateExposureLevel = useCallback(
    (input: ExposureLevelInput): number | null => {
      const quantitativeInputs = resolveQuantitativeLevelInputs(input);
      if (!quantitativeInputs) return null;
      return calculateQuantitativeLevel(
        quantitativeInputs.measuredValue,
        quantitativeInputs.toleranceLimit,
        quantitativeInputs.actionLevel
      );
    },
    []
  );

  const calculateExposureFromWorkforceRatio = useCallback(
    (ratio: number | null | undefined): ExposureByWorkforceResult | null => {
      if (!activeTemplateId) return null;
      if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return null;

      const ranges = exposureRangesByTemplate.get(activeTemplateId) || [];
      if (!ranges.length) return null;

      const normalizedRatio = Math.max(0, Math.min(1, ratio));
      const directMatch = ranges.find(
        (range) =>
          normalizedRatio >= range.minLimit && normalizedRatio <= range.maxLimit
      );
      if (directMatch) {
        return { exposureId: directMatch.id, exposureValue: directMatch.value };
      }

      if (normalizedRatio < ranges[0].minLimit) {
        return { exposureId: ranges[0].id, exposureValue: ranges[0].value };
      }

      const last = ranges[ranges.length - 1];
      return { exposureId: last.id, exposureValue: last.value };
    },
    [activeTemplateId, exposureRangesByTemplate]
  );

  const calculateActionPlanClassification = useCallback(
    (params: {
      riskEvaluationClassificationId?: number | string;
      exposure?: number | string;
    }): ActionPlanClassificationResult | null => {
      if (!activeTemplateId) return null;

      const riskEvaluationClassificationId = parseInteger(
        params.riskEvaluationClassificationId
      );
      const exposureValue = parseInteger(params.exposure);

      if (!riskEvaluationClassificationId || !exposureValue) return null;

      const key = `${activeTemplateId}|${riskEvaluationClassificationId}|${exposureValue}`;
      const result = actionPlanByKey.get(key);
      if (!result) return null;

      return {
        classification: result.classificationName,
        classificationId: result.classificationId,
        exposureValue: result.exposureValue,
        exposureId: result.exposureId,
      };
    },
    [actionPlanByKey, activeTemplateId]
  );

  return {
    calculateRiskClassification,
    calculateExposureLevel,
    calculateExposureFromWorkforceRatio,
    calculateActionPlanClassification,
    activeTemplateId,
  };
}
