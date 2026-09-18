import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  PlusCircle,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WheelEvent } from "react";
import { createPortal } from "react-dom";
import { SearchableSelect } from "./searchable-select";
import {
  CALCULATED_LIMIT_VALUE,
  isCalculatedLimitValue,
  isValidMeasuredValue,
  isValidQuantitativeMeasurementValue,
  normalizeMeasuredValue,
  normalizeQuantitativeMeasurementValue,
  sanitizeMeasuredValueInput,
  sanitizeQuantitativeMeasurementInput,
} from "../validation/br-field-utils";
import type { GheGroup, GheRisk, RiskGheGroup } from "../types";
import {
  buildGheFunctionSummary,
  type GheFunctionSummaryGroup,
} from "../utils/ghe-function-table";
import {
  MULTI_VALUE_SEPARATOR,
  normalizeText,
  parseMultiTextValues as parseCommaSeparatedValues,
} from "../utils/multi-text-values";
import type { CaracterizacaoStepCtx } from "./renderers/caracterizacao-renderer";

type CaracterizacaoStepProps = {
  ctx: CaracterizacaoStepCtx;
};

type RiskOverviewRow = {
  gheId: string;
  gheName: string;
  risk: GheRisk;
};

type BatchRiskGroup = {
  key: string;
  risk: GheRisk;
  sourceGheIds: string[];
  sourceGheNames: string[];
};

type DuplicateRiskStructureGroup = {
  structureKey: string;
  gheIds: string[];
  gheNames: string[];
};

const PROBABILIDADE_OPTIONS = ["1", "2", "3", "4", "5"];
const MEASURED_VALUE_OPTIONS = ["N/D", "<LQ"];
const isNaValue = (value: string) => value.trim().toUpperCase() === "N/A";
const supportsMeasuredValueShortcut = (tipoAgente: string, descricaoAgente?: string) => {
  const normalizedTipoAgente = normalizeText(String(tipoAgente || ""));
  const normalizedDescricaoAgente = normalizeText(String(descricaoAgente || ""));
  return (
    normalizedTipoAgente.includes("quim") ||
    (normalizedTipoAgente.includes("fisic") && normalizedDescricaoAgente === "calor")
  );
};
type RequiredRiskField =
  | "tipoAgente"
  | "descricaoAgente"
  | "meioPropagacao"
  | "fontes"
  | "unidadeMedida"
  | "valorMedido"
  | "tipoAvaliacao"
  | "intensidade"
  | "severidade"
  | "probabilidade"
  | "classificacao"
  | "medidasControle"
  | "epc"
  | "epi";

const normalizeMultiTextValue = (value: string | string[] | undefined | null) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item && !isNaValue(item))
      .join(", ");
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
};

const getRiskDescriptionKey = (tipoAgente: string, descricaoAgente: string) => {
  const normalizedTipoAgente = normalizeText(String(tipoAgente || "").trim());
  const normalizedDescricaoAgente = normalizeText(String(descricaoAgente || "").trim());
  if (!normalizedTipoAgente || !normalizedDescricaoAgente) return "";
  return `${normalizedTipoAgente}::${normalizedDescricaoAgente}`;
};

const hasOptionInsensitive = (options: string[], value: string) => {
  const normalizedValue = normalizeText(value.trim());
  if (!normalizedValue) return false;
  return options.some((option) => normalizeText(option) === normalizedValue);
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeNumericInput = (value: string) => {
  const filtered = String(value || "").replace(/[^\d.,]/g, "");
  const separatorIndex = filtered.search(/[.,]/);
  if (separatorIndex === -1) return filtered;
  const separator = filtered[separatorIndex];
  const integerPart = filtered.slice(0, separatorIndex).replace(/[.,]/g, "");
  const decimalPart = filtered.slice(separatorIndex + 1).replace(/[.,]/g, "");
  return `${integerPart}${separator}${decimalPart}`;
};
const normalizeNumericInput = (value: string) =>
  sanitizeNumericInput(value).replace(/[.,]$/, "");

const stripTrailingMeasuredUnit = (value: string, measuredUnit: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!measuredUnit || isNaValue(measuredUnit)) return trimmed;
  return trimmed
    .replace(new RegExp(`\\s*${escapeRegExp(measuredUnit)}\\s*$`, "i"), "")
    .trim();
};
const stripTrailingMeasuredUnits = (value: string, measuredUnits: string[]) =>
  measuredUnits.reduce(
    (acc, measuredUnit) => stripTrailingMeasuredUnit(acc, measuredUnit),
    value
  );
const AWAITING_QUANTITATIVE_EVALUATION_VALUE = "Aguardando Avaliação Quantitativa";
const NOT_APPLICABLE_VALUE = "N/A";

const getQualitativeMeasuredValueFallback = (hasQualitativeAndQuantitativeOptions: boolean) =>
  hasQualitativeAndQuantitativeOptions
    ? AWAITING_QUANTITATIVE_EVALUATION_VALUE
    : NOT_APPLICABLE_VALUE;

const sanitizeRiskMeasurementFields = (
  risk: GheRisk,
  measuredUnits: string[],
  hasQualitativeAndQuantitativeOptions = false
) => {
  const sanitizedValorMedido = stripTrailingMeasuredUnits(
    String(risk.valorMedido || ""),
    measuredUnits
  );
  const isQualitativeEvaluation = normalizeText(String(risk.tipoAvaliacao || "")).includes(
    "qualit"
  );
  const isQuantitativeEvaluation = normalizeText(String(risk.tipoAvaliacao || "")).includes(
    "quantit"
  );
  const intensityValue = stripTrailingMeasuredUnits(String(risk.intensidade || ""), measuredUnits);
  return {
    ...risk,
    valorMedido: isQualitativeEvaluation
      ? getQualitativeMeasuredValueFallback(hasQualitativeAndQuantitativeOptions)
      : isQuantitativeEvaluation
        ? isNaValue(sanitizedValorMedido)
          ? ""
          : sanitizeMeasuredValueInput(sanitizedValorMedido)
        : sanitizeNumericInput(sanitizedValorMedido),
    intensidade: isQuantitativeEvaluation
      ? isNaValue(intensityValue)
        ? ""
        : sanitizeQuantitativeMeasurementInput(intensityValue)
      : intensityValue,
    nivelAcao: isQuantitativeEvaluation
      ? isNaValue(stripTrailingMeasuredUnits(String(risk.nivelAcao || ""), measuredUnits))
        ? ""
        : sanitizeQuantitativeMeasurementInput(
            stripTrailingMeasuredUnits(String(risk.nivelAcao || ""), measuredUnits)
          )
      : stripTrailingMeasuredUnits(String(risk.nivelAcao || ""), measuredUnits),
  };
};

const createRiskId = () =>
  `risk-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const isSameRiskContent = (a: GheRisk, b: GheRisk) =>
  a.tipoAgente === b.tipoAgente &&
  a.descricaoAgente === b.descricaoAgente &&
  (a.danosSaude || "") === (b.danosSaude || "") &&
  a.meioPropagacao === b.meioPropagacao &&
  a.fontes === b.fontes &&
  (a.unidadeMedida || "") === (b.unidadeMedida || "") &&
  (a.valorMedido || "") === (b.valorMedido || "") &&
  a.tipoAvaliacao === b.tipoAvaliacao &&
  a.intensidade === b.intensidade &&
  (a.nivelAcao || "") === (b.nivelAcao || "") &&
  a.severidade === b.severidade &&
  a.probabilidade === b.probabilidade &&
  a.classificacao === b.classificacao &&
  a.medidasControle === b.medidasControle &&
  (a.normas || "") === (b.normas || "") &&
  normalizeMultiTextValue(a.epc) === normalizeMultiTextValue(b.epc) &&
  normalizeMultiTextValue(a.epi) === normalizeMultiTextValue(b.epi);

const getRiskContentKey = (risk: GheRisk) =>
  [
    risk.tipoAgente,
    risk.descricaoAgente,
    risk.danosSaude || "",
    risk.meioPropagacao,
    risk.fontes,
    risk.unidadeMedida || "",
    risk.valorMedido || "",
    risk.tipoAvaliacao,
    risk.intensidade,
    risk.nivelAcao || "",
    risk.severidade,
    risk.probabilidade,
    risk.classificacao,
    risk.medidasControle,
    risk.normas || "",
    normalizeMultiTextValue(risk.epc),
    normalizeMultiTextValue(risk.epi),
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("||");

const PROGRESSIVE_THRESHOLD = 50;
const PROGRESSIVE_BATCH_SIZE = 50;

export function CaracterizacaoStep({ ctx }: CaracterizacaoStepProps) {
  const {
    handleResetCaracterizacaoData,
    riskGheGroups,
    gheGroups,
    functionMap,
    setGheGroups,
    setRiskGheGroups,
    persistedOptionsByRowId,
    setPersistedOptionsByRowId,
    currentRiskGheId,
    setCurrentRiskGheId,
    pendingReviewFocus,
    pushHistory,
    applyMissingRiskDefaults,
    tipoAgenteOptions,
    getDescricaoAgenteOptions,
    getMeioPropagacaoOptions,
    getFontesOptions,
    getDanosSaudeOptions,
    getTipoAvaliacaoOptions,
    getHasExactQuantitativeCriteria,
    getUnidadeMedidaOptions,
    getHasQuantitativeCriteria,
    getIsCalculatedCriteria,
    getMedidasControleOptions,
    getNormasOptions,
    getEpiOptions,
    getEpcOptions,
    calculateRiskClassification,
    inputBaseClass,
    inputInlineClass,
    textareaBaseClass,
    selectSmallClass,
  } = ctx;

  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [isRiskOverviewModalOpen, setIsRiskOverviewModalOpen] = useState(false);
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteSelectedRisksModalOpen, setIsDeleteSelectedRisksModalOpen] =
    useState(false);
  const [riskGheSearch, setRiskGheSearch] = useState("");
  const [riskOverviewSearch, setRiskOverviewSearch] = useState("");
  const [batchRiskSearch, setBatchRiskSearch] = useState("");
  const [batchGheSearch, setBatchGheSearch] = useState("");
  const [riskOverviewGheFilterId, setRiskOverviewGheFilterId] = useState<"all" | string>("all");
  const [selectedBatchRiskKeys, setSelectedBatchRiskKeys] = useState<string[]>([]);
  const [selectedBatchGheIds, setSelectedBatchGheIds] = useState<string[]>([]);
  const [batchAssignFeedback, setBatchAssignFeedback] = useState<string>("");
  const [gheFunctionPreview, setGheFunctionPreview] = useState<null | {
    gheId: string;
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  }>(null);
  const [openMultiSelect, setOpenMultiSelect] = useState<null | {
    riskId: string;
      field:
        | "epc"
        | "epi"
        | "danosSaude"
        | "fontes"
        | "meioPropagacao"
        | "unidadeMedida"
        | "medidasControle"
        | "normas"
        | "valorMedido";
  }>(null);
  const [multiSelectQuery, setMultiSelectQuery] = useState("");
  const [, setTouchedRiskFields] = useState<
    Record<string, Partial<Record<RequiredRiskField, boolean>>>
  >({});
  const [minimizedRiskIds, setMinimizedRiskIds] = useState<Record<string, boolean>>({});
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const copyMenuRef = useRef<HTMLDivElement | null>(null);
  const gheFunctionPreviewRef = useRef<HTMLDivElement | null>(null);
  const gheFunctionPreviewCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formGroupClass = "flex min-w-0 self-start flex-col gap-2";
  const stackedInputClass = inputBaseClass.replace("mt-2 ", "");
  const getPersistedFonteKey = (riskId: string) => `risk-fontes:${riskId}`;

  const gheFunctionSummaries = useMemo(() => {
    const summaries = new Map<string, GheFunctionSummaryGroup[]>();
    gheGroups.forEach((ghe: GheGroup) => {
      summaries.set(ghe.id, buildGheFunctionSummary(ghe.items, functionMap));
    });
    return summaries;
  }, [functionMap, gheGroups]);

  const showGheFunctionPreview = (gheId: string, element: HTMLElement) => {
    if (gheFunctionPreviewCloseTimerRef.current) {
      clearTimeout(gheFunctionPreviewCloseTimerRef.current);
      gheFunctionPreviewCloseTimerRef.current = null;
    }
    const rect = element.getBoundingClientRect();
    const previewWidth = Math.min(320, window.innerWidth - 24);
    const gap = 4;
    const viewportMargin = 12;
    const availableRight = window.innerWidth - rect.right - gap - viewportMargin;
    const availableLeft = rect.left - gap - viewportMargin;
    const placeOnRight =
      availableRight >= previewWidth ||
      (availableLeft < previewWidth && availableRight >= availableLeft);
    const left = placeOnRight
      ? Math.min(
          rect.right + gap,
          window.innerWidth - previewWidth - viewportMargin
        )
      : Math.max(viewportMargin, rect.left - previewWidth - gap);
    const availableBelowFromTop = window.innerHeight - rect.top - viewportMargin;

    if (availableBelowFromTop >= 120) {
      setGheFunctionPreview({
        gheId,
        left,
        top: Math.max(viewportMargin, rect.top),
        maxHeight: Math.min(420, availableBelowFromTop),
      });
      return;
    }

    setGheFunctionPreview({
      gheId,
      left,
      bottom: Math.max(viewportMargin, window.innerHeight - rect.bottom),
      maxHeight: Math.min(420, Math.max(80, rect.bottom - viewportMargin)),
    });
  };

  const keepGheFunctionPreviewOpen = () => {
    if (!gheFunctionPreviewCloseTimerRef.current) return;
    clearTimeout(gheFunctionPreviewCloseTimerRef.current);
    gheFunctionPreviewCloseTimerRef.current = null;
  };

  const hideGheFunctionPreview = () => {
    keepGheFunctionPreviewOpen();
    gheFunctionPreviewCloseTimerRef.current = setTimeout(() => {
      setGheFunctionPreview(null);
      gheFunctionPreviewCloseTimerRef.current = null;
    }, 400);
  };

  const handleGheFunctionPreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const maxScrollTop = element.scrollHeight - element.clientHeight;
    const reachedTop = event.deltaY < 0 && element.scrollTop <= 0;
    const reachedBottom = event.deltaY > 0 && element.scrollTop >= maxScrollTop - 1;

    event.stopPropagation();
    if (maxScrollTop <= 0 || reachedTop || reachedBottom) {
      event.preventDefault();
    }
  };

  useEffect(
    () => () => {
      if (gheFunctionPreviewCloseTimerRef.current) {
        clearTimeout(gheFunctionPreviewCloseTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!gheFunctionPreview) return;

    const handleGheTriggerWheel = (event: globalThis.WheelEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.closest("[data-ghe-function-preview-trigger]")
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (gheFunctionPreviewRef.current) {
        gheFunctionPreviewRef.current.scrollTop += event.deltaY;
      }
    };

    window.addEventListener("wheel", handleGheTriggerWheel, {
      capture: true,
      passive: false,
    });
    return () => {
      window.removeEventListener("wheel", handleGheTriggerWheel, true);
    };
  }, [gheFunctionPreview]);

  const hasQualitativeAndQuantitativeOptionsForRisk = useCallback(
    (tipoAgente: string, descricaoAgente: string) =>
      getHasExactQuantitativeCriteria(tipoAgente, descricaoAgente),
    [getHasExactQuantitativeCriteria]
  );

  useEffect(() => {
    setPersistedOptionsByRowId((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      riskGheGroups.forEach((ghe) => {
        ghe.risks.forEach((risk) => {
          const baseOptions = getFontesOptions(
            risk.tipoAgente,
            risk.descricaoAgente,
            ""
          );
          const selectedValues = parseCommaSeparatedValues(risk.fontes, baseOptions);
          const customValues = selectedValues.filter(
            (value) => !hasOptionInsensitive(baseOptions, value)
          );
          if (!customValues.length) return;

          const key = getPersistedFonteKey(risk.id);
          const existing = next[key] || [];
          const merged = Array.from(new Set([...existing, ...customValues]));
          if (merged.length !== existing.length) {
            next[key] = merged;
            hasChanges = true;
          }
        });
      });

      return hasChanges ? next : prev;
    });
  }, [getFontesOptions, riskGheGroups, setPersistedOptionsByRowId]);

  const isManyRiskGhes = riskGheGroups.length > 10;
  const normalizedRiskGheSearch = useMemo(
    () => normalizeText(riskGheSearch.trim()),
    [riskGheSearch]
  );
  const currentRiskGhe = useMemo(
    () =>
      riskGheGroups.find((ghe: RiskGheGroup) => ghe.id === currentRiskGheId) ??
      riskGheGroups[0],
    [riskGheGroups, currentRiskGheId]
  );
  const filteredRiskGheGroups = useMemo(() => {
    if (!normalizedRiskGheSearch) {
      return riskGheGroups;
    }
    const filtered = riskGheGroups.filter((ghe: RiskGheGroup) =>
      normalizeText(ghe.name).includes(normalizedRiskGheSearch)
    );
    if (
      currentRiskGhe &&
      !filtered.some((ghe: RiskGheGroup) => ghe.id === currentRiskGhe.id)
    ) {
      return [currentRiskGhe, ...filtered];
    }
    return filtered;
  }, [currentRiskGhe, normalizedRiskGheSearch, riskGheGroups]);
  const copySourceGhes = useMemo(
    () =>
      riskGheGroups.filter((ghe: RiskGheGroup) => ghe.id !== currentRiskGheId),
    [riskGheGroups, currentRiskGheId]
  );
  const copySourceGhesWithRisks = useMemo(
    () => copySourceGhes.filter((ghe) => ghe.risks.length > 0),
    [copySourceGhes]
  );
  const duplicatedRiskStructureGroups = useMemo<DuplicateRiskStructureGroup[]>(() => {
    const grouped = new Map<
      string,
      {
        gheIds: string[];
        gheNames: string[];
      }
    >();

    riskGheGroups.forEach((ghe) => {
      if (!ghe.risks.length) return;

      const structureKey = ghe.risks
        .map((risk) => getRiskContentKey(risk))
        .sort()
        .join("##");
      const existing = grouped.get(structureKey);

      if (!existing) {
        grouped.set(structureKey, { gheIds: [ghe.id], gheNames: [ghe.name] });
        return;
      }

      existing.gheIds.push(ghe.id);
      existing.gheNames.push(ghe.name);
    });

    return Array.from(grouped.entries())
      .filter(([, group]) => group.gheIds.length > 1)
      .map(([structureKey, group]) => ({
        structureKey,
        gheIds: group.gheIds,
        gheNames: group.gheNames,
      }));
  }, [riskGheGroups]);
  const duplicatedRiskStructureGheIds = useMemo(
    () =>
      new Set(
        duplicatedRiskStructureGroups.flatMap(
          (group: DuplicateRiskStructureGroup) => group.gheIds
        )
      ),
    [duplicatedRiskStructureGroups]
  );

  const [visibleRiskGheCount, setVisibleRiskGheCount] = useState(PROGRESSIVE_BATCH_SIZE);
  const [visibleRiskCount, setVisibleRiskCount] = useState(PROGRESSIVE_BATCH_SIZE);
  const [visibleCopySourceCount, setVisibleCopySourceCount] = useState(PROGRESSIVE_BATCH_SIZE);
  const [visibleRiskOverviewGheCount, setVisibleRiskOverviewGheCount] = useState(
    PROGRESSIVE_BATCH_SIZE
  );
  const [visibleRiskOverviewRiskCount, setVisibleRiskOverviewRiskCount] = useState(
    PROGRESSIVE_BATCH_SIZE
  );
  const [visibleBatchRiskCount, setVisibleBatchRiskCount] = useState(PROGRESSIVE_BATCH_SIZE);
  const [visibleBatchGheCount, setVisibleBatchGheCount] = useState(PROGRESSIVE_BATCH_SIZE);

  const shouldPaginateGheList = filteredRiskGheGroups.length > PROGRESSIVE_THRESHOLD;
  const visibleFilteredRiskGheGroups = useMemo(
    () =>
      shouldPaginateGheList
        ? filteredRiskGheGroups.slice(0, visibleRiskGheCount)
        : filteredRiskGheGroups,
    [filteredRiskGheGroups, shouldPaginateGheList, visibleRiskGheCount]
  );
  const hiddenRiskGheCount = Math.max(
    0,
    filteredRiskGheGroups.length - visibleFilteredRiskGheGroups.length
  );

  const currentRiskList = useMemo(
    () => currentRiskGhe?.risks ?? [],
    [currentRiskGhe]
  );
  const shouldPaginateRiskList = currentRiskList.length > PROGRESSIVE_THRESHOLD;
  const visibleCurrentRisks = useMemo(
    () =>
      shouldPaginateRiskList
        ? currentRiskList.slice(0, visibleRiskCount)
        : currentRiskList,
    [currentRiskList, shouldPaginateRiskList, visibleRiskCount]
  );
  const hiddenRiskCount = Math.max(0, currentRiskList.length - visibleCurrentRisks.length);
  const allCurrentRisksMinimized = useMemo(
    () =>
      currentRiskList.length > 0 &&
      currentRiskList.every((risk) => Boolean(minimizedRiskIds[risk.id])),
    [currentRiskList, minimizedRiskIds]
  );
  const allCurrentRisksSelected = useMemo(
    () =>
      currentRiskList.length > 0 &&
      currentRiskList.every((risk) => selectedRiskIds.includes(risk.id)),
    [currentRiskList, selectedRiskIds]
  );
  const totalRiskOverviewCount = useMemo(
    () => riskGheGroups.reduce((total, ghe) => total + ghe.risks.length, 0),
    [riskGheGroups]
  );
  const normalizedRiskOverviewSearch = useMemo(
    () => normalizeText(riskOverviewSearch.trim()),
    [riskOverviewSearch]
  );
  const shouldPaginateRiskOverviewGhes = riskGheGroups.length > PROGRESSIVE_THRESHOLD;
  const visibleRiskOverviewGhes = useMemo(
    () =>
      shouldPaginateRiskOverviewGhes
        ? riskGheGroups.slice(0, visibleRiskOverviewGheCount)
        : riskGheGroups,
    [riskGheGroups, shouldPaginateRiskOverviewGhes, visibleRiskOverviewGheCount]
  );
  const hiddenRiskOverviewGheCount = Math.max(
    0,
    riskGheGroups.length - visibleRiskOverviewGhes.length
  );
  const selectedRiskOverviewGhe = useMemo(
    () =>
      riskOverviewGheFilterId === "all"
        ? null
        : riskGheGroups.find((ghe) => ghe.id === riskOverviewGheFilterId) ?? null,
    [riskGheGroups, riskOverviewGheFilterId]
  );
  const scopedRiskOverviewRows = useMemo<RiskOverviewRow[]>(() => {
    if (riskOverviewGheFilterId === "all") {
      return riskGheGroups.flatMap((ghe) =>
        ghe.risks.map((risk) => ({
          gheId: ghe.id,
          gheName: ghe.name,
          risk,
        }))
      );
    }
    const ghe = riskGheGroups.find((item) => item.id === riskOverviewGheFilterId);
    if (!ghe) return [];
    return ghe.risks.map((risk) => ({
      gheId: ghe.id,
      gheName: ghe.name,
      risk,
    }));
  }, [riskGheGroups, riskOverviewGheFilterId]);
  const filteredRiskOverviewRows = useMemo(() => {
    if (!normalizedRiskOverviewSearch) return scopedRiskOverviewRows;
    return scopedRiskOverviewRows.filter((row) =>
      normalizeText(
        `${row.gheName} ${row.risk.tipoAgente || ""} ${row.risk.descricaoAgente || ""} ${row.risk.classificacao || ""}`
      ).includes(normalizedRiskOverviewSearch)
    );
  }, [normalizedRiskOverviewSearch, scopedRiskOverviewRows]);
  const shouldPaginateRiskOverviewRows =
    filteredRiskOverviewRows.length > PROGRESSIVE_THRESHOLD;
  const visibleRiskOverviewRows = useMemo(
    () =>
      shouldPaginateRiskOverviewRows
        ? filteredRiskOverviewRows.slice(0, visibleRiskOverviewRiskCount)
        : filteredRiskOverviewRows,
    [filteredRiskOverviewRows, shouldPaginateRiskOverviewRows, visibleRiskOverviewRiskCount]
  );
  const hiddenRiskOverviewRiskCount = Math.max(
    0,
    filteredRiskOverviewRows.length - visibleRiskOverviewRows.length
  );
  const batchRiskGroups = useMemo<BatchRiskGroup[]>(() => {
    const grouped = new Map<string, BatchRiskGroup>();
    riskGheGroups.forEach((ghe) => {
      ghe.risks.forEach((risk) => {
        const key = getRiskContentKey(risk);
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, {
            key,
            risk,
            sourceGheIds: [ghe.id],
            sourceGheNames: [ghe.name],
          });
          return;
        }
        if (!existing.sourceGheIds.includes(ghe.id)) {
          existing.sourceGheIds.push(ghe.id);
          existing.sourceGheNames.push(ghe.name);
        }
      });
    });
    return Array.from(grouped.values());
  }, [riskGheGroups]);
  const selectedBatchRiskGroups = useMemo(
    () => batchRiskGroups.filter((group) => selectedBatchRiskKeys.includes(group.key)),
    [batchRiskGroups, selectedBatchRiskKeys]
  );
  const normalizedBatchRiskSearch = useMemo(
    () => normalizeText(batchRiskSearch.trim()),
    [batchRiskSearch]
  );
  const normalizedBatchGheSearch = useMemo(
    () => normalizeText(batchGheSearch.trim()),
    [batchGheSearch]
  );
  const filteredBatchRiskGroups = useMemo(() => {
    if (!normalizedBatchRiskSearch) return batchRiskGroups;
    return batchRiskGroups.filter((group) =>
      normalizeText(
        `${group.sourceGheNames.join(" ")} ${group.risk.tipoAgente || ""} ${group.risk.descricaoAgente || ""} ${group.risk.classificacao || ""}`
      ).includes(normalizedBatchRiskSearch)
    );
  }, [batchRiskGroups, normalizedBatchRiskSearch]);
  const shouldPaginateBatchRisks = filteredBatchRiskGroups.length > PROGRESSIVE_THRESHOLD;
  const visibleBatchRiskGroups = useMemo(
    () =>
      shouldPaginateBatchRisks
        ? filteredBatchRiskGroups.slice(0, visibleBatchRiskCount)
        : filteredBatchRiskGroups,
    [filteredBatchRiskGroups, shouldPaginateBatchRisks, visibleBatchRiskCount]
  );
  const hiddenBatchRiskCount = Math.max(
    0,
    filteredBatchRiskGroups.length - visibleBatchRiskGroups.length
  );
  const filteredBatchGhes = useMemo(() => {
    const base = selectedBatchRiskGroups.length
      ? riskGheGroups.filter((ghe) =>
          selectedBatchRiskGroups.some((group) => !group.sourceGheIds.includes(ghe.id))
        )
      : riskGheGroups;
    if (!normalizedBatchGheSearch) return base;
    return base.filter((ghe) =>
      normalizeText(ghe.name).includes(normalizedBatchGheSearch)
    );
  }, [normalizedBatchGheSearch, riskGheGroups, selectedBatchRiskGroups]);
  const shouldPaginateBatchGhes = filteredBatchGhes.length > PROGRESSIVE_THRESHOLD;
  const visibleBatchGhes = useMemo(
    () =>
      shouldPaginateBatchGhes
        ? filteredBatchGhes.slice(0, visibleBatchGheCount)
        : filteredBatchGhes,
    [filteredBatchGhes, shouldPaginateBatchGhes, visibleBatchGheCount]
  );
  const hiddenBatchGheCount = Math.max(
    0,
    filteredBatchGhes.length - visibleBatchGhes.length
  );

  const shouldPaginateCopySources = copySourceGhesWithRisks.length > PROGRESSIVE_THRESHOLD;
  const visibleCopySourceGhes = useMemo(
    () =>
      shouldPaginateCopySources
        ? copySourceGhesWithRisks.slice(0, visibleCopySourceCount)
        : copySourceGhesWithRisks,
    [copySourceGhesWithRisks, shouldPaginateCopySources, visibleCopySourceCount]
  );
  const hiddenCopySourceCount = Math.max(
    0,
    copySourceGhesWithRisks.length - visibleCopySourceGhes.length
  );

  const riskErrorsById = useMemo<
    Record<string, Record<RequiredRiskField, string>>
  >(() => {
    const hasValue = (value: string | string[] | undefined | null) => {
      if (Array.isArray(value)) {
        return value.some((item) => typeof item === "string" && item.trim().length > 0);
      }
      return typeof value === "string" && value.trim().length > 0;
    };

    const map: Record<string, Record<RequiredRiskField, string>> = {};
    const duplicateCountByGhe = new Map<string, Map<string, number>>();

    riskGheGroups.forEach((ghe) => {
      const countByDescriptionKey = new Map<string, number>();
      ghe.risks.forEach((risk) => {
        const descriptionKey = getRiskDescriptionKey(risk.tipoAgente, risk.descricaoAgente);
        if (!descriptionKey) return;
        countByDescriptionKey.set(
          descriptionKey,
          (countByDescriptionKey.get(descriptionKey) || 0) + 1
        );
      });
      duplicateCountByGhe.set(ghe.id, countByDescriptionKey);
    });

    riskGheGroups.forEach((ghe) => {
      ghe.risks.forEach((risk) => {
        const isQuantitativeEvaluation = normalizeText(
          String(risk.tipoAvaliacao || "")
        ).includes("quantit");
        const isQualitativeEvaluation = normalizeText(
          String(risk.tipoAvaliacao || "")
        ).includes("qualit");
        const isCalculatedQualitativeEvaluation =
          isQualitativeEvaluation &&
          getIsCalculatedCriteria(risk.tipoAgente, risk.descricaoAgente);
        const allowMeasuredValueShortcut = supportsMeasuredValueShortcut(
          risk.tipoAgente,
          risk.descricaoAgente
        );
        const descriptionKey = getRiskDescriptionKey(risk.tipoAgente, risk.descricaoAgente);
        const isDuplicateDescription =
          !!descriptionKey &&
          (duplicateCountByGhe.get(ghe.id)?.get(descriptionKey) || 0) > 1;
        map[risk.id] = {
          tipoAgente: hasValue(risk.tipoAgente) ? "" : "Tipo de Agente é obrigatório.",
          descricaoAgente: !hasValue(risk.descricaoAgente)
            ? "Descrição do Agente é obrigatória."
            : isDuplicateDescription
              ? "Este risco já foi cadastrado neste GHE."
              : "",
          meioPropagacao: hasValue(risk.meioPropagacao)
            ? ""
            : "Meio de Propagação é obrigatório.",
          fontes: hasValue(risk.fontes) ? "" : "Fontes/Circunstâncias é obrigatório.",
          unidadeMedida: isQuantitativeEvaluation
            ? hasValue(risk.unidadeMedida)
              ? ""
              : "Unidade de Medida é obrigatória."
            : "",
          valorMedido: isQuantitativeEvaluation
            ? hasValue(risk.valorMedido)
              ? isValidMeasuredValue(String(risk.valorMedido || ""), {
                  allowShortcuts: allowMeasuredValueShortcut,
                })
                ? ""
                : allowMeasuredValueShortcut
                  ? "Valor medido deve ser N/D, <LQ ou numérico."
                  : "Valor medido deve ser numérico."
              : "Valor medido é obrigatório para avaliação quantitativa."
            : "",
          tipoAvaliacao: hasValue(risk.tipoAvaliacao)
            ? ""
            : "Tipo de Avaliação é obrigatório.",
          intensidade: isCalculatedQualitativeEvaluation
            ? ""
            : hasValue(risk.intensidade)
            ? isQuantitativeEvaluation
              ? isValidQuantitativeMeasurementValue(String(risk.intensidade || ""))
                ? ""
                : "Intensidade/Concentração deve ser numérica ou comparador válido, como <80, >80, <=80 ou >=80."
              : ""
            : "Intensidade/Concentração é obrigatória.",
          severidade: hasValue(risk.severidade) ? "" : "Severidade é obrigatória.",
          probabilidade:
            isQuantitativeEvaluation || hasValue(risk.probabilidade)
              ? ""
              : "Probabilidade é obrigatória.",
          classificacao: "",
          medidasControle: hasValue(risk.medidasControle)
            ? ""
            : "Medidas de Controle é obrigatório.",
          epc: "",
          epi: "",
        };
      });
    });
    return map;
  }, [getIsCalculatedCriteria, riskGheGroups]);

  const markRiskTouched = (riskId: string, field: RequiredRiskField) => {
    setTouchedRiskFields((prev) => ({
      ...prev,
      [riskId]: {
        ...(prev[riskId] || {}),
        [field]: true,
      },
    }));
  };

  const getRiskFieldClassName = (
    riskId: string,
    field: RequiredRiskField,
    baseClassName: string
  ) =>
    [
      baseClassName,
      riskErrorsById[riskId]?.[field] ? "border-danger-foreground/50 focus:ring-danger-foreground" : "",
      pendingReviewFocus?.stepId === "caracterizacao" &&
      pendingReviewFocus.riskId === riskId &&
      pendingReviewFocus.fieldKey === field
        ? "border-warning-foreground/50 bg-warning ring-2 ring-warning-foreground/30"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  const getRiskFieldError = (riskId: string, field: RequiredRiskField) =>
    riskErrorsById[riskId]?.[field] || "";

  const getFontesCatalogOptions = (risk: GheRisk) =>
    getFontesOptions(risk.tipoAgente, risk.descricaoAgente, "");

  const getPersistedFonteOptions = (riskId: string) =>
    persistedOptionsByRowId[getPersistedFonteKey(riskId)] || [];

  const getMergedFonteOptions = (risk: GheRisk) => {
    const catalogOptions = getFontesCatalogOptions(risk);
    const persistedOptions = getPersistedFonteOptions(risk.id);
    const selectedValues = parseMultiTextValues(risk.fontes, [
      ...catalogOptions,
      ...persistedOptions,
    ]);

    return Array.from(new Set([...catalogOptions, ...persistedOptions, ...selectedValues]));
  };

  const splitSelectedFontes = (risk: GheRisk) => {
    const catalogOptions = getFontesCatalogOptions(risk);
    const mergedOptions = getMergedFonteOptions(risk);
    const selectedValues = parseMultiTextValues(risk.fontes, mergedOptions);
    const selectedCatalog = selectedValues.filter((value) =>
      hasOptionInsensitive(catalogOptions, value)
    );
    const selectedCustom = selectedValues.filter(
      (value) => !hasOptionInsensitive(catalogOptions, value)
    );

    return { catalogOptions, mergedOptions, selectedValues, selectedCatalog, selectedCustom };
  };

  const handleCustomFontesChange = (risk: GheRisk, rawValue: string) => {
    const { selectedCatalog, selectedCustom } = splitSelectedFontes(risk);
    const nextCustom = parseMultiTextValues(rawValue).filter(
      (value) => !hasOptionInsensitive(getFontesCatalogOptions(risk), value)
    );

    setPersistedOptionsByRowId((prev) => {
      const key = getPersistedFonteKey(risk.id);
      const existing = prev[key] || [];
      const preserved = existing.filter((value) => !hasOptionInsensitive(selectedCustom, value));
      const nextPersisted = Array.from(new Set([...preserved, ...nextCustom]));

      if (
        nextPersisted.length === existing.length &&
        nextPersisted.every((value, index) => value === existing[index])
      ) {
        return prev;
      }

      if (nextPersisted.length === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [key]: nextPersisted,
      };
    });

    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) => ({
        ...ghe,
        risks: ghe.risks.map((currentRisk) =>
          currentRisk.id === risk.id
            ? {
                ...currentRisk,
                fontes: [...selectedCatalog, ...nextCustom].join(MULTI_VALUE_SEPARATOR),
              }
            : currentRisk
        ),
      }))
    );
  };

  const handleAddRisk = () => {
    if (!currentRiskGhe) return;
    pushHistory();
    const newRisk: GheRisk = {
      id: createRiskId(),
      tipoAgente: "",
      descricaoAgente: "",
      danosSaude: "",
      meioPropagacao: "",
      fontes: "",
      unidadeMedida: "",
      valorMedido: "",
      tipoAvaliacao: "",
      intensidade: "",
      nivelAcao: "",
      severidade: "",
      probabilidade: "",
      classificacao: "",
      medidasControle: "",
      normas: "",
      epc: "",
      epi: "",
      ca: "",
    };
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? { ...ghe, risks: [...ghe.risks, newRisk] }
          : ghe
      )
    );
    setTimeout(() => {
      const el = document.querySelector(`[data-risk-id="${newRisk.id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstInput = el.querySelector<HTMLInputElement>("input");
      firstInput?.focus();
    }, 0);
  };

  const handleRemoveRisk = (riskId: string) => {
    if (!currentRiskGhe) return;
    pushHistory();
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? { ...ghe, risks: ghe.risks.filter((risk) => risk.id !== riskId) }
          : ghe
      )
    );
    setTouchedRiskFields((prev) => {
      if (!prev[riskId]) return prev;
      const next = { ...prev };
      delete next[riskId];
      return next;
    });
    setMinimizedRiskIds((prev) => {
      if (!prev[riskId]) return prev;
      const next = { ...prev };
      delete next[riskId];
      return next;
    });
    setSelectedRiskIds((prev) => prev.filter((id) => id !== riskId));
  };

  const handleToggleRiskSelection = (riskId: string) => {
    setSelectedRiskIds((prev) =>
      prev.includes(riskId)
        ? prev.filter((id) => id !== riskId)
        : [...prev, riskId]
    );
  };

  const handleToggleAllRiskSelection = () => {
    if (!currentRiskList.length) return;
    setSelectedRiskIds(
      allCurrentRisksSelected ? [] : currentRiskList.map((risk) => risk.id)
    );
  };

  const handleRemoveSelectedRisks = () => {
    if (!currentRiskGhe || !selectedRiskIds.length) return;
    const selectedIds = new Set(selectedRiskIds);
    pushHistory();
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? {
              ...ghe,
              risks: ghe.risks.filter((risk) => !selectedIds.has(risk.id)),
            }
          : ghe
      )
    );
    setTouchedRiskFields((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    setMinimizedRiskIds((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    setSelectedRiskIds([]);
    setIsDeleteSelectedRisksModalOpen(false);
  };

  const handleRiskChange = (
    riskId: string,
    field:
      | "tipoAgente"
      | "descricaoAgente"
      | "danosSaude"
      | "meioPropagacao"
      | "fontes"
      | "unidadeMedida"
      | "valorMedido"
      | "tipoAvaliacao"
      | "intensidade"
      | "nivelAcao"
      | "severidade"
      | "probabilidade"
      | "classificacao"
      | "medidasControle"
      | "normas"
      | "epi"
      | "epc"
      | "ca",
    value: string
  ) => {
    const withComputedClassification = (nextRisk: GheRisk) => {
      const isQuantitativeEvaluation = normalizeText(
        String(nextRisk.tipoAvaliacao || "")
      ).includes("quantit");
      const hasSeverity = String(nextRisk.severidade || "").trim().length > 0;
      const calculated = calculateRiskClassification(nextRisk);

      if (isQuantitativeEvaluation) {
        if (!hasSeverity) {
          const hadValues =
            String(nextRisk.probabilidade || "").trim().length > 0 ||
            String(nextRisk.classificacao || "").trim().length > 0;
          if (!hadValues) return nextRisk;
          return {
            ...nextRisk,
            probabilidade: "",
            classificacao: "",
          };
        }

        const probabilityFromLevel =
          calculated?.quantitativeLevel !== undefined
            ? String(calculated.quantitativeLevel)
            : "";
        const classificationName = String(calculated?.classification || "").trim();
        const currentProbability = String(nextRisk.probabilidade || "").trim();
        const currentClassification = String(nextRisk.classificacao || "").trim();

        if (
          probabilityFromLevel === currentProbability &&
          classificationName === currentClassification
        ) {
          return nextRisk;
        }

        return {
          ...nextRisk,
          probabilidade: probabilityFromLevel,
          classificacao: classificationName,
        };
      }

      const hasProbability = String(nextRisk.probabilidade || "").trim().length > 0;
      if (!hasSeverity || !hasProbability) {
        if (!nextRisk.classificacao) return nextRisk;
        return { ...nextRisk, classificacao: "" };
      }

      const classificationName = String(calculated?.classification || "").trim();
      if (!classificationName) {
        if (!nextRisk.classificacao) return nextRisk;
        return { ...nextRisk, classificacao: "" };
      }
      if (classificationName === String(nextRisk.classificacao || "").trim()) {
        return nextRisk;
      }
      return { ...nextRisk, classificacao: classificationName };
    };
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.risks.some((risk) => risk.id === riskId)
          ? {
              ...ghe,
              risks: ghe.risks.map((risk) =>
                risk.id === riskId
                  ? (() => {
                      if (field === "tipoAgente") {
                        const nextRisk = {
                          ...risk,
                          tipoAgente: value,
                          // Ao trocar o agente, zera campos dependentes para evitar
                          // combinações inválidas (ex.: descrição de outro agente).
                          descricaoAgente: "",
                          danosSaude: "",
                          meioPropagacao: "",
                          fontes: "",
                          unidadeMedida: "",
                          valorMedido: "",
                          tipoAvaliacao: "",
                          intensidade: "",
                          nivelAcao: "",
                          severidade: "",
                          probabilidade: "",
                          classificacao: "",
                          medidasControle: "",
                          normas: "",
                          epc: "",
                          epi: "",
                          ca: "",
                        };
                        return withComputedClassification({
                          ...nextRisk,
                          tipoAgente: value,
                        });
                      }

                      if (field !== "descricaoAgente") {
                        if (field === "classificacao") {
                          return { ...risk, classificacao: value };
                        }

                        if (field === "tipoAvaliacao") {
                          const isNextQualitativeEvaluation = normalizeText(value).includes(
                            "qualit"
                          );
                          const isNextQuantitativeEvaluation = normalizeText(value).includes(
                            "quantit"
                          );
                          const isNextCalculatedQualitative =
                            isNextQualitativeEvaluation &&
                            getIsCalculatedCriteria(risk.tipoAgente, risk.descricaoAgente);
                          const defaultMeasuredUnit = getUnidadeMedidaOptions(
                            risk.tipoAgente,
                            risk.descricaoAgente,
                            ""
                          ).find((option) => !isNaValue(option)) || "";
                          const shouldClearCalculatedValues =
                            !isNextQualitativeEvaluation &&
                            (isCalculatedLimitValue(String(risk.intensidade || "")) ||
                              isCalculatedLimitValue(String(risk.nivelAcao || "")));
                          const nextRisk = {
                            ...risk,
                            tipoAvaliacao: value,
                            unidadeMedida: isNextCalculatedQualitative
                              ? ""
                              : isNextQuantitativeEvaluation
                                ? risk.unidadeMedida || defaultMeasuredUnit
                                : risk.unidadeMedida,
                            valorMedido:
                              isNextQuantitativeEvaluation && isNaValue(String(risk.valorMedido || ""))
                                ? ""
                                : risk.valorMedido,
                            intensidade: isNextCalculatedQualitative
                              ? CALCULATED_LIMIT_VALUE
                              : shouldClearCalculatedValues
                                ? ""
                                : risk.intensidade,
                            nivelAcao: isNextCalculatedQualitative
                              ? CALCULATED_LIMIT_VALUE
                              : shouldClearCalculatedValues
                                ? ""
                                : risk.nivelAcao,
                            probabilidade: "",
                            classificacao: "",
                          };
                          return withComputedClassification(
                            sanitizeRiskMeasurementFields(
                              nextRisk,
                              parseCommaSeparatedValues(risk.unidadeMedida),
                              hasQualitativeAndQuantitativeOptionsForRisk(
                                nextRisk.tipoAgente,
                                nextRisk.descricaoAgente
                              )
                            )
                          );
                        }

                        if (field === "unidadeMedida") {
                          const previousMeasuredUnits = parseCommaSeparatedValues(
                            risk.unidadeMedida
                          );
                          const nextMeasuredUnits = parseCommaSeparatedValues(value);
                          return withComputedClassification(
                            sanitizeRiskMeasurementFields(
                              {
                                ...risk,
                                unidadeMedida: value,
                              },
                              [...previousMeasuredUnits, ...nextMeasuredUnits],
                              hasQualitativeAndQuantitativeOptionsForRisk(
                                risk.tipoAgente,
                                risk.descricaoAgente
                              )
                            )
                          );
                        }

                        if (
                          field === "valorMedido" ||
                          field === "intensidade" ||
                          field === "nivelAcao"
                        ) {
                          const measuredUnits = parseCommaSeparatedValues(
                            risk.unidadeMedida
                          );
                          const valueWithoutUnit = stripTrailingMeasuredUnits(
                            value,
                            measuredUnits
                          );
                          const isQuantitativeEvaluation = normalizeText(
                            String(risk.tipoAvaliacao || "")
                          ).includes("quantit");
                          const sanitizedValue =
                            field === "valorMedido"
                              ? isQuantitativeEvaluation
                                ? sanitizeQuantitativeMeasurementInput(valueWithoutUnit)
                                : sanitizeNumericInput(valueWithoutUnit)
                              : isQuantitativeEvaluation
                                ? sanitizeQuantitativeMeasurementInput(valueWithoutUnit)
                                : valueWithoutUnit;
                          return withComputedClassification({
                            ...risk,
                            [field]: sanitizedValue,
                          });
                        }

                        return withComputedClassification({ ...risk, [field]: value });
                      }

                      const nextRisk = {
                        ...risk,
                        descricaoAgente: value,
                        // Ao trocar a descrição, limpa os campos técnicos para
                        // não reaproveitar valores do item anterior.
                        danosSaude: "",
                        meioPropagacao: "",
                        fontes: "",
                        unidadeMedida: "",
                        valorMedido: "",
                        tipoAvaliacao: "",
                        intensidade: "",
                        nivelAcao: "",
                        severidade: "",
                        probabilidade: "",
                        classificacao: "",
                        medidasControle: "",
                        normas: "",
                        epc: "",
                        epi: "",
                        ca: "",
                      };

                      if (!nextRisk.tipoAgente || !nextRisk.descricaoAgente) {
                        return withComputedClassification({
                          ...nextRisk,
                          tipoAgente: nextRisk.tipoAgente,
                          descricaoAgente: nextRisk.descricaoAgente,
                        });
                      }

                      const defaultedRisk = applyMissingRiskDefaults(nextRisk);
                      return withComputedClassification(
                        sanitizeRiskMeasurementFields(
                          {
                            ...defaultedRisk,
                            tipoAgente: nextRisk.tipoAgente,
                            descricaoAgente: nextRisk.descricaoAgente,
                          },
                          parseCommaSeparatedValues(defaultedRisk.unidadeMedida),
                          hasQualitativeAndQuantitativeOptionsForRisk(
                            nextRisk.tipoAgente,
                            nextRisk.descricaoAgente
                          )
                        )
                      );
                    })()
                  : risk
              ),
            }
          : ghe
      )
    );
  };

  const parseMultiTextValues = parseCommaSeparatedValues;

  const handleToggleRiskMultiSelect = (
    riskId: string,
    field:
      | "fontes"
      | "danosSaude"
      | "meioPropagacao"
      | "unidadeMedida"
      | "epc"
      | "epi"
      | "medidasControle"
      | "normas",
    option: string,
    availableOptions: string[] = []
  ) => {
    const safeOption = option.trim();
    if (!safeOption) return;

    pushHistory();
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) => {
        if (!ghe.risks.some((risk) => risk.id === riskId)) return ghe;
        return {
          ...ghe,
          risks: ghe.risks.map((risk) => {
            if (risk.id !== riskId) return risk;
            const current = parseMultiTextValues(risk[field], availableOptions);
            const next = current.includes(safeOption)
              ? current.filter((item) => item !== safeOption)
              : [...current, safeOption];
            const nextValue = next.join(MULTI_VALUE_SEPARATOR);
            if (field === "unidadeMedida") {
              return sanitizeRiskMeasurementFields(
                { ...risk, unidadeMedida: nextValue },
                [...current, ...next],
                hasQualitativeAndQuantitativeOptionsForRisk(
                  risk.tipoAgente,
                  risk.descricaoAgente
                )
              );
            }
            return { ...risk, [field]: nextValue };
          }),
        };
      })
    );
  };

  const cloneRiskForAssignment = (risk: GheRisk): GheRisk => {
    const meioPropagacaoOptions = getMeioPropagacaoOptions(
      risk.tipoAgente,
      risk.descricaoAgente,
      ""
    );
    const fontesOptions = getMergedFonteOptions(risk);
    const danosSaudeOptions = getDanosSaudeOptions(
      risk.tipoAgente,
      risk.descricaoAgente,
      ""
    );
    const unidadeMedidaOptions = getUnidadeMedidaOptions(
      risk.tipoAgente,
      risk.descricaoAgente,
      ""
    );
    const medidasControleOptions = getMedidasControleOptions(
      risk.tipoAgente,
      risk.descricaoAgente,
      ""
    );
    const normasOptions = getNormasOptions(
      risk.tipoAgente,
      risk.descricaoAgente,
      ""
    );
    const epcOptions = getEpcOptions(risk.tipoAgente, risk.descricaoAgente, "");
    const epiOptions = getEpiOptions(risk.tipoAgente, risk.descricaoAgente, "");

    const clonedRisk: GheRisk = {
      ...risk,
      id: createRiskId(),
      meioPropagacao: parseMultiTextValues(
        risk.meioPropagacao,
        meioPropagacaoOptions
      ).join(MULTI_VALUE_SEPARATOR),
      fontes: parseMultiTextValues(risk.fontes, fontesOptions).join(
        MULTI_VALUE_SEPARATOR
      ),
      danosSaude: parseMultiTextValues(
        String(risk.danosSaude || ""),
        danosSaudeOptions
      ).join(MULTI_VALUE_SEPARATOR),
      unidadeMedida: parseMultiTextValues(
        String(risk.unidadeMedida || ""),
        unidadeMedidaOptions
      ).join(MULTI_VALUE_SEPARATOR),
      medidasControle: parseMultiTextValues(
        risk.medidasControle,
        medidasControleOptions
      ).join(MULTI_VALUE_SEPARATOR),
      normas: parseMultiTextValues(
        String(risk.normas || ""),
        normasOptions
      ).join(MULTI_VALUE_SEPARATOR),
      epc: parseMultiTextValues(
        normalizeMultiTextValue(risk.epc),
        epcOptions
      ).join(MULTI_VALUE_SEPARATOR),
      epi: parseMultiTextValues(
        normalizeMultiTextValue(risk.epi),
        epiOptions
      ).join(MULTI_VALUE_SEPARATOR),
    };

    return sanitizeRiskMeasurementFields(
      clonedRisk,
      parseMultiTextValues(clonedRisk.unidadeMedida || "", unidadeMedidaOptions),
      hasQualitativeAndQuantitativeOptionsForRisk(
        clonedRisk.tipoAgente,
        clonedRisk.descricaoAgente
      )
    );
  };

  const filterOptionsByQuery = (options: string[]) => {
    const term = normalizeText(multiSelectQuery.trim());
    if (!term) return options;
    return options.filter((option) => normalizeText(option).includes(term));
  };

  const handleCopyRiskStructure = (sourceGheId: string) => {
    if (!currentRiskGhe) return;
    const source = riskGheGroups.find((ghe: RiskGheGroup) => ghe.id === sourceGheId);
    if (!source || !source.risks.length) return;
    pushHistory();
    const clonedRisks = source.risks.map((risk: GheRisk) => cloneRiskForAssignment(risk));
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id ? { ...ghe, risks: clonedRisks } : ghe
      )
    );
    setIsCopyMenuOpen(false);
  };

  useEffect(() => {
    if (!isCopyMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!copyMenuRef.current || !target) return;
      if (!copyMenuRef.current.contains(target)) {
        setIsCopyMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isCopyMenuOpen]);

  useEffect(() => {
    setRiskGheGroups((prev) => {
      let hasChanges = false;
        const next = prev.map((ghe) => {
        let gheChanged = false;
        const nextRisks = ghe.risks.map((risk) => {
          const sanitizedRisk = sanitizeRiskMeasurementFields(
            risk,
            parseCommaSeparatedValues(risk.unidadeMedida),
            hasQualitativeAndQuantitativeOptionsForRisk(
              risk.tipoAgente,
              risk.descricaoAgente
            )
          );
          if (
            sanitizedRisk.valorMedido !== String(risk.valorMedido || "") ||
            sanitizedRisk.intensidade !== String(risk.intensidade || "") ||
            sanitizedRisk.nivelAcao !== String(risk.nivelAcao || "")
          ) {
            gheChanged = true;
            return sanitizedRisk;
          }
          return risk;
        });
        if (!gheChanged) return ghe;
        hasChanges = true;
        return {
          ...ghe,
          risks: nextRisks,
        };
      });
      return hasChanges ? next : prev;
    });
  }, [
    hasQualitativeAndQuantitativeOptionsForRisk,
    riskGheGroups,
    setRiskGheGroups,
  ]);

  useEffect(() => {
    setVisibleRiskGheCount(PROGRESSIVE_BATCH_SIZE);
  }, [riskGheSearch, filteredRiskGheGroups.length]);

  useEffect(() => {
    setVisibleRiskCount(PROGRESSIVE_BATCH_SIZE);
  }, [currentRiskGheId, currentRiskList.length]);

  useEffect(() => {
    setSelectedRiskIds([]);
    setIsDeleteSelectedRisksModalOpen(false);
  }, [currentRiskGheId]);

  useEffect(() => {
    const currentIds = new Set(currentRiskList.map((risk) => risk.id));
    setSelectedRiskIds((prev) => {
      const next = prev.filter((id) => currentIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [currentRiskList]);

  useEffect(() => {
    if (!isCopyMenuOpen) return;
    setVisibleCopySourceCount(PROGRESSIVE_BATCH_SIZE);
  }, [isCopyMenuOpen, copySourceGhesWithRisks.length]);

  useEffect(() => {
    if (!isRiskOverviewModalOpen) return;
    setVisibleRiskOverviewGheCount(PROGRESSIVE_BATCH_SIZE);
  }, [isRiskOverviewModalOpen, riskGheGroups.length]);

  useEffect(() => {
    if (!isRiskOverviewModalOpen) return;
    setVisibleRiskOverviewRiskCount(PROGRESSIVE_BATCH_SIZE);
  }, [isRiskOverviewModalOpen, riskOverviewSearch, riskOverviewGheFilterId, filteredRiskOverviewRows.length]);

  useEffect(() => {
    if (riskOverviewGheFilterId === "all") return;
    if (riskGheGroups.some((ghe) => ghe.id === riskOverviewGheFilterId)) return;
    setRiskOverviewGheFilterId("all");
  }, [riskGheGroups, riskOverviewGheFilterId]);

  useEffect(() => {
    if (!isBatchAssignModalOpen) return;
    setVisibleBatchRiskCount(PROGRESSIVE_BATCH_SIZE);
  }, [isBatchAssignModalOpen, filteredBatchRiskGroups.length, batchRiskSearch]);

  useEffect(() => {
    if (!isBatchAssignModalOpen) return;
    setVisibleBatchGheCount(PROGRESSIVE_BATCH_SIZE);
  }, [isBatchAssignModalOpen, filteredBatchGhes.length, batchGheSearch, selectedBatchRiskKeys]);

  useEffect(() => {
    const availableKeys = new Set(batchRiskGroups.map((group) => group.key));
    setSelectedBatchRiskKeys((prev) => {
      const next = prev.filter((key) => availableKeys.has(key));
      return next.length === prev.length ? prev : next;
    });
  }, [batchRiskGroups]);

  useEffect(() => {
    setSelectedBatchGheIds((prev) =>
      prev.filter((id) => riskGheGroups.some((ghe) => ghe.id === id))
    );
  }, [riskGheGroups]);

  useEffect(() => {
    if (!selectedBatchRiskGroups.length) {
      setSelectedBatchGheIds([]);
      return;
    }
    setSelectedBatchGheIds((prev) =>
      prev.filter((id) =>
        selectedBatchRiskGroups.some((group) => !group.sourceGheIds.includes(id))
      )
    );
  }, [selectedBatchRiskGroups]);

  useEffect(() => {
    if (!openMultiSelect) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-multiselect]")) {
        return;
      }
      setOpenMultiSelect(null);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [openMultiSelect]);

  useEffect(() => {
    if (openMultiSelect) {
      setMultiSelectQuery("");
    }
  }, [openMultiSelect]);

  const handleToggleAllRisks = () => {
    if (!currentRiskList.length) return;
    setMinimizedRiskIds((prev) => {
      const next = { ...prev };
      if (allCurrentRisksMinimized) {
        currentRiskList.forEach((risk) => {
          delete next[risk.id];
        });
      } else {
        currentRiskList.forEach((risk) => {
          next[risk.id] = true;
        });
      }
      return next;
    });
  };

  const handleMoveRiskGhe = (gheId: string, direction: "up" | "down") => {
    const currentIndex = riskGheGroups.findIndex((ghe) => ghe.id === gheId);
    if (currentIndex < 0) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= riskGheGroups.length) return;

    const reorderedRiskGhes = [...riskGheGroups];
    [reorderedRiskGhes[currentIndex], reorderedRiskGhes[targetIndex]] = [
      reorderedRiskGhes[targetIndex],
      reorderedRiskGhes[currentIndex],
    ];
    const orderById = new Map(
      reorderedRiskGhes.map((ghe, index) => [ghe.id, index])
    );

    pushHistory();
    setRiskGheGroups(reorderedRiskGhes);
    setGheGroups((prev: GheGroup[]) =>
      [...prev].sort(
        (first, second) =>
          (orderById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
          (orderById.get(second.id) ?? Number.MAX_SAFE_INTEGER)
      )
    );
  };

  const renderRiskGheOrderControls = (
    ghe: RiskGheGroup,
    positionClassName: string
  ) => {
    const gheIndex = riskGheGroups.findIndex((group) => group.id === ghe.id);
    return (
      <div className={`flex items-center gap-1 ${positionClassName}`}>
        <button
          type="button"
          onClick={() => handleMoveRiskGhe(ghe.id, "up")}
          disabled={gheIndex <= 0}
          className={`flex h-7 w-7 items-center justify-center rounded-[7px] border bg-card transition ${
            gheIndex > 0
              ? "border-border text-foreground hover:border-primary/50 hover:text-primary"
              : "cursor-not-allowed border-border/50 text-muted-foreground/40"
          }`}
          title="Mover GHE para cima"
          aria-label={`Mover ${ghe.name} para cima`}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleMoveRiskGhe(ghe.id, "down")}
          disabled={gheIndex < 0 || gheIndex >= riskGheGroups.length - 1}
          className={`flex h-7 w-7 items-center justify-center rounded-[7px] border bg-card transition ${
            gheIndex >= 0 && gheIndex < riskGheGroups.length - 1
              ? "border-border text-foreground hover:border-primary/50 hover:text-primary"
              : "cursor-not-allowed border-border/50 text-muted-foreground/40"
          }`}
          title="Mover GHE para baixo"
          aria-label={`Mover ${ghe.name} para baixo`}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  const toggleBatchGheSelection = (gheId: string) => {
    setSelectedBatchGheIds((prev) =>
      prev.includes(gheId) ? prev.filter((id) => id !== gheId) : [...prev, gheId]
    );
    setBatchAssignFeedback("");
  };

  const toggleBatchRiskSelection = (riskKey: string) => {
    setSelectedBatchRiskKeys((prev) =>
      prev.includes(riskKey)
        ? prev.filter((key) => key !== riskKey)
        : [...prev, riskKey]
    );
    setBatchAssignFeedback("");
  };

  const handleApplyBatchRiskAssignment = () => {
    if (!selectedBatchRiskGroups.length || !selectedBatchGheIds.length) return;

    const targetGheIds = new Set(selectedBatchGheIds);
    let addedCount = 0;
    const affectedGheIds = new Set<string>();
    const nextRiskGheGroups = riskGheGroups.map((ghe) => {
      if (!targetGheIds.has(ghe.id)) return ghe;
      const nextRisks = [...ghe.risks];

      selectedBatchRiskGroups.forEach((group) => {
        if (group.sourceGheIds.includes(ghe.id)) return;
        const sourceRisk = group.risk;
        const sourceRiskDescriptionKey = getRiskDescriptionKey(
          sourceRisk.tipoAgente,
          sourceRisk.descricaoAgente
        );
        const hasSameRiskDescription =
          !!sourceRiskDescriptionKey &&
          nextRisks.some(
            (risk) =>
              getRiskDescriptionKey(risk.tipoAgente, risk.descricaoAgente) ===
              sourceRiskDescriptionKey
          );
        const hasSameRiskContent = nextRisks.some((risk) =>
          isSameRiskContent(risk, sourceRisk)
        );
        if (hasSameRiskDescription || hasSameRiskContent) return;
        nextRisks.push(cloneRiskForAssignment(sourceRisk));
        addedCount += 1;
        affectedGheIds.add(ghe.id);
      });

      return nextRisks.length === ghe.risks.length
        ? ghe
        : { ...ghe, risks: nextRisks };
    });

    if (!addedCount) {
      setBatchAssignFeedback(
        "Os GHEs selecionados já possuem os riscos escolhidos."
      );
      return;
    }

    pushHistory();
    setRiskGheGroups(nextRiskGheGroups);
    setSelectedBatchGheIds([]);
    setBatchAssignFeedback(
      `${addedCount} atribuição(ões) realizada(s) em ${affectedGheIds.size} GHE(s).`
    );
  };

  const renderRiskCards = (withMargin: boolean) => (
    <div className={`${withMargin ? "mt-6" : ""} space-y-4`}>
      {visibleCurrentRisks.length ? (
        visibleCurrentRisks.map((risk: GheRisk) => (
          (() => {
            const isMinimized = Boolean(minimizedRiskIds[risk.id]);
            const isQuantitativeEvaluation = normalizeText(risk.tipoAvaliacao).includes("quantit");
            const isQualitativeEvaluation = normalizeText(risk.tipoAvaliacao).includes("qualit");
            const hasQuantitativeCriteria = getHasQuantitativeCriteria(
              risk.tipoAgente,
              risk.descricaoAgente
            );
            const canAwaitQuantitativeEvaluation = hasQualitativeAndQuantitativeOptionsForRisk(
              risk.tipoAgente,
              risk.descricaoAgente
            );
            const isCalculatedQualitativeEvaluation =
              isQualitativeEvaluation &&
              getIsCalculatedCriteria(risk.tipoAgente, risk.descricaoAgente);
            const allowMeasuredValueShortcut = supportsMeasuredValueShortcut(
              risk.tipoAgente,
              risk.descricaoAgente
            );
            const selectedMeasuredUnits = parseMultiTextValues(
              risk.unidadeMedida || "",
              getUnidadeMedidaOptions(risk.tipoAgente, risk.descricaoAgente, "")
            );
            const measuredUnit = selectedMeasuredUnits[0] || "";
            const measuredUnitPlaceholder =
              measuredUnit && !isNaValue(measuredUnit)
                ? measuredUnit
                : "Unidade de Medida";
            const sanitizedValorMedido = stripTrailingMeasuredUnits(
              String(risk.valorMedido || ""),
              selectedMeasuredUnits
            );
            const normalizedValorMedido = isQuantitativeEvaluation
              ? isNaValue(sanitizedValorMedido)
                ? ""
                : sanitizeMeasuredValueInput(sanitizedValorMedido)
              : sanitizeNumericInput(sanitizedValorMedido);
            const sanitizedIntensidade = stripTrailingMeasuredUnits(
              String(risk.intensidade || ""),
              selectedMeasuredUnits
            );
            const displayIntensidade = isQuantitativeEvaluation
              ? isNaValue(sanitizedIntensidade)
                ? ""
                : sanitizeQuantitativeMeasurementInput(sanitizedIntensidade)
              : isCalculatedQualitativeEvaluation
                ? CALCULATED_LIMIT_VALUE
                : sanitizedIntensidade;
            const sanitizedNivelAcao = stripTrailingMeasuredUnits(
              String(risk.nivelAcao || ""),
              selectedMeasuredUnits
            );
            const displayNivelAcao = isQuantitativeEvaluation
              ? isNaValue(sanitizedNivelAcao)
                ? ""
                : sanitizeQuantitativeMeasurementInput(sanitizedNivelAcao)
              : isCalculatedQualitativeEvaluation
                ? CALCULATED_LIMIT_VALUE
                : sanitizedNivelAcao;
            const isMeasuredValueMissing =
              isQuantitativeEvaluation && !String(normalizedValorMedido || "").trim();
            const qualitativeMeasuredValueLabel = getQualitativeMeasuredValueFallback(
              canAwaitQuantitativeEvaluation
            );
            const sanitizeOptionValues = (options: string[]) =>
              Array.from(
                new Set(
                  options
                    .map((option) =>
                      stripTrailingMeasuredUnits(option, selectedMeasuredUnits).trim()
                    )
                    .filter(Boolean)
                )
              );
            const meioPropagacaoOptions = Array.from(
              new Set([
                ...getMeioPropagacaoOptions(
                  risk.tipoAgente,
                  risk.descricaoAgente,
                  ""
                ),
                ...parseMultiTextValues(
                  risk.meioPropagacao,
                  getMeioPropagacaoOptions(
                    risk.tipoAgente,
                    risk.descricaoAgente,
                    ""
                  )
                ),
              ])
            );
            const selectedMeios = parseMultiTextValues(
              risk.meioPropagacao,
              meioPropagacaoOptions
            );
            const filteredMeioPropagacaoOptions = filterOptionsByQuery(meioPropagacaoOptions);
            const customMeioPropagacaoValue = multiSelectQuery.trim();
            const canAddCustomMeioPropagacao =
              !!customMeioPropagacaoValue &&
              !hasOptionInsensitive(meioPropagacaoOptions, customMeioPropagacaoValue) &&
              !hasOptionInsensitive(selectedMeios, customMeioPropagacaoValue);
            const fontesOptions = getMergedFonteOptions(risk);
            const selectedFontes = parseMultiTextValues(risk.fontes, fontesOptions);
            const selectedFontesCatalog = selectedFontes.filter((value) =>
              hasOptionInsensitive(getFontesCatalogOptions(risk), value)
            );
            const selectedFontesCustom = selectedFontes.filter(
              (value) => !hasOptionInsensitive(getFontesCatalogOptions(risk), value)
            );
            const filteredFontesOptions = filterOptionsByQuery(fontesOptions);
            const fontesDisplayValue = [...selectedFontesCatalog, ...selectedFontesCustom].join(", ");
            const customFonteValue = multiSelectQuery.trim();
            const canAddCustomFonte =
              !!customFonteValue &&
              !hasOptionInsensitive(fontesOptions, customFonteValue) &&
              !hasOptionInsensitive(selectedFontes, customFonteValue);
            const danosSaudeOptions = Array.from(
              new Set([
                ...getDanosSaudeOptions(
                  risk.tipoAgente,
                  risk.descricaoAgente,
                  ""
                ),
                ...parseMultiTextValues(
                  String(risk.danosSaude || ""),
                  getDanosSaudeOptions(
                    risk.tipoAgente,
                    risk.descricaoAgente,
                    ""
                  )
                ),
              ])
            );
            const selectedDanosSaude = parseMultiTextValues(
              String(risk.danosSaude || ""),
              danosSaudeOptions
            );
            const medidasControleOptions = Array.from(
              new Set([
                ...getMedidasControleOptions(
                  risk.tipoAgente,
                  risk.descricaoAgente,
                  ""
                ),
                ...parseMultiTextValues(
                  risk.medidasControle,
                  getMedidasControleOptions(
                    risk.tipoAgente,
                    risk.descricaoAgente,
                    ""
                  )
                ),
              ])
            );
            const selectedMedidasControle = parseMultiTextValues(
              risk.medidasControle,
              medidasControleOptions
            );
            const filteredMedidasControleOptions = filterOptionsByQuery(
              medidasControleOptions
            );
            const customMedidaValue = multiSelectQuery.trim();
            const canAddCustomMedida =
              !!customMedidaValue &&
              !hasOptionInsensitive(medidasControleOptions, customMedidaValue) &&
              !hasOptionInsensitive(selectedMedidasControle, customMedidaValue);
            const epcOptions = Array.from(
              new Set([
                ...getEpcOptions(risk.tipoAgente, risk.descricaoAgente, ""),
                ...parseMultiTextValues(
                  normalizeMultiTextValue(risk.epc),
                  getEpcOptions(risk.tipoAgente, risk.descricaoAgente, "")
                ),
              ])
            );
            const selectedEpc = parseMultiTextValues(
              normalizeMultiTextValue(risk.epc),
              epcOptions
            );
            const filteredEpcOptions = filterOptionsByQuery(epcOptions);
            const customEpcValue = multiSelectQuery.trim();
            const canAddCustomEpc =
              !!customEpcValue &&
              !hasOptionInsensitive(epcOptions, customEpcValue) &&
              !hasOptionInsensitive(selectedEpc, customEpcValue);
            const epiOptions = Array.from(
              new Set([
                ...getEpiOptions(risk.tipoAgente, risk.descricaoAgente, ""),
                ...parseMultiTextValues(
                  normalizeMultiTextValue(risk.epi),
                  getEpiOptions(risk.tipoAgente, risk.descricaoAgente, "")
                ),
              ])
            );
            const selectedEpi = parseMultiTextValues(
              normalizeMultiTextValue(risk.epi),
              epiOptions
            );
            const filteredEpiOptions = filterOptionsByQuery(epiOptions);
            const customEpiValue = multiSelectQuery.trim();
            const canAddCustomEpi =
              !!customEpiValue &&
              !hasOptionInsensitive(epiOptions, customEpiValue) &&
              !hasOptionInsensitive(selectedEpi, customEpiValue);
            const caValues = Array.from(
              new Set(
                selectedEpi
                  .map((item) => {
                    const match = item.match(/\(CA\s*([^)]+)\)/i);
                    return match?.[1]?.trim() || "";
                  })
                  .filter(Boolean)
              )
            );
            const unidadeMedidaOptions = Array.from(
              new Set([
                ...getUnidadeMedidaOptions(
                  risk.tipoAgente,
                  risk.descricaoAgente,
                  ""
                ),
                ...selectedMeasuredUnits,
              ])
            );
            const filteredUnidadeMedidaOptions = filterOptionsByQuery(unidadeMedidaOptions);
            const descricaoAgenteOptions = getDescricaoAgenteOptions(
              risk.tipoAgente,
              risk.descricaoAgente
            ).map((option: string) => {
              const optionDescriptionKey = getRiskDescriptionKey(risk.tipoAgente, option);
              const isAlreadyRegisteredInGhe =
                !!optionDescriptionKey &&
                currentRiskGhe?.risks.some(
                  (currentRisk) =>
                    currentRisk.id !== risk.id &&
                    getRiskDescriptionKey(
                      currentRisk.tipoAgente,
                      currentRisk.descricaoAgente
                    ) === optionDescriptionKey
                );

              return {
                label: isAlreadyRegisteredInGhe
                  ? `${option} (já cadastrado neste GHE)`
                  : option,
                value: option,
                disabled: isAlreadyRegisteredInGhe,
                disabledReason: isAlreadyRegisteredInGhe
                  ? "Este risco já foi cadastrado neste GHE."
                  : undefined,
              };
            });
            return (
              <div
                key={risk.id}
                data-risk-id={risk.id}
                className={`rounded-[14px] border bg-card px-4 py-4 ${
                  pendingReviewFocus?.stepId === "caracterizacao" &&
                  pendingReviewFocus.riskId === risk.id
                    ? "border-warning-foreground/50 ring-2 ring-warning-foreground/30"
                    : "border-border/60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedRiskIds.includes(risk.id)}
                      onChange={() => handleToggleRiskSelection(risk.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      aria-label={`Selecionar risco ${
                        risk.descricaoAgente || "não informado"
                      }`}
                    />
                    <span>Risco cadastrado</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMinimizedRiskIds((prev) => ({
                          ...prev,
                          [risk.id]: !prev[risk.id],
                        }))
                      }
                      className="btn-outline px-3 py-1 text-[12px]"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isMinimized ? "-rotate-90" : "rotate-0"
                        }`}
                      />
                      {isMinimized ? "Expandir risco" : "Minimizar risco"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRisk(risk.id)}
                      className="btn-outline px-3 py-1 text-[12px] text-danger-foreground hover:bg-danger/10"
                    >
                      Excluir risco
                    </button>
                  </div>
                </div>

                {isMinimized ? (
                  <div className="mt-3 rounded-[10px] border border-border/50 bg-background/40 px-3 py-2 text-[12px] text-muted-foreground">
                    <span>
                      Tipo: {risk.tipoAgente || "Não informado"} · Agente:{" "}
                      {risk.descricaoAgente || "Não informado"} · Classificação:{" "}
                      {risk.classificacao || "Não informado"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-[12px] font-medium text-foreground">
                          Tipo de Agente *
                        </label>
                        <div className="mt-2">
                          <SearchableSelect
                            value={risk.tipoAgente}
                            onChange={(value) => {
                              markRiskTouched(risk.id, "tipoAgente");
                              handleRiskChange(risk.id, "tipoAgente", value);
                            }}
                            options={tipoAgenteOptions.map((option: string) => ({
                              label: option,
                              value: option,
                            }))}
                            buttonClassName={getRiskFieldClassName(
                              risk.id,
                              "tipoAgente",
                              selectSmallClass
                            )}
                            searchPlaceholder="Filtrar agente"
                          />
                        </div>
                        {getRiskFieldError(risk.id, "tipoAgente") ? (
                          <p className="mt-1 text-[12px] text-danger-foreground">
                            {getRiskFieldError(risk.id, "tipoAgente")}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-foreground">
                          Descrição do Agente *
                        </label>
                        <div className="mt-2">
                          <SearchableSelect
                            value={risk.descricaoAgente}
                            onChange={(value) => {
                              markRiskTouched(risk.id, "descricaoAgente");
                              handleRiskChange(risk.id, "descricaoAgente", value);
                            }}
                            options={descricaoAgenteOptions}
                            buttonClassName={getRiskFieldClassName(
                              risk.id,
                              "descricaoAgente",
                              selectSmallClass
                            )}
                            searchPlaceholder="Filtrar descrição"
                          />
                        </div>
                        {getRiskFieldError(risk.id, "descricaoAgente") ? (
                          <p className="mt-1 text-[12px] text-danger-foreground">
                            {getRiskFieldError(risk.id, "descricaoAgente")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 grid auto-rows-min items-start gap-x-4 gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
                      <div className={formGroupClass}>
                        <label className="text-[12px] font-medium text-foreground">
                          Meio de Propagação *
                        </label>
                        <div>
                          <div className="relative" data-multiselect>
                            <button
                              type="button"
                              className={getRiskFieldClassName(
                                risk.id,
                                "meioPropagacao",
                                `${selectSmallClass} flex items-center justify-between text-left`
                              )}
                              onClick={() =>
                                setOpenMultiSelect((prev) =>
                                  prev?.riskId === risk.id &&
                                  prev.field === "meioPropagacao"
                                    ? null
                                    : { riskId: risk.id, field: "meioPropagacao" }
                                )
                              }
                            >
                              <span className="truncate">
                                {selectedMeios.length
                                  ? selectedMeios.join(", ")
                                  : "Selecione os meios"}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  openMultiSelect?.riskId === risk.id &&
                                  openMultiSelect.field === "meioPropagacao"
                                    ? "rotate-180"
                                    : "rotate-0"
                                }`}
                              />
                            </button>
                            {openMultiSelect?.riskId === risk.id &&
                            openMultiSelect.field === "meioPropagacao" ? (
                              <div className="absolute z-20 mt-2 w-full rounded-[10px] border border-border bg-popover p-2 shadow-md">
                                <div className="relative mb-2">
                                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <input
                                    className={`${inputInlineClass} pl-8`}
                                    value={multiSelectQuery}
                                    onChange={(event) => setMultiSelectQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (!canAddCustomMeioPropagacao || event.key !== "Enter") return;
                                      event.preventDefault();
                                      markRiskTouched(risk.id, "meioPropagacao");
                                      handleToggleRiskMultiSelect(
                                        risk.id,
                                        "meioPropagacao",
                                        customMeioPropagacaoValue,
                                        meioPropagacaoOptions
                                      );
                                      setMultiSelectQuery("");
                                    }}
                                    placeholder="Filtrar ou adicionar meio"
                                  />
                                </div>
                                {customMeioPropagacaoValue ? (
                                  canAddCustomMeioPropagacao ? (
                                    <button
                                      type="button"
                                      className="mb-2 w-full rounded-[6px] border border-border px-2 py-1 text-left text-[12px] text-foreground hover:bg-muted"
                                      onClick={() => {
                                        markRiskTouched(risk.id, "meioPropagacao");
                                        handleToggleRiskMultiSelect(
                                          risk.id,
                                          "meioPropagacao",
                                          customMeioPropagacaoValue,
                                          meioPropagacaoOptions
                                        );
                                        setMultiSelectQuery("");
                                      }}
                                    >
                                      {`Adicionar "${customMeioPropagacaoValue}"`}
                                    </button>
                                  ) : (
                                    <p className="mb-2 rounded-[6px] border border-border/70 bg-muted/50 px-2 py-1 text-[12px] text-muted-foreground">
                                      Este meio já existe na lista.
                                    </p>
                                  )
                                ) : (
                                  <p className="mb-2 rounded-[6px] border border-dashed border-border/70 bg-muted/30 px-2 py-1 text-[12px] text-muted-foreground">
                                    Digite para adicionar um novo meio.
                                  </p>
                                )}
                                <div className="max-h-44 space-y-1 overflow-auto">
                                  {filteredMeioPropagacaoOptions.length ? (
                                    filteredMeioPropagacaoOptions.map((option) => {
                                      const isChecked = selectedMeios.includes(option);
                                      return (
                                        <label
                                          key={`${risk.id}-meio-${option}`}
                                          className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-[12px] hover:bg-muted"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              markRiskTouched(risk.id, "meioPropagacao");
                                              handleToggleRiskMultiSelect(
                                                risk.id,
                                                "meioPropagacao",
                                                option,
                                                meioPropagacaoOptions
                                              );
                                            }}
                                          />
                                          <span>{option}</span>
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <p className="px-2 py-1 text-[12px] text-muted-foreground">
                                      Nenhum meio encontrado.
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {getRiskFieldError(risk.id, "meioPropagacao") ? (
                          <p className="mt-1 text-[12px] text-danger-foreground">
                            {getRiskFieldError(risk.id, "meioPropagacao")}
                          </p>
                        ) : null}
                      </div>
                      <div className={formGroupClass}>
                        <label className="text-[12px] font-medium text-foreground">
                          Fontes/Circunstâncias *
                        </label>
                        <div className="relative" data-multiselect>
                          <div
                            className={getRiskFieldClassName(
                              risk.id,
                              "fontes",
                              `${selectSmallClass.replace("h-[38px] ", "").replace("h-[40px] ", "")} min-h-[56px] py-2 pr-10`
                            )}
                            onClick={() =>
                              setOpenMultiSelect((prev) =>
                                prev?.riskId === risk.id && prev.field === "fontes"
                                  ? null
                                  : { riskId: risk.id, field: "fontes" }
                              )
                            }
                          >
                            <textarea
                              rows={3}
                              className="w-full resize-y border-0 bg-transparent p-0 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                              value={fontesDisplayValue}
                              placeholder="Digite ou altere fontes manuais"
                              onChange={(event) => {
                                markRiskTouched(risk.id, "fontes");
                                const rawValue = event.target.value;
                                const preservedCatalogPrefix = selectedFontesCatalog.join(", ");
                                if (preservedCatalogPrefix) {
                                  if (rawValue === preservedCatalogPrefix) {
                                    handleCustomFontesChange(risk, "");
                                    return;
                                  }

                                  const expectedPrefix = `${preservedCatalogPrefix}, `;
                                  if (!rawValue.startsWith(expectedPrefix)) {
                                    return;
                                  }

                                  handleCustomFontesChange(
                                    risk,
                                    rawValue.slice(expectedPrefix.length)
                                  );
                                  return;
                                }
                                handleCustomFontesChange(risk, rawValue);
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMultiSelect((prev) =>
                                  prev?.riskId === risk.id && prev.field === "fontes"
                                    ? null
                                    : { riskId: risk.id, field: "fontes" }
                                );
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            aria-label="Abrir seleção de fontes"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() =>
                              setOpenMultiSelect((prev) =>
                                prev?.riskId === risk.id && prev.field === "fontes"
                                  ? null
                                  : { riskId: risk.id, field: "fontes" }
                              )
                            }
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                openMultiSelect?.riskId === risk.id &&
                                openMultiSelect.field === "fontes"
                                  ? "rotate-180"
                                  : "rotate-0"
                              }`}
                            />
                          </button>
                          {openMultiSelect?.riskId === risk.id &&
                          openMultiSelect.field === "fontes" ? (
                            <div className="absolute z-20 mt-2 w-full rounded-[10px] border border-border bg-popover p-2 shadow-md">
                              <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                  className={`${inputInlineClass} pl-8`}
                                  value={multiSelectQuery}
                                  onChange={(event) => setMultiSelectQuery(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (!canAddCustomFonte || event.key !== "Enter") return;
                                    event.preventDefault();
                                    setPersistedOptionsByRowId((prev) => {
                                      const key = getPersistedFonteKey(risk.id);
                                      const existing = prev[key] || [];
                                      return hasOptionInsensitive(existing, customFonteValue)
                                        ? prev
                                        : {
                                            ...prev,
                                            [key]: [...existing, customFonteValue],
                                          };
                                    });
                                    markRiskTouched(risk.id, "fontes");
                                    handleToggleRiskMultiSelect(
                                      risk.id,
                                      "fontes",
                                      customFonteValue,
                                      fontesOptions
                                    );
                                    setMultiSelectQuery("");
                                  }}
                                  placeholder="Filtrar ou adicionar fonte"
                                />
                              </div>
                              {customFonteValue ? (
                                canAddCustomFonte ? (
                                  <button
                                    type="button"
                                    className="mb-2 w-full rounded-[6px] border border-border px-2 py-1 text-left text-[12px] text-foreground hover:bg-muted"
                                    onClick={() => {
                                      setPersistedOptionsByRowId((prev) => {
                                        const key = getPersistedFonteKey(risk.id);
                                        const existing = prev[key] || [];
                                        return hasOptionInsensitive(existing, customFonteValue)
                                          ? prev
                                          : {
                                              ...prev,
                                              [key]: [...existing, customFonteValue],
                                            };
                                      });
                                      markRiskTouched(risk.id, "fontes");
                                      handleToggleRiskMultiSelect(
                                        risk.id,
                                        "fontes",
                                        customFonteValue,
                                        fontesOptions
                                      );
                                      setMultiSelectQuery("");
                                    }}
                                  >
                                    {`Adicionar "${customFonteValue}"`}
                                  </button>
                                ) : (
                                  <p className="mb-2 rounded-[6px] border border-border/70 bg-muted/50 px-2 py-1 text-[12px] text-muted-foreground">
                                    Esta fonte já existe na lista.
                                  </p>
                                )
                              ) : (
                                <p className="mb-2 rounded-[6px] border border-dashed border-border/70 bg-muted/30 px-2 py-1 text-[12px] text-muted-foreground">
                                  Digite para adicionar uma nova fonte.
                                </p>
                              )}
                              <div className="max-h-44 space-y-1 overflow-auto">
                                {filteredFontesOptions.length ? (
                                  filteredFontesOptions.map((option) => {
                                    const isChecked = selectedFontes.includes(option);
                                    return (
                                      <label
                                        key={`${risk.id}-fontes-${option}`}
                                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-[12px] hover:bg-muted"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            markRiskTouched(risk.id, "fontes");
                                            handleToggleRiskMultiSelect(
                                              risk.id,
                                              "fontes",
                                              option,
                                              fontesOptions
                                            );
                                          }}
                                        />
                                        <span>{option}</span>
                                      </label>
                                    );
                                  })
                                ) : (
                                  <p className="px-2 py-1 text-[12px] text-muted-foreground">
                                    Nenhuma fonte encontrada.
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        {getRiskFieldError(risk.id, "fontes") ? (
                          <p className="mt-1 text-[12px] text-danger-foreground">
                            {getRiskFieldError(risk.id, "fontes")}
                          </p>
                        ) : null}
                      </div>
                      <div className={formGroupClass}>
                        <label className="text-[12px] font-medium text-foreground">
                          Possiveis Agravos
                        </label>
                        <div
                          className={`${selectSmallClass.replace("h-[38px] ", "")} min-h-[40px] whitespace-normal break-words bg-muted/40 py-2 text-muted-foreground leading-5`}
                        >
                          {selectedDanosSaude.length
                            ? selectedDanosSaude.join(", ")
                            : "Preenchido automaticamente pela base de dados"}
                        </div>
                      </div>
                    </div>
                    {hasQuantitativeCriteria ? (
                      <>
                        <div className="mt-4 grid auto-rows-min items-start gap-x-4 gap-y-6 md:grid-cols-4">
                          <div className={formGroupClass}>
                            <label className="text-[12px] font-medium text-foreground">
                              Tipo de Avaliação *
                            </label>
                            <div>
                              <SearchableSelect
                                value={risk.tipoAvaliacao}
                                onChange={(value) => {
                                  markRiskTouched(risk.id, "tipoAvaliacao");
                                  handleRiskChange(risk.id, "tipoAvaliacao", value);
                                }}
                                options={["Qualitativa", "Quantitativa"].map((option) => ({
                                  label: option,
                                  value: option,
                                }))}
                                buttonClassName={getRiskFieldClassName(
                                  risk.id,
                                  "tipoAvaliacao",
                                  selectSmallClass
                                )}
                                searchPlaceholder="Filtrar tipo"
                              />
                            </div>
                            {getRiskFieldError(risk.id, "tipoAvaliacao") ? (
                              <p className="mt-1 text-[12px] text-danger-foreground">
                                {getRiskFieldError(risk.id, "tipoAvaliacao")}
                              </p>
                            ) : null}
                          </div>
                          <div className={formGroupClass}>
                            <label className="text-[12px] font-medium text-foreground">
                              Limite de Tolerância *
                            </label>
                            <input
                              className={getRiskFieldClassName(
                                risk.id,
                                "intensidade",
                                isCalculatedQualitativeEvaluation
                                  ? `${stackedInputClass} bg-muted/40 text-muted-foreground`
                                  : stackedInputClass
                              )}
                              value={displayIntensidade}
                              placeholder={measuredUnitPlaceholder}
                              readOnly={isCalculatedQualitativeEvaluation}
                              onChange={(event) => {
                                if (isCalculatedQualitativeEvaluation) return;
                                markRiskTouched(risk.id, "intensidade");
                                handleRiskChange(
                                  risk.id,
                                  "intensidade",
                                  sanitizeQuantitativeMeasurementInput(event.target.value)
                                );
                              }}
                              onBlur={() => {
                                if (isCalculatedQualitativeEvaluation) return;
                                if (!isQuantitativeEvaluation) return;
                                const currentValue = String(risk.intensidade || "").trim();
                                if (!currentValue) return;
                                const valueWithoutUnit = stripTrailingMeasuredUnit(
                                  currentValue,
                                  measuredUnit
                                );
                                const normalizedValue =
                                  normalizeQuantitativeMeasurementValue(
                                    sanitizeQuantitativeMeasurementInput(valueWithoutUnit)
                                  );

                                if (normalizedValue !== currentValue) {
                                  handleRiskChange(
                                    risk.id,
                                    "intensidade",
                                    normalizedValue
                                  );
                                }
                              }}
                            />
                            {getRiskFieldError(risk.id, "intensidade") ? (
                              <p className="mt-1 text-[12px] text-danger-foreground">
                                {getRiskFieldError(risk.id, "intensidade")}
                              </p>
                            ) : null}
                          </div>
                          <div className={formGroupClass}>
                            <label className="text-[12px] font-medium text-foreground">
                              Nível de Ação
                            </label>
                            <input
                              className={
                                isCalculatedQualitativeEvaluation
                                  ? `${stackedInputClass} bg-muted/40 text-muted-foreground`
                                  : stackedInputClass
                              }
                              value={displayNivelAcao}
                              placeholder={measuredUnitPlaceholder}
                              readOnly={isCalculatedQualitativeEvaluation}
                              onChange={(event) => {
                                if (isCalculatedQualitativeEvaluation) return;
                                handleRiskChange(
                                  risk.id,
                                  "nivelAcao",
                                  sanitizeQuantitativeMeasurementInput(event.target.value)
                                );
                              }}
                              onBlur={() => {
                                if (isCalculatedQualitativeEvaluation) return;
                                if (!isQuantitativeEvaluation) return;
                                const currentValue = String(risk.nivelAcao || "").trim();
                                if (!currentValue) return;
                                const valueWithoutUnit = stripTrailingMeasuredUnit(
                                  currentValue,
                                  measuredUnit
                                );
                                const normalizedValue =
                                  normalizeQuantitativeMeasurementValue(
                                    sanitizeQuantitativeMeasurementInput(valueWithoutUnit)
                                  );

                                if (normalizedValue !== currentValue) {
                                  handleRiskChange(
                                    risk.id,
                                    "nivelAcao",
                                    normalizedValue
                                  );
                                }
                              }}
                            />
                          </div>
                          {!isCalculatedQualitativeEvaluation ? (
                            <div className={formGroupClass}>
                              <label className="text-[12px] font-medium text-foreground">
                                Unidade de Medida *
                              </label>
                              <div>
                                <div className="relative" data-multiselect>
                                  <button
                                    type="button"
                                    className={`${selectSmallClass} flex items-center justify-between text-left`}
                                    onClick={() =>
                                      setOpenMultiSelect((prev) =>
                                        prev?.riskId === risk.id &&
                                        prev.field === "unidadeMedida"
                                          ? null
                                          : { riskId: risk.id, field: "unidadeMedida" }
                                      )
                                    }
                                  >
                                    <span className="truncate">
                                      {selectedMeasuredUnits.length
                                        ? selectedMeasuredUnits.join(", ")
                                        : "Selecione as unidades"}
                                    </span>
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform ${
                                        openMultiSelect?.riskId === risk.id &&
                                        openMultiSelect.field === "unidadeMedida"
                                          ? "rotate-180"
                                          : "rotate-0"
                                      }`}
                                    />
                                  </button>
                                  {openMultiSelect?.riskId === risk.id &&
                                  openMultiSelect.field === "unidadeMedida" ? (
                                    <div className="absolute z-20 mt-2 w-full rounded-[10px] border border-border bg-popover p-2 shadow-md">
                                      <div className="relative mb-2">
                                        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                          className={`${inputInlineClass} pl-8`}
                                          value={multiSelectQuery}
                                          onChange={(event) => setMultiSelectQuery(event.target.value)}
                                          placeholder="Filtrar unidade"
                                        />
                                      </div>
                                      <div className="max-h-44 space-y-1 overflow-auto">
                                        {filteredUnidadeMedidaOptions.length ? (
                                          filteredUnidadeMedidaOptions.map((option) => {
                                            const isChecked = selectedMeasuredUnits.includes(option);
                                            return (
                                              <label
                                                key={`${risk.id}-unidade-${option}`}
                                                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-[12px] hover:bg-muted"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => {
                                                    markRiskTouched(risk.id, "unidadeMedida");
                                                    handleToggleRiskMultiSelect(
                                                      risk.id,
                                                      "unidadeMedida",
                                                      option,
                                                      unidadeMedidaOptions
                                                    );
                                                  }}
                                                />
                                                <span>{option}</span>
                                              </label>
                                            );
                                          })
                                        ) : (
                                          <p className="px-2 py-1 text-[12px] text-muted-foreground">
                                            Nenhuma unidade encontrada.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-4 grid auto-rows-min items-start gap-x-4 gap-y-6 md:grid-cols-4">
                          <div className={formGroupClass}>
                            <label className="text-[12px] font-medium text-foreground">
                              Valor Medido *
                            </label>
                            {isQualitativeEvaluation ? (
                              <input
                                className={stackedInputClass}
                                value={qualitativeMeasuredValueLabel}
                                disabled
                              />
                            ) : (
                              <div className="relative" data-multiselect>
                                <input
                                  className={`${getRiskFieldClassName(
                                    risk.id,
                                    "valorMedido",
                                    stackedInputClass
                                  )} pr-10`}
                                  value={normalizedValorMedido}
                                  placeholder={
                                    isMeasuredValueMissing
                                      ? "Valor medido é obrigatório para avaliação quantitativa"
                                      : allowMeasuredValueShortcut
                                        ? "N/D, <LQ ou 80,5"
                                        : "80,5"
                                  }
                                  inputMode="text"
                                  onChange={(event) => {
                                    setOpenMultiSelect(null);
                                    handleRiskChange(
                                      risk.id,
                                      "valorMedido",
                                      sanitizeMeasuredValueInput(event.target.value)
                                    );
                                  }}
                                  onBlur={() => {
                                    if (!isQuantitativeEvaluation) return;
                                    const currentValue = String(risk.valorMedido || "").trim();
                                    if (!currentValue) return;
                                    const valueWithoutUnit = stripTrailingMeasuredUnit(
                                      currentValue,
                                      measuredUnit
                                    );
                                    const normalizedValue =
                                      normalizeMeasuredValue(
                                        sanitizeMeasuredValueInput(valueWithoutUnit)
                                      );

                                    if (normalizedValue !== currentValue) {
                                      handleRiskChange(
                                        risk.id,
                                        "valorMedido",
                                        normalizedValue
                                      );
                                    }
                                  }}
                                  disabled={!isQuantitativeEvaluation}
                                />
                                {allowMeasuredValueShortcut ? (
                                  <>
                                    <button
                                      type="button"
                                      aria-label="Abrir seleção de valor medido"
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                      onClick={() =>
                                        setOpenMultiSelect((prev) =>
                                          prev?.riskId === risk.id &&
                                          prev.field === "valorMedido"
                                            ? null
                                            : { riskId: risk.id, field: "valorMedido" }
                                        )
                                      }
                                      disabled={!isQuantitativeEvaluation}
                                    >
                                      <ChevronDown
                                        className={`h-4 w-4 transition-transform ${
                                          openMultiSelect?.riskId === risk.id &&
                                          openMultiSelect.field === "valorMedido"
                                            ? "rotate-180"
                                            : "rotate-0"
                                        }`}
                                      />
                                    </button>
                                    {openMultiSelect?.riskId === risk.id &&
                                    openMultiSelect.field === "valorMedido" ? (
                                      <div className="absolute z-20 mt-2 w-full rounded-[10px] border border-border bg-popover p-2 shadow-md">
                                        <div className="space-y-1">
                                          {MEASURED_VALUE_OPTIONS.map((option) => (
                                            <button
                                              key={`${risk.id}-valor-medido-${option}`}
                                              type="button"
                                              className="w-full rounded-[6px] px-2 py-1 text-left text-[12px] text-foreground hover:bg-muted"
                                              onClick={() => {
                                                markRiskTouched(risk.id, "valorMedido");
                                                handleRiskChange(risk.id, "valorMedido", option);
                                                setOpenMultiSelect(null);
                                              }}
                                            >
                                              {option}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </>
                                ) : null}
                              </div>
                            )}
                            {isQuantitativeEvaluation &&
                            getRiskFieldError(risk.id, "valorMedido") ? (
                              <p className="mt-1 text-[12px] text-danger-foreground">
                                {getRiskFieldError(risk.id, "valorMedido")}
                              </p>
                            ) : null}
                          </div>
                          <div className={formGroupClass}>
                            <label className="text-[12px] font-medium text-foreground">
                              Severidade *
                            </label>
                            <input
                              className={getRiskFieldClassName(
                                risk.id,
                                "severidade",
                                stackedInputClass
                              )}
                              value={risk.severidade}
                              disabled
                            />
                            {getRiskFieldError(risk.id, "severidade") ? (
                              <p className="mt-1 text-[12px] text-danger-foreground">
                                {getRiskFieldError(risk.id, "severidade")}
                              </p>
                            ) : null}
                          </div>
                          <div className={formGroupClass}>
                            <label className="text-[12px] font-medium text-foreground">
                              Probabilidade{isQuantitativeEvaluation ? "" : " *"}
                            </label>
                            {isQuantitativeEvaluation ? (
                              <input
                                className={stackedInputClass}
                                value={risk.probabilidade}
                                placeholder="Nível calculado"
                                disabled
                              />
                            ) : (
                              <div>
                                <SearchableSelect
                                  value={risk.probabilidade}
                                  onChange={(value) => {
                                    markRiskTouched(risk.id, "probabilidade");
                                    markRiskTouched(risk.id, "severidade");
                                    markRiskTouched(risk.id, "classificacao");
                                    handleRiskChange(risk.id, "probabilidade", value);
                                  }}
                                  options={PROBABILIDADE_OPTIONS.map((option) => ({
                                    label: option,
                                    value: option,
                                  }))}
                                  buttonClassName={getRiskFieldClassName(
                                    risk.id,
                                    "probabilidade",
                                    selectSmallClass
                                  )}
                                  searchPlaceholder="Filtrar probabilidade"
                                />
                              </div>
                            )}
                            {isQuantitativeEvaluation ? (
                              <p className="mt-1 text-[12px] text-muted-foreground">
                                Esse campo é calculado automaticamente
                              </p>
                            ) : getRiskFieldError(risk.id, "probabilidade") ? (
                              <p className="mt-1 text-[12px] text-danger-foreground">
                                {getRiskFieldError(risk.id, "probabilidade")}
                              </p>
                            ) : null}
                          </div>
                          <div className={formGroupClass}>
                            <label className="text-[12px] font-medium text-foreground">
                              Classificação de Risco
                            </label>
                            <input
                              className={stackedInputClass}
                              value={risk.classificacao}
                              onChange={(event) =>
                                handleRiskChange(risk.id, "classificacao", event.target.value)
                              }
                              disabled
                            />
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              Esse campo é gerado automaticamente
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 grid auto-rows-min items-start gap-x-4 gap-y-6 md:grid-cols-4">
                        <div className={formGroupClass}>
                          <label className="text-[12px] font-medium text-foreground">
                            Tipo de Avaliação *
                          </label>
                          <input
                            className={getRiskFieldClassName(
                              risk.id,
                              "tipoAvaliacao",
                              stackedInputClass
                            )}
                            value={risk.tipoAvaliacao}
                            disabled
                          />
                          {getRiskFieldError(risk.id, "tipoAvaliacao") ? (
                            <p className="mt-1 text-[12px] text-danger-foreground">
                              {getRiskFieldError(risk.id, "tipoAvaliacao")}
                            </p>
                          ) : null}
                        </div>
                        <div className={formGroupClass}>
                          <label className="text-[12px] font-medium text-foreground">
                            Severidade *
                          </label>
                          <input
                            className={getRiskFieldClassName(
                              risk.id,
                              "severidade",
                              stackedInputClass
                            )}
                            value={risk.severidade}
                            disabled
                          />
                          {getRiskFieldError(risk.id, "severidade") ? (
                            <p className="mt-1 text-[12px] text-danger-foreground">
                              {getRiskFieldError(risk.id, "severidade")}
                            </p>
                          ) : null}
                        </div>
                        <div className={formGroupClass}>
                          <label className="text-[12px] font-medium text-foreground">
                            Probabilidade *
                          </label>
                          <div>
                            <SearchableSelect
                              value={risk.probabilidade}
                              onChange={(value) => {
                                markRiskTouched(risk.id, "probabilidade");
                                markRiskTouched(risk.id, "severidade");
                                markRiskTouched(risk.id, "classificacao");
                                handleRiskChange(risk.id, "probabilidade", value);
                              }}
                              options={PROBABILIDADE_OPTIONS.map((option) => ({
                                label: option,
                                value: option,
                              }))}
                              buttonClassName={getRiskFieldClassName(
                                risk.id,
                                "probabilidade",
                                selectSmallClass
                              )}
                              searchPlaceholder="Filtrar probabilidade"
                            />
                          </div>
                          {getRiskFieldError(risk.id, "probabilidade") ? (
                            <p className="mt-1 text-[12px] text-danger-foreground">
                              {getRiskFieldError(risk.id, "probabilidade")}
                            </p>
                          ) : null}
                        </div>
                        <div className={formGroupClass}>
                          <label className="text-[12px] font-medium text-foreground">
                            Classificação de Risco
                          </label>
                          <input
                            className={stackedInputClass}
                            value={risk.classificacao}
                            onChange={(event) =>
                              handleRiskChange(risk.id, "classificacao", event.target.value)
                            }
                            disabled
                          />
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            Esse campo é calculado automaticamente
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="mt-8">
                      <p className="text-[13px] font-semibold text-foreground">
                        Medidas de prevenção
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                          <label className="text-[12px] font-medium text-foreground">
                            Medidas de Controle Administrativas e/ou de Engenharia
                          </label>
                          <div className="relative mt-2" data-multiselect>
                            <button
                              type="button"
                              className={getRiskFieldClassName(
                                risk.id,
                                "medidasControle",
                                `${selectSmallClass} flex items-center justify-between text-left`
                              )}
                              onClick={() =>
                                setOpenMultiSelect((prev) =>
                                  prev?.riskId === risk.id &&
                                  prev.field === "medidasControle"
                                    ? null
                                    : { riskId: risk.id, field: "medidasControle" }
                                )
                              }
                            >
                              <span className="truncate">
                                {selectedMedidasControle.length
                                  ? selectedMedidasControle.join(", ")
                                  : "Selecione as medidas"}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  openMultiSelect?.riskId === risk.id &&
                                  openMultiSelect.field === "medidasControle"
                                    ? "rotate-180"
                                    : "rotate-0"
                                }`}
                              />
                            </button>
                            {openMultiSelect?.riskId === risk.id &&
                            openMultiSelect.field === "medidasControle" ? (
                              <div className="absolute z-20 mt-2 w-full rounded-[10px] border border-border bg-popover p-2 shadow-md">
                                <div className="relative mb-2">
                                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <input
                                    className={`${inputInlineClass} pl-8`}
                                    value={multiSelectQuery}
                                    onChange={(event) => setMultiSelectQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (!canAddCustomMedida || event.key !== "Enter") return;
                                      event.preventDefault();
                                      markRiskTouched(risk.id, "medidasControle");
                                      handleToggleRiskMultiSelect(
                                        risk.id,
                                        "medidasControle",
                                        customMedidaValue,
                                        medidasControleOptions
                                      );
                                      setMultiSelectQuery("");
                                    }}
                                    placeholder="Filtrar ou adicionar medida"
                                  />
                                </div>
                                {customMedidaValue ? (
                                  canAddCustomMedida ? (
                                    <button
                                      type="button"
                                      className="mb-2 w-full rounded-[6px] border border-border px-2 py-1 text-left text-[12px] text-foreground hover:bg-muted"
                                      onClick={() => {
                                        markRiskTouched(risk.id, "medidasControle");
                                        handleToggleRiskMultiSelect(
                                          risk.id,
                                          "medidasControle",
                                          customMedidaValue,
                                          medidasControleOptions
                                        );
                                        setMultiSelectQuery("");
                                      }}
                                    >
                                      {`Adicionar "${customMedidaValue}"`}
                                    </button>
                                  ) : (
                                    <p className="mb-2 rounded-[6px] border border-border/70 bg-muted/50 px-2 py-1 text-[12px] text-muted-foreground">
                                      Esta medida já existe na lista.
                                    </p>
                                  )
                                ) : (
                                  <p className="mb-2 rounded-[6px] border border-dashed border-border/70 bg-muted/30 px-2 py-1 text-[12px] text-muted-foreground">
                                    Digite para adicionar uma nova medida.
                                  </p>
                                )}
                                <div className="max-h-44 space-y-1 overflow-auto">
                                  {filteredMedidasControleOptions.length ? (
                                    filteredMedidasControleOptions.map((option) => {
                                      const isChecked = selectedMedidasControle.includes(option);
                                      return (
                                        <label
                                          key={`${risk.id}-medidas-${option}`}
                                          className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-[12px] hover:bg-muted"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              markRiskTouched(risk.id, "medidasControle");
                                              handleToggleRiskMultiSelect(
                                                risk.id,
                                                "medidasControle",
                                                option,
                                                medidasControleOptions
                                              );
                                            }}
                                          />
                                          <span>{option}</span>
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <p className="px-2 py-1 text-[12px] text-muted-foreground">
                                      Nenhuma medida encontrada.
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          {getRiskFieldError(risk.id, "medidasControle") ? (
                            <p className="mt-1 text-[12px] text-danger-foreground">
                              {getRiskFieldError(risk.id, "medidasControle")}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            EPC
                          </label>
                          <div className="relative mt-2" data-multiselect>
                            <button
                              type="button"
                              className={getRiskFieldClassName(
                                risk.id,
                                "epc",
                                `${selectSmallClass} flex items-center justify-between text-left`
                              )}
                              onClick={() =>
                                setOpenMultiSelect((prev) =>
                                  prev?.riskId === risk.id && prev.field === "epc"
                                    ? null
                                    : { riskId: risk.id, field: "epc" }
                                )
                              }
                            >
                              <span className="truncate">
                                {selectedEpc.length
                                  ? selectedEpc.join(", ")
                                  : "Selecione EPC"}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  openMultiSelect?.riskId === risk.id &&
                                  openMultiSelect.field === "epc"
                                    ? "rotate-180"
                                    : "rotate-0"
                                }`}
                              />
                            </button>
                            {openMultiSelect?.riskId === risk.id &&
                            openMultiSelect.field === "epc" ? (
                              <div className="absolute z-20 mt-2 w-full rounded-[10px] border border-border bg-popover p-2 shadow-md">
                                <div className="relative mb-2">
                                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <input
                                    className={`${inputInlineClass} pl-8`}
                                    value={multiSelectQuery}
                                    onChange={(event) => setMultiSelectQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (!canAddCustomEpc || event.key !== "Enter") return;
                                      event.preventDefault();
                                      markRiskTouched(risk.id, "epc");
                                      handleToggleRiskMultiSelect(
                                        risk.id,
                                        "epc",
                                        customEpcValue,
                                        epcOptions
                                      );
                                      setMultiSelectQuery("");
                                    }}
                                    placeholder="Filtrar ou adicionar EPC"
                                  />
                                </div>
                                {customEpcValue ? (
                                  canAddCustomEpc ? (
                                    <button
                                      type="button"
                                      className="mb-2 w-full rounded-[6px] border border-border px-2 py-1 text-left text-[12px] text-foreground hover:bg-muted"
                                      onClick={() => {
                                        markRiskTouched(risk.id, "epc");
                                        handleToggleRiskMultiSelect(
                                          risk.id,
                                          "epc",
                                          customEpcValue,
                                          epcOptions
                                        );
                                        setMultiSelectQuery("");
                                      }}
                                    >
                                      {`Adicionar "${customEpcValue}"`}
                                    </button>
                                  ) : (
                                    <p className="mb-2 rounded-[6px] border border-border/70 bg-muted/50 px-2 py-1 text-[12px] text-muted-foreground">
                                      Este EPC já existe na lista.
                                    </p>
                                  )
                                ) : (
                                  <p className="mb-2 rounded-[6px] border border-dashed border-border/70 bg-muted/30 px-2 py-1 text-[12px] text-muted-foreground">
                                    Digite para adicionar um novo EPC.
                                  </p>
                                )}
                                <div className="max-h-44 space-y-1 overflow-auto">
                                  {filteredEpcOptions.length ? (
                                    filteredEpcOptions.map((option) => {
                                      const isChecked = selectedEpc.includes(option);
                                      return (
                                        <label
                                          key={`${risk.id}-epc-${option}`}
                                          className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-[12px] hover:bg-muted"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              markRiskTouched(risk.id, "epc");
                                              handleToggleRiskMultiSelect(risk.id, "epc", option, epcOptions);
                                            }}
                                          />
                                          <span>{option}</span>
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <p className="px-2 py-1 text-[12px] text-muted-foreground">
                                      Nenhum EPC encontrado.
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          {getRiskFieldError(risk.id, "epc") ? (
                            <p className="mt-1 text-[12px] text-danger-foreground">
                              {getRiskFieldError(risk.id, "epc")}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            EPI
                          </label>
                          <div className="relative mt-2" data-multiselect>
                            <button
                              type="button"
                              className={getRiskFieldClassName(
                                risk.id,
                                "epi",
                                `${selectSmallClass} flex items-center justify-between text-left`
                              )}
                              onClick={() =>
                                setOpenMultiSelect((prev) =>
                                  prev?.riskId === risk.id && prev.field === "epi"
                                    ? null
                                    : { riskId: risk.id, field: "epi" }
                                )
                              }
                            >
                              <span className="truncate">
                                {selectedEpi.length
                                  ? selectedEpi.join(", ")
                                  : "Selecione EPI"}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  openMultiSelect?.riskId === risk.id &&
                                  openMultiSelect.field === "epi"
                                    ? "rotate-180"
                                    : "rotate-0"
                                }`}
                              />
                            </button>
                            {openMultiSelect?.riskId === risk.id &&
                            openMultiSelect.field === "epi" ? (
                              <div className="absolute z-20 mt-2 w-full rounded-[10px] border border-border bg-popover p-2 shadow-md">
                                <div className="relative mb-2">
                                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <input
                                    className={`${inputInlineClass} pl-8`}
                                    value={multiSelectQuery}
                                    onChange={(event) => setMultiSelectQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (!canAddCustomEpi || event.key !== "Enter") return;
                                      event.preventDefault();
                                      markRiskTouched(risk.id, "epi");
                                      handleToggleRiskMultiSelect(
                                        risk.id,
                                        "epi",
                                        customEpiValue,
                                        epiOptions
                                      );
                                      setMultiSelectQuery("");
                                    }}
                                    placeholder="Filtrar ou adicionar EPI"
                                  />
                                </div>
                                {customEpiValue ? (
                                  canAddCustomEpi ? (
                                    <button
                                      type="button"
                                      className="mb-2 w-full rounded-[6px] border border-border px-2 py-1 text-left text-[12px] text-foreground hover:bg-muted"
                                      onClick={() => {
                                        markRiskTouched(risk.id, "epi");
                                        handleToggleRiskMultiSelect(
                                          risk.id,
                                          "epi",
                                          customEpiValue,
                                          epiOptions
                                        );
                                        setMultiSelectQuery("");
                                      }}
                                    >
                                      {`Adicionar "${customEpiValue}"`}
                                    </button>
                                  ) : (
                                    <p className="mb-2 rounded-[6px] border border-border/70 bg-muted/50 px-2 py-1 text-[12px] text-muted-foreground">
                                      Este EPI já existe na lista.
                                    </p>
                                  )
                                ) : (
                                  <p className="mb-2 rounded-[6px] border border-dashed border-border/70 bg-muted/30 px-2 py-1 text-[12px] text-muted-foreground">
                                    Digite para adicionar um novo EPI.
                                  </p>
                                )}
                                <div className="max-h-44 space-y-1 overflow-auto">
                                  {filteredEpiOptions.length ? (
                                    filteredEpiOptions.map((option) => {
                                      const isChecked = selectedEpi.includes(option);
                                      return (
                                        <label
                                          key={`${risk.id}-epi-${option}`}
                                          className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-[12px] hover:bg-muted"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              markRiskTouched(risk.id, "epi");
                                              handleToggleRiskMultiSelect(risk.id, "epi", option, epiOptions);
                                            }}
                                          />
                                          <span>{option}</span>
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <p className="px-2 py-1 text-[12px] text-muted-foreground">
                                      Nenhum EPI encontrado.
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          {getRiskFieldError(risk.id, "epi") ? (
                            <p className="mt-1 text-[12px] text-danger-foreground">
                              {getRiskFieldError(risk.id, "epi")}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            C.A
                          </label>
                          <input
                            className={`${stackedInputClass} mt-2`}
                            value={risk.ca || ""}
                            placeholder="Número do C.A"
                            onChange={(event) =>
                              handleRiskChange(risk.id, "ca", event.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()
        ))
      ) : (
        <div className="rounded-[12px] border border-dashed border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
          Nenhum risco cadastrado neste GHE.
        </div>
      )}
      {shouldPaginateRiskList && hiddenRiskCount > 0 ? (
        <button
          type="button"
          onClick={() => setVisibleRiskCount((prev) => prev + PROGRESSIVE_BATCH_SIZE)}
          className="btn-outline px-4 py-2 text-[12px]"
        >
          Carregar mais riscos ({hiddenRiskCount} restantes)
        </button>
      ) : null}
    </div>
  );

  useEffect(() => {
    if (pendingReviewFocus?.stepId !== "caracterizacao") return;
    if (pendingReviewFocus.gheId) {
      setCurrentRiskGheId(pendingReviewFocus.gheId);
    }
    setTimeout(() => {
      if (pendingReviewFocus.riskId) {
        const riskCard = document.querySelector<HTMLElement>(
          `[data-risk-id="${pendingReviewFocus.riskId}"]`
        );
        if (riskCard) {
          riskCard.scrollIntoView({ behavior: "smooth", block: "center" });
          const firstField = pendingReviewFocus.fieldKey
            ? riskCard.querySelector<HTMLElement>(
                `[data-pending-field="${pendingReviewFocus.fieldKey}"]`
              )
            : null;
          firstField?.focus?.();
          return;
        }
      }
      const section = document.querySelector<HTMLElement>("[data-pending-section='risk-list']");
      section?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, [pendingReviewFocus, setCurrentRiskGheId]);

  return (
    <>
      <section className="px-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Caracterização de Risco
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Cadastre e gerencie os riscos identificados no GHE
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="btn-outline border-danger-foreground/40 px-4 text-danger-foreground hover:bg-danger"
            >
              Limpar dados da etapa
            </button>
          </div>
        </div>
      </section>

      {pendingReviewFocus?.stepId === "caracterizacao" ? (
        <section className="rounded-[12px] border border-warning-foreground/30 bg-warning px-4 py-3 text-[13px] text-warning-foreground">
          Pendência destacada: {pendingReviewFocus.message}
        </section>
      ) : null}

      {gheFunctionPreview && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={gheFunctionPreviewRef}
              id="ghe-function-preview"
              role="tooltip"
              onMouseEnter={keepGheFunctionPreviewOpen}
              onMouseLeave={hideGheFunctionPreview}
              onWheel={handleGheFunctionPreviewWheel}
              className="fixed z-[100] w-[min(320px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-[8px] border border-border/70 bg-popover p-4 text-popover-foreground shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
              style={{
                position: "fixed",
                left: gheFunctionPreview.left,
                top: gheFunctionPreview.top,
                bottom: gheFunctionPreview.bottom,
                maxHeight: gheFunctionPreview.maxHeight,
              }}
            >
              <p className="text-[13px] font-semibold text-foreground">
                {riskGheGroups.find((ghe) => ghe.id === gheFunctionPreview.gheId)?.name ??
                  "GHE"}
              </p>
              <p className="mt-1 border-b border-border/60 pb-2 text-[11px] text-muted-foreground">
                Setores e funções associadas
              </p>
              <div className="mt-3 divide-y divide-border/60">
                {(gheFunctionSummaries.get(gheFunctionPreview.gheId) ?? []).length ? (
                  (gheFunctionSummaries.get(gheFunctionPreview.gheId) ?? []).map((group) => (
                    <div key={group.setor} className="py-3 first:pt-0 last:pb-0">
                      <p className="whitespace-normal text-[12px] text-foreground [hyphens:none] [overflow-wrap:normal] [word-break:normal]">
                        <span className="font-semibold">Setor:</span> {group.setor}
                      </p>
                      <p className="mt-1 whitespace-normal text-[12px] leading-relaxed text-muted-foreground [hyphens:none] [overflow-wrap:normal] [word-break:normal]">
                        <span className="font-semibold text-foreground">
                          Funções associadas:
                        </span>{" "}
                        {group.funcoes.join("; ")}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    Nenhum setor ou função associado a este GHE.
                  </p>
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      <section
        className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60"
        data-pending-section="risk-list"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-foreground">
              Riscos atribuídos a um GHE
            </p>
            <p className="text-[12px] text-muted-foreground">
              Selecione o GHE para editar os riscos vinculados
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
              {currentRiskGhe?.name ?? "GHE"}
            </span>
            <div ref={copyMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCopyMenuOpen((prev) => !prev)}
                disabled={!copySourceGhesWithRisks.length}
                className={
                  copySourceGhesWithRisks.length ? "btn-outline px-4" : "btn-disabled px-4"
                }
              >
                Copiar Estrutura do GHE
              </button>
              {isCopyMenuOpen ? (
                <div className="absolute right-0 z-10 mt-2 w-72 rounded-[12px] border border-border/70 bg-card p-3 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                  <p className="text-[12px] font-semibold text-foreground">
                    Copiar estrutura para{" "}
                    <span className="font-semibold text-foreground">
                      {currentRiskGhe?.name ?? "GHE"}
                    </span>
                  </p>
                  <div className="mt-2 max-h-[220px] space-y-2 overflow-auto pr-1">
                    {visibleCopySourceGhes.map((ghe: RiskGheGroup) => (
                      <button
                        key={ghe.id}
                        type="button"
                        onClick={() => handleCopyRiskStructure(ghe.id)}
                        className="flex w-full items-center justify-between rounded-[10px] border border-border/60 px-3 py-2 text-left text-[12px] text-foreground hover:bg-muted/60"
                      >
                        <span>
                          {ghe.name} → {currentRiskGhe?.name ?? "GHE"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {ghe.risks.length} riscos
                        </span>
                      </button>
                    ))}
                    {shouldPaginateCopySources && hiddenCopySourceCount > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleCopySourceCount(
                            (prev) => prev + PROGRESSIVE_BATCH_SIZE
                          )
                        }
                        className="btn-outline w-full px-3 py-2 text-[12px]"
                      >
                        Carregar mais fontes ({hiddenCopySourceCount} restantes)
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setRiskOverviewGheFilterId(currentRiskGhe?.id ?? "all");
                setRiskOverviewSearch("");
                setIsRiskOverviewModalOpen(true);
              }}
              className="btn-primary px-4"
            >
              Ver Riscos
            </button>
            <button
              type="button"
              onClick={() => {
                setBatchRiskSearch("");
                setBatchGheSearch("");
                setSelectedBatchGheIds([]);
                setBatchAssignFeedback("");
                setSelectedBatchRiskKeys(
                  currentRiskGhe?.risks[0]
                    ? [getRiskContentKey(currentRiskGhe.risks[0])]
                    : []
                );
                setIsBatchAssignModalOpen(true);
              }}
              className="btn-outline px-4"
            >
              Atribuir risco em lote
            </button>
            <button
              type="button"
              onClick={handleToggleAllRisks}
              disabled={!currentRiskList.length}
              className={currentRiskList.length ? "btn-outline px-4" : "btn-disabled px-4"}
            >
              {allCurrentRisksMinimized ? "Expandir todos os riscos" : "Minimizar todos os riscos"}
            </button>
            <button
              type="button"
              onClick={handleToggleAllRiskSelection}
              disabled={!currentRiskList.length}
              className={currentRiskList.length ? "btn-outline px-4" : "btn-disabled px-4"}
            >
              {allCurrentRisksSelected ? "Limpar seleção" : "Selecionar todos"}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteSelectedRisksModalOpen(true)}
              disabled={!selectedRiskIds.length}
              className={
                selectedRiskIds.length
                  ? "btn-outline px-4 text-danger-foreground hover:bg-danger/10"
                  : "btn-disabled px-4"
              }
            >
              Excluir selecionados ({selectedRiskIds.length})
            </button>
            <button type="button" onClick={handleAddRisk} className="btn-primary px-4">
              <PlusCircle className="h-4 w-4" />
              Adicionar Risco
            </button>
          </div>
        </div>

        {isManyRiskGhes ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
            <div className="self-start rounded-[12px] border border-border/70 bg-background/40 p-3">
              <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                <span>Lista de GHEs</span>
                <span>
                  {filteredRiskGheGroups.length} de {riskGheGroups.length}
                </span>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={riskGheSearch}
                  onChange={(event) => setRiskGheSearch(event.target.value)}
                  className={`${inputInlineClass} pl-10`}
                  placeholder="Buscar GHE"
                />
              </div>
              <div className="mt-3 max-h-[280px] space-y-2 overflow-auto pr-1">
                {duplicatedRiskStructureGroups.length > 0 ? (
                  <div className="rounded-[10px] border border-warning-foreground/30 bg-warning px-3 py-2">
                    <p className="flex items-center gap-2 text-[12px] font-semibold text-warning-foreground">
                      <TriangleAlert className="h-4 w-4 text-warning-foreground" />
                      Existem GHEs com a mesma caracterização de risco.
                    </p>
                    <p className="mt-1 text-[11px] text-warning-foreground/90">
                      {duplicatedRiskStructureGroups
                        .map((group) => group.gheNames.join(", "))
                        .join(" | ")}
                    </p>
                  </div>
                ) : null}
                {visibleFilteredRiskGheGroups.map((ghe: RiskGheGroup) => (
                  <div key={ghe.id} className="relative">
                    <button
                      type="button"
                      data-ghe-function-preview-trigger
                      onClick={() => setCurrentRiskGheId(ghe.id)}
                      onMouseEnter={(event) =>
                        showGheFunctionPreview(ghe.id, event.currentTarget)
                      }
                      onMouseLeave={hideGheFunctionPreview}
                      onFocus={(event) => showGheFunctionPreview(ghe.id, event.currentTarget)}
                      onBlur={hideGheFunctionPreview}
                      aria-describedby={
                        gheFunctionPreview?.gheId === ghe.id
                          ? "ghe-function-preview"
                          : undefined
                      }
                      className={`w-full rounded-[10px] border py-2 pl-3 pr-[76px] text-left text-[12px] transition ${
                        currentRiskGheId === ghe.id
                          ? duplicatedRiskStructureGheIds.has(ghe.id)
                            ? "border-warning-foreground/60 bg-primary/5"
                            : "border-primary/50 bg-primary/5"
                          : duplicatedRiskStructureGheIds.has(ghe.id)
                            ? "border-warning-foreground/30 bg-background/60 hover:bg-muted/60"
                            : "border-border/70 bg-background/60 hover:bg-muted/60"
                      }`}
                    >
                      <p className="flex items-center gap-1 font-semibold text-foreground">
                        {duplicatedRiskStructureGheIds.has(ghe.id) ? (
                          <TriangleAlert className="h-3.5 w-3.5 text-warning-foreground" />
                        ) : null}
                        {ghe.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {ghe.risks.length} riscos cadastrados
                      </p>
                    </button>
                    {renderRiskGheOrderControls(
                      ghe,
                      "absolute right-2 top-1/2 -translate-y-1/2"
                    )}
                  </div>
                ))}
                {!filteredRiskGheGroups.length ? (
                  <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-4 text-center text-[12px] text-muted-foreground">
                    Nenhum GHE encontrado.
                  </div>
                ) : null}
                {shouldPaginateGheList && hiddenRiskGheCount > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleRiskGheCount((prev) => prev + PROGRESSIVE_BATCH_SIZE)
                    }
                    className="btn-outline w-full px-3 py-2 text-[12px]"
                  >
                    Carregar mais GHEs ({hiddenRiskGheCount} restantes)
                  </button>
                ) : null}
              </div>
            </div>
            <div>{renderRiskCards(false)}</div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-[260px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={riskGheSearch}
                  onChange={(event) => setRiskGheSearch(event.target.value)}
                  className={`${inputInlineClass} pl-10`}
                  placeholder="Buscar GHE"
                />
              </div>
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <span>
                  {filteredRiskGheGroups.length} de {riskGheGroups.length} GHEs
                </span>
              </div>
            </div>
            {duplicatedRiskStructureGroups.length > 0 ? (
              <div className="mt-3 rounded-[10px] border border-warning-foreground/30 bg-warning px-3 py-2">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-warning-foreground">
                  <TriangleAlert className="h-4 w-4 text-warning-foreground" />
                  Existem GHEs com a mesma caracterização de risco.
                </p>
                <p className="mt-1 text-[11px] text-warning-foreground/90">
                  {duplicatedRiskStructureGroups
                    .map((group) => group.gheNames.join(", "))
                    .join(" | ")}
                </p>
              </div>
            ) : null}

            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {visibleFilteredRiskGheGroups.map((ghe: RiskGheGroup) => (
                <div key={ghe.id} className="relative min-w-[170px]">
                  <button
                    type="button"
                    data-ghe-function-preview-trigger
                    onClick={() => setCurrentRiskGheId(ghe.id)}
                    onMouseEnter={(event) =>
                      showGheFunctionPreview(ghe.id, event.currentTarget)
                    }
                    onMouseLeave={hideGheFunctionPreview}
                    onFocus={(event) => showGheFunctionPreview(ghe.id, event.currentTarget)}
                    onBlur={hideGheFunctionPreview}
                    aria-describedby={
                      gheFunctionPreview?.gheId === ghe.id
                        ? "ghe-function-preview"
                        : undefined
                    }
                    className={`h-full w-full rounded-[12px] border px-3 pb-11 pt-2 text-left transition ${
                      currentRiskGheId === ghe.id
                        ? duplicatedRiskStructureGheIds.has(ghe.id)
                          ? "border-warning-foreground/60 bg-primary/5"
                          : "border-primary/50 bg-primary/5"
                        : duplicatedRiskStructureGheIds.has(ghe.id)
                          ? "border-warning-foreground/30 bg-background/40 hover:bg-muted/60"
                          : "border-border/70 bg-background/40 hover:bg-muted/60"
                    }`}
                  >
                    <p className="flex items-center gap-1 text-[12px] font-semibold text-foreground">
                      {duplicatedRiskStructureGheIds.has(ghe.id) ? (
                        <TriangleAlert className="h-3.5 w-3.5 text-warning-foreground" />
                      ) : null}
                      {ghe.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {ghe.risks.length} riscos
                    </p>
                  </button>
                  {renderRiskGheOrderControls(ghe, "absolute bottom-2 right-2")}
                </div>
              ))}
              {!filteredRiskGheGroups.length ? (
                <div className="rounded-[12px] border border-dashed border-border/70 px-4 py-3 text-[12px] text-muted-foreground">
                  Nenhum GHE encontrado.
                </div>
              ) : null}
              {shouldPaginateGheList && hiddenRiskGheCount > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleRiskGheCount((prev) => prev + PROGRESSIVE_BATCH_SIZE)
                  }
                  className="btn-outline min-w-[180px] px-3 py-2 text-[12px]"
                >
                  + {hiddenRiskGheCount} GHEs
                </button>
              ) : null}
            </div>
            {renderRiskCards(true)}
          </>
        )}

        {currentRiskGhe && currentRiskGhe.risks.length >= 1 ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleAddRisk}
              className="btn-primary h-9 w-9 justify-center px-0"
              aria-label="Adicionar risco"
              title="Adicionar risco"
            >
              <PlusCircle className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </section>

      {isBatchAssignModalOpen ? (
        <div className="fixed -inset-6 z-50">
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="flex h-[min(88vh,900px)] w-full max-w-6xl flex-col rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground">
                    Atribuir Risco a Vários GHEs
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Selecione um ou mais riscos na esquerda e marque os GHEs de destino
                    na direita.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBatchAssignModalOpen(false)}
                  className="btn-outline px-3 py-1 text-[12px]"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-6 grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="flex min-h-0 min-w-0 flex-col rounded-[12px] border border-border/70 bg-background/40 px-4 py-4">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={batchRiskSearch}
                      onChange={(event) => setBatchRiskSearch(event.target.value)}
                      className={`${inputInlineClass} pl-10`}
                      placeholder="Buscar risco por GHE, tipo, agente ou classificação"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] text-muted-foreground">
                      {filteredBatchRiskGroups.length} riscos encontrados ·{" "}
                      {selectedBatchRiskKeys.length} selecionado(s)
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBatchRiskKeys((prev) => {
                          const visibleKeys = visibleBatchRiskGroups.map(
                            (group) => group.key
                          );
                          const allSelected =
                            visibleKeys.length > 0 &&
                            visibleKeys.every((key) => prev.includes(key));
                          if (allSelected) {
                            return prev.filter((key) => !visibleKeys.includes(key));
                          }
                          return Array.from(new Set([...prev, ...visibleKeys]));
                        });
                        setBatchAssignFeedback("");
                      }}
                      disabled={!visibleBatchRiskGroups.length}
                      className={
                        visibleBatchRiskGroups.length
                          ? "btn-outline px-3 py-1 text-[12px]"
                          : "btn-disabled px-3 py-1 text-[12px]"
                      }
                    >
                      Marcar riscos visíveis
                    </button>
                  </div>

                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
                    {visibleBatchRiskGroups.length ? (
                      visibleBatchRiskGroups.map((group) => {
                        const isSelected = selectedBatchRiskKeys.includes(group.key);
                        return (
                          <label
                            key={group.key}
                            className={`flex w-full cursor-pointer items-start gap-3 rounded-[10px] border px-3 py-3 text-left ${
                              isSelected
                                ? "border-primary/50 bg-primary/5"
                                : "border-border/60 bg-card hover:bg-muted/60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBatchRiskSelection(group.key)}
                              className="mt-0.5 h-4 w-4 accent-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-foreground">
                                {group.risk.descricaoAgente || "Agente não informado"}
                              </p>
                              <p className="mt-1 text-[12px] text-muted-foreground">
                                Tipo: {group.risk.tipoAgente || "Não informado"} ·
                                Classificação:{" "}
                                {group.risk.classificacao || "Não informada"}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {group.sourceGheNames.map((gheName) => (
                                  <span
                                    key={`${group.key}-${gheName}`}
                                    className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                                  >
                                    {gheName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-6 text-center text-[12px] text-muted-foreground">
                        Nenhum risco para o filtro informado.
                      </div>
                    )}
                    {shouldPaginateBatchRisks && hiddenBatchRiskCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setVisibleBatchRiskCount((prev) => prev + PROGRESSIVE_BATCH_SIZE)}
                        className="btn-outline w-full px-3 py-2 text-[12px]"
                      >
                        Carregar mais riscos ({hiddenBatchRiskCount} restantes)
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-col rounded-[12px] border border-border/70 bg-background/40 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-foreground">GHEs de destino</p>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedBatchGheIds((prev) => {
                          const visibleIds = visibleBatchGhes.map((ghe) => ghe.id);
                          const allSelected =
                            visibleIds.length > 0 &&
                            visibleIds.every((id) => prev.includes(id));
                          if (allSelected) {
                            return prev.filter((id) => !visibleIds.includes(id));
                          }
                          return Array.from(new Set([...prev, ...visibleIds]));
                        })
                      }
                      disabled={
                        !selectedBatchRiskGroups.length || !visibleBatchGhes.length
                      }
                      className={
                        !selectedBatchRiskGroups.length || !visibleBatchGhes.length
                          ? "btn-disabled px-3 py-1 text-[12px]"
                          : "btn-outline px-3 py-1 text-[12px]"
                      }
                    >
                      Marcar visíveis
                    </button>
                  </div>

                  <p className="mt-2 text-[12px] text-muted-foreground">
                    {selectedBatchRiskGroups.length
                      ? `${selectedBatchRiskGroups.length} risco(s) selecionado(s). Riscos já existentes no destino serão ignorados.`
                      : "Selecione ao menos um risco para habilitar os destinos."}
                  </p>

                  <div className="relative mt-3 w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={batchGheSearch}
                      onChange={(event) => setBatchGheSearch(event.target.value)}
                      className={`${inputInlineClass} pl-10`}
                      placeholder="Buscar GHE de destino"
                    />
                  </div>

                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
                    {visibleBatchGhes.length ? (
                      visibleBatchGhes.map((ghe) => (
                        <label
                          key={ghe.id}
                          className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border/60 bg-card px-3 py-3"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-primary"
                            checked={selectedBatchGheIds.includes(ghe.id)}
                            onChange={() => toggleBatchGheSelection(ghe.id)}
                            disabled={!selectedBatchRiskGroups.length}
                          />
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold text-foreground">
                              {ghe.name}
                            </span>
                            <span className="block text-[12px] text-muted-foreground">
                              {ghe.risks.length} riscos cadastrados
                            </span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-6 text-center text-[12px] text-muted-foreground">
                        Nenhum GHE disponível para destino.
                      </div>
                    )}
                    {shouldPaginateBatchGhes && hiddenBatchGheCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setVisibleBatchGheCount((prev) => prev + PROGRESSIVE_BATCH_SIZE)}
                        className="btn-outline w-full px-3 py-2 text-[12px]"
                      >
                        Carregar mais GHEs ({hiddenBatchGheCount} restantes)
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[12px] text-muted-foreground">
                      {selectedBatchGheIds.length} GHE(s) selecionado(s)
                    </p>
                    <button
                      type="button"
                      onClick={handleApplyBatchRiskAssignment}
                      disabled={!selectedBatchRiskGroups.length || !selectedBatchGheIds.length}
                      className={
                        !selectedBatchRiskGroups.length || !selectedBatchGheIds.length
                          ? "btn-disabled px-4"
                          : "btn-primary px-4"
                      }
                    >
                      Atribuir {selectedBatchRiskGroups.length === 1 ? "risco" : "riscos"}
                    </button>
                  </div>
                  {batchAssignFeedback ? (
                    <p className="mt-2 text-[12px] text-muted-foreground">{batchAssignFeedback}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isRiskOverviewModalOpen ? (
        <div className="fixed -inset-6 z-50">
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="flex h-[min(88vh,900px)] w-full max-w-6xl flex-col rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground">
                    Riscos por GHE
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Navegue pelos GHEs e visualize os riscos cadastrados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRiskOverviewModalOpen(false)}
                  className="btn-outline px-3 py-1 text-[12px]"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-6 grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
                <div className="min-h-0 space-y-4 overflow-auto pr-2">
                  <button
                    type="button"
                    onClick={() => setRiskOverviewGheFilterId("all")}
                    className={`w-full rounded-[12px] border px-4 py-4 text-left ${
                      riskOverviewGheFilterId === "all"
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/70 bg-background/40"
                    }`}
                  >
                    <p className="text-[14px] font-semibold text-foreground">
                      Todos os GHEs
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {totalRiskOverviewCount} riscos cadastrados
                    </p>
                  </button>
                  {visibleRiskOverviewGhes.map((ghe) => (
                    <div
                      key={ghe.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setRiskOverviewGheFilterId(ghe.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setRiskOverviewGheFilterId(ghe.id);
                        }
                      }}
                      className={`cursor-pointer rounded-[12px] border px-4 py-4 ${
                        riskOverviewGheFilterId === ghe.id
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/70 bg-background/40"
                      }`}
                    >
                      <div className="w-full text-left">
                        <p className="text-[14px] font-semibold text-foreground">{ghe.name}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {ghe.risks.length} riscos cadastrados
                        </p>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCurrentRiskGheId(ghe.id);
                            setIsRiskOverviewModalOpen(false);
                          }}
                          className="btn-outline px-3 py-1 text-[12px]"
                        >
                          Editar riscos
                        </button>
                      </div>
                    </div>
                  ))}
                  {shouldPaginateRiskOverviewGhes && hiddenRiskOverviewGheCount > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleRiskOverviewGheCount(
                          (prev) => prev + PROGRESSIVE_BATCH_SIZE
                        )
                      }
                      className="btn-outline w-full px-3 py-2 text-[12px]"
                    >
                      Carregar mais GHEs ({hiddenRiskOverviewGheCount} restantes)
                    </button>
                  ) : null}
                </div>

                <div className="flex min-h-0 min-w-0 flex-col rounded-[12px] border border-border/70 bg-background/40 px-4 py-4">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={riskOverviewSearch}
                      onChange={(event) => setRiskOverviewSearch(event.target.value)}
                      className={`${inputInlineClass} pl-10`}
                      placeholder="Buscar por tipo, agente ou classificação"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[12px] text-muted-foreground">
                      {riskOverviewGheFilterId === "all"
                        ? "Visualizando riscos de todos os GHEs"
                        : `Filtro: ${selectedRiskOverviewGhe?.name ?? "GHE"}`}
                      {normalizedRiskOverviewSearch
                        ? ` · ${filteredRiskOverviewRows.length} resultados`
                        : ""}
                    </p>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto pr-2">
                    {visibleRiskOverviewRows.length ? (
                      visibleRiskOverviewRows.map((row) => (
                        <div
                          key={`${row.gheId}::${row.risk.id}`}
                          className="rounded-[10px] border border-border/60 bg-card px-3 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold text-foreground">
                              {row.risk.descricaoAgente || "Agente não informado"}
                            </p>
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                              {row.gheName}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            Tipo: {row.risk.tipoAgente || "Não informado"} · Classificação:{" "}
                            {row.risk.classificacao || "Não informada"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-6 text-center text-[12px] text-muted-foreground">
                        Nenhum resultado para o filtro aplicado.
                      </div>
                    )}

                    {shouldPaginateRiskOverviewRows && hiddenRiskOverviewRiskCount > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleRiskOverviewRiskCount(
                            (prev) => prev + PROGRESSIVE_BATCH_SIZE
                          )
                        }
                        className="btn-outline px-4 py-2 text-[12px]"
                      >
                        Carregar mais riscos ({hiddenRiskOverviewRiskCount} restantes)
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteSelectedRisksModalOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <h3 className="text-[18px] font-semibold text-foreground">
                Confirmar exclusão
              </h3>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Deseja excluir{" "}
                <span className="font-semibold text-foreground">
                  {selectedRiskIds.length}
                </span>{" "}
                {selectedRiskIds.length === 1
                  ? "risco selecionado"
                  : "riscos selecionados"}{" "}
                do {currentRiskGhe?.name ?? "GHE atual"}?
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                A exclusão será aplicada de uma única vez.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteSelectedRisksModalOpen(false)}
                  className="btn-outline px-4"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSelectedRisks}
                  className="btn-primary bg-danger px-5 hover:bg-danger/90"
                >
                  Excluir riscos
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isResetModalOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <h3 className="text-[18px] font-semibold text-foreground">
                Confirmar limpeza
              </h3>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Todos os dados preenchidos serão removidos. Deseja continuar?
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="btn-outline px-4"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleResetCaracterizacaoData();
                    setIsResetModalOpen(false);
                  }}
                  className="btn-primary px-5"
                >
                  Confirmar limpeza
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
