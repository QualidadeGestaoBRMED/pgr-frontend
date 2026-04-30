import { useCallback, useMemo } from "react";
import type { GheRisk, RiskCatalogPayload } from "../types";

type RiskClassificationResult = {
  classification: string;
  classificationId?: number;
  qualitativeId?: number;
  levelId?: number;
  quantitativeLevel?: number;
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

  const quantitativeByKey = useMemo(() => {
    const map = new Map<
      string,
      {
        classificationId: number;
        classificationName: string;
        levelId: number;
      }
    >();

    (riskMatrix?.quantitative || []).forEach((item) => {
      const templateId = parseInteger(item.templateId);
      const qualitativeId = parseInteger(item.qualitativeId);
      const levelId = parseInteger(item.levelId);
      const classificationId = parseInteger(item.classificationId);
      const classificationName = String(item.classificationName || "").trim();

      if (
        !templateId ||
        !qualitativeId ||
        !levelId ||
        !classificationId ||
        !classificationName
      ) {
        return;
      }

      // Mirrors backend implementation: get_quantitative(... qualitative_id=<id returned by qualitative step>, level_id=<quant level>)
      const key = `${templateId}|${qualitativeId}|${levelId}`;
      map.set(key, {
        classificationId,
        classificationName,
        levelId,
      });
    });

    return map;
  }, [riskMatrix]);

  const calculateRiskClassification = useCallback(
    (risk: Pick<GheRisk, "severidade" | "probabilidade" | "tipoAvaliacao" | "valorMedido" | "intensidade" | "nivelAcao">): RiskClassificationResult | null => {
      if (!activeTemplateId) return null;

      const severityValue = parseInteger(risk.severidade);
      const probabilityValue = parseInteger(risk.probabilidade);
      if (!severityValue || !probabilityValue) return null;

      const qualitativeKey = `${activeTemplateId}|${severityValue}|${probabilityValue}`;
      const qualitative = qualitativeByKey.get(qualitativeKey);
      if (!qualitative) return null;

      let finalResult: RiskClassificationResult = {
        classification: qualitative.classificationName,
        classificationId: qualitative.classificationId,
        qualitativeId: qualitative.qualitativeId,
      };

      if (!isQuantitativeEvaluation(risk.tipoAvaliacao)) {
        return finalResult;
      }

      const measuredValue = parseNumber(risk.valorMedido);
      const toleranceLimit = parseNumber(risk.intensidade);
      const actionLevel = parseNumber(risk.nivelAcao);

      if (measuredValue === null || toleranceLimit === null || actionLevel === null) {
        return finalResult;
      }

      const quantLevel = calculateQuantitativeLevel(measuredValue, toleranceLimit, actionLevel);
      // Mirrors backend behavior: qualitative step returns classification id,
      // then this value is used as quantitative qualitative_id parameter.
      const quantitativeKey = `${activeTemplateId}|${qualitative.classificationId}|${quantLevel}`;
      const quantitative = quantitativeByKey.get(quantitativeKey);

      if (!quantitative) {
        return {
          ...finalResult,
          quantitativeLevel: quantLevel,
        };
      }

      finalResult = {
        classification: quantitative.classificationName,
        classificationId: quantitative.classificationId,
        qualitativeId: qualitative.qualitativeId,
        levelId: quantitative.levelId,
        quantitativeLevel: quantLevel,
      };

      return finalResult;
    },
    [activeTemplateId, qualitativeByKey, quantitativeByKey]
  );

  return {
    calculateRiskClassification,
    activeTemplateId,
  };
}
