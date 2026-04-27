import { ChevronDown, PlusCircle, Search, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchableSelect } from "./searchable-select";
import type { GheRisk, RiskGheGroup } from "../types";
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

const EPC_OPTIONS = [
  "A ser evidenciado na fase de reconhecimento",
  "Sistema de exaustão",
  "Cortinas de proteção",
  "Ventilação local",
  "Barreiras físicas",
];

const EPI_OPTIONS = [
  "A ser evidenciado na fase de reconhecimento",
  "Respirador (CA 67890)",
  "Máscara de solda (CA 12345)",
  "Óculos de proteção (CA 55555)",
  "Protetor auricular (CA 44444)",
];

const PROBABILIDADE_OPTIONS = ["1", "2", "3", "4", "5"];
const DEFAULT_EPC_EPI_TEXT = "A ser evidenciado na fase de reconhecimento";
const isNaValue = (value: string) => value.trim().toUpperCase() === "N/A";
type RequiredRiskField =
  | "tipoAgente"
  | "descricaoAgente"
  | "meioPropagacao"
  | "fontes"
  | "tipoAvaliacao"
  | "intensidade"
  | "severidade"
  | "probabilidade"
  | "classificacao"
  | "medidasControle"
  | "epc"
  | "epi";

const withDefaultEpcEpi = (value: string | string[] | undefined | null) => {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item && !isNaValue(item))
      .join(", ");
    return normalized || DEFAULT_EPC_EPI_TEXT;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && !isNaValue(trimmed) ? trimmed : DEFAULT_EPC_EPI_TEXT;
  }
  return DEFAULT_EPC_EPI_TEXT;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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
const isStrictNumericValue = (value: string) => /^\d+(?:[.,]\d+)?$/.test(value);

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
const sanitizeRiskMeasurementFields = (risk: GheRisk, measuredUnits: string[]) => ({
  ...risk,
  valorMedido: sanitizeNumericInput(
    stripTrailingMeasuredUnits(String(risk.valorMedido || ""), measuredUnits)
  ),
  intensidade: stripTrailingMeasuredUnits(String(risk.intensidade || ""), measuredUnits),
  nivelAcao: stripTrailingMeasuredUnits(String(risk.nivelAcao || ""), measuredUnits),
});

const createRiskId = () =>
  `risk-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const isSameRiskContent = (a: GheRisk, b: GheRisk) =>
  a.tipoAgente === b.tipoAgente &&
  a.descricaoAgente === b.descricaoAgente &&
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
  withDefaultEpcEpi(a.epc) === withDefaultEpcEpi(b.epc) &&
  withDefaultEpcEpi(a.epi) === withDefaultEpcEpi(b.epi);

const getRiskContentKey = (risk: GheRisk) =>
  [
    risk.tipoAgente,
    risk.descricaoAgente,
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
    withDefaultEpcEpi(risk.epc),
    withDefaultEpcEpi(risk.epi),
  ]
    .map((value) => (value || "").trim().toLowerCase())
    .join("||");

const PROGRESSIVE_THRESHOLD = 50;
const PROGRESSIVE_BATCH_SIZE = 50;

export function CaracterizacaoStep({ ctx }: CaracterizacaoStepProps) {
  const {
    handleResetCaracterizacaoData,
    riskGheGroups,
    setRiskGheGroups,
    currentRiskGheId,
    setCurrentRiskGheId,
    pushHistory,
    applyMissingRiskDefaults,
    tipoAgenteOptions,
    getDescricaoAgenteOptions,
    getMeioPropagacaoOptions,
    getFontesOptions,
    getTipoAvaliacaoOptions,
    getUnidadeMedidaOptions,
    getIntensidadeOptions,
    getIsCalculatedCriteria,
    getNivelAcaoOptions,
    getSeveridadeOptions,
    inputBaseClass,
    inputInlineClass,
    textareaBaseClass,
    selectSmallClass,
  } = ctx;

  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [isRiskOverviewModalOpen, setIsRiskOverviewModalOpen] = useState(false);
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [riskGheSearch, setRiskGheSearch] = useState("");
  const [riskOverviewSearch, setRiskOverviewSearch] = useState("");
  const [batchRiskSearch, setBatchRiskSearch] = useState("");
  const [batchGheSearch, setBatchGheSearch] = useState("");
  const [riskOverviewGheFilterId, setRiskOverviewGheFilterId] = useState<"all" | string>("all");
  const [selectedBatchRiskKey, setSelectedBatchRiskKey] = useState<string | null>(null);
  const [selectedBatchGheIds, setSelectedBatchGheIds] = useState<string[]>([]);
  const [batchAssignFeedback, setBatchAssignFeedback] = useState<string>("");
  const [openMultiSelect, setOpenMultiSelect] = useState<null | {
    riskId: string;
    field: "epc" | "epi";
  }>(null);
  const [multiSelectQuery, setMultiSelectQuery] = useState("");
  const [, setTouchedRiskFields] = useState<
    Record<string, Partial<Record<RequiredRiskField, boolean>>>
  >({});
  const [minimizedRiskIds, setMinimizedRiskIds] = useState<Record<string, boolean>>({});
  const copyMenuRef = useRef<HTMLDivElement | null>(null);

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
  const selectedBatchRiskGroup = useMemo(() => {
    if (!selectedBatchRiskKey) return null;
    return batchRiskGroups.find((group) => group.key === selectedBatchRiskKey) ?? null;
  }, [batchRiskGroups, selectedBatchRiskKey]);
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
    const base = selectedBatchRiskGroup
      ? riskGheGroups.filter((ghe) => !selectedBatchRiskGroup.sourceGheIds.includes(ghe.id))
      : riskGheGroups;
    if (!normalizedBatchGheSearch) return base;
    return base.filter((ghe) =>
      normalizeText(ghe.name).includes(normalizedBatchGheSearch)
    );
  }, [normalizedBatchGheSearch, riskGheGroups, selectedBatchRiskGroup]);
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
    riskGheGroups.forEach((ghe) => {
      ghe.risks.forEach((risk) => {
        map[risk.id] = {
          tipoAgente: hasValue(risk.tipoAgente) ? "" : "Tipo de Agente é obrigatório.",
          descricaoAgente: hasValue(risk.descricaoAgente)
            ? ""
            : "Descrição do Agente é obrigatória.",
          meioPropagacao: hasValue(risk.meioPropagacao)
            ? ""
            : "Meio de Propagação é obrigatório.",
          fontes: hasValue(risk.fontes) ? "" : "Fontes/Circunstâncias é obrigatório.",
          tipoAvaliacao: hasValue(risk.tipoAvaliacao)
            ? ""
            : "Tipo de Avaliação é obrigatório.",
          intensidade: hasValue(risk.intensidade)
            ? ""
            : "Intensidade/Concentração é obrigatória.",
          severidade: hasValue(risk.severidade) ? "" : "Severidade é obrigatória.",
          probabilidade: hasValue(risk.probabilidade) ? "" : "Probabilidade é obrigatória.",
          classificacao: hasValue(risk.classificacao)
            ? ""
            : "Classificação de Risco é obrigatória.",
          medidasControle: hasValue(risk.medidasControle)
            ? ""
            : "Medidas de Controle é obrigatório.",
          epc: hasValue(risk.epc) ? "" : "EPC é obrigatório.",
          epi: hasValue(risk.epi) ? "" : "EPI é obrigatório.",
        };
      });
    });
    return map;
  }, [riskGheGroups]);

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
    riskErrorsById[riskId]?.[field]
      ? `${baseClassName} border-rose-400 focus:ring-rose-500`
      : baseClassName;

  const getRiskFieldError = (riskId: string, field: RequiredRiskField) =>
    riskErrorsById[riskId]?.[field] || "";

  const handleAddRisk = () => {
    if (!currentRiskGhe) return;
    pushHistory();
    const newRisk: GheRisk = {
      id: createRiskId(),
      tipoAgente: "",
      descricaoAgente: "",
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
      epc: DEFAULT_EPC_EPI_TEXT,
      epi: DEFAULT_EPC_EPI_TEXT,
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
  };

  const handleRiskChange = (
    riskId: string,
    field:
      | "tipoAgente"
      | "descricaoAgente"
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
      | "epi"
      | "epc",
    value: string
  ) => {
    if (!currentRiskGhe) return;
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
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
                          epc: DEFAULT_EPC_EPI_TEXT,
                          epi: DEFAULT_EPC_EPI_TEXT,
                        };
                        return nextRisk;
                      }

                      if (field !== "descricaoAgente") {
                        if (field === "unidadeMedida") {
                          const previousMeasuredUnit = String(risk.unidadeMedida || "").trim();
                          const nextMeasuredUnit = String(value || "").trim();
                          return sanitizeRiskMeasurementFields(
                            {
                              ...risk,
                              unidadeMedida: value,
                            },
                            [previousMeasuredUnit, nextMeasuredUnit]
                          );
                        }

                        if (
                          field === "valorMedido" ||
                          field === "intensidade" ||
                          field === "nivelAcao"
                        ) {
                          const measuredUnits = [String(risk.unidadeMedida || "").trim()];
                          const valueWithoutUnit = stripTrailingMeasuredUnits(
                            value,
                            measuredUnits
                          );
                          const sanitizedValue =
                            field === "valorMedido"
                              ? sanitizeNumericInput(valueWithoutUnit)
                              : valueWithoutUnit;
                          return { ...risk, [field]: sanitizedValue };
                        }

                        return { ...risk, [field]: value };
                      }

                      const nextRisk = {
                        ...risk,
                        descricaoAgente: value,
                        // Ao trocar a descrição, limpa os campos técnicos para
                        // não reaproveitar valores do item anterior.
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
                        epc: DEFAULT_EPC_EPI_TEXT,
                        epi: DEFAULT_EPC_EPI_TEXT,
                      };

                      if (!nextRisk.tipoAgente || !nextRisk.descricaoAgente) {
                        return nextRisk;
                      }

                      const defaultedRisk = applyMissingRiskDefaults(nextRisk);
                      return sanitizeRiskMeasurementFields(defaultedRisk, [
                        String(defaultedRisk.unidadeMedida || "").trim(),
                      ]);
                    })()
                  : risk
              ),
            }
          : ghe
      )
    );
  };

  // const handleToggleRiskMultiSelect = (
  //   riskId: string,
  //   field: "epc" | "epi",
  //   option: string
  // ) => {
  //   if (!currentRiskGhe) return;
  //   pushHistory();
  //   setRiskGheGroups((prev: RiskGheGroup[]) =>
  //     prev.map((ghe) => {
  //       if (ghe.id !== currentRiskGhe.id) return ghe;
  //       return {
  //         ...ghe,
  //         risks: ghe.risks.map((risk) => {
  //           if (risk.id !== riskId) return risk;
  //           const current = risk[field] ?? [];
  //           let next: string[] = [];
  //           if (option === "N/A") {
  //             next = current.includes("N/A") ? [] : ["N/A"];
  //           } else {
  //             const withoutNa = current.filter((item) => item !== "N/A");
  //             if (withoutNa.includes(option)) {
  //               next = withoutNa.filter((item) => item !== option);
  //             } else {
  //               next = [...withoutNa, option];
  //             }
  //           }
  //           return { ...risk, [field]: next };
  //         }),
  //       };
  //     })
  //   );
  // };

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
    const clonedRisks = source.risks.map((risk: GheRisk) => ({
      ...risk,
      medidasControle: risk.medidasControle ?? "",
      epc: withDefaultEpcEpi(risk.epc),
      epi: withDefaultEpcEpi(risk.epi),
      id: createRiskId(),
    }));
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
          const sanitizedRisk = sanitizeRiskMeasurementFields(risk, [
            String(risk.unidadeMedida || "").trim(),
          ]);
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
  }, [riskGheGroups, setRiskGheGroups]);

  useEffect(() => {
    setVisibleRiskGheCount(PROGRESSIVE_BATCH_SIZE);
  }, [riskGheSearch, filteredRiskGheGroups.length]);

  useEffect(() => {
    setVisibleRiskCount(PROGRESSIVE_BATCH_SIZE);
  }, [currentRiskGheId, currentRiskList.length]);

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
  }, [isBatchAssignModalOpen, filteredBatchGhes.length, batchGheSearch, selectedBatchRiskKey]);

  useEffect(() => {
    if (!selectedBatchRiskKey) return;
    if (batchRiskGroups.some((group) => group.key === selectedBatchRiskKey)) return;
    setSelectedBatchRiskKey(null);
  }, [batchRiskGroups, selectedBatchRiskKey]);

  useEffect(() => {
    setSelectedBatchGheIds((prev) =>
      prev.filter((id) => riskGheGroups.some((ghe) => ghe.id === id))
    );
  }, [riskGheGroups]);

  useEffect(() => {
    if (!selectedBatchRiskGroup) return;
    setSelectedBatchGheIds((prev) =>
      prev.filter((id) => !selectedBatchRiskGroup.sourceGheIds.includes(id))
    );
  }, [selectedBatchRiskGroup]);

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

  const toggleBatchGheSelection = (gheId: string) => {
    setSelectedBatchGheIds((prev) =>
      prev.includes(gheId) ? prev.filter((id) => id !== gheId) : [...prev, gheId]
    );
    setBatchAssignFeedback("");
  };

  const handleApplyBatchRiskAssignment = () => {
    if (!selectedBatchRiskGroup || !selectedBatchGheIds.length) return;

    pushHistory();
    const sourceRisk = selectedBatchRiskGroup.risk;
    const targetGheIds = selectedBatchGheIds.filter(
      (gheId) => !selectedBatchRiskGroup.sourceGheIds.includes(gheId)
    );
    if (!targetGheIds.length) {
      setBatchAssignFeedback("Selecione ao menos um GHE de destino válido.");
      return;
    }
    let addedCount = 0;

    setRiskGheGroups((prev) =>
      prev.map((ghe) => {
        if (!targetGheIds.includes(ghe.id)) return ghe;
        const hasSameRisk = ghe.risks.some((risk) => isSameRiskContent(risk, sourceRisk));
        if (hasSameRisk) return ghe;
        addedCount += 1;
        return {
          ...ghe,
          risks: [
            ...ghe.risks,
            {
              ...sourceRisk,
              id: createRiskId(),
            },
          ],
        };
      })
    );

    setSelectedBatchGheIds([]);
    setBatchAssignFeedback(
      addedCount > 0
        ? `Risco atribuído em ${addedCount} GHE(s).`
        : "Os GHEs selecionados já possuem esse risco."
    );
  };

  const renderRiskCards = (withMargin: boolean) => (
    <div className={`${withMargin ? "mt-6" : ""} space-y-4`}>
      {visibleCurrentRisks.length ? (
        visibleCurrentRisks.map((risk: GheRisk) => (
          (() => {
            const isMinimized = Boolean(minimizedRiskIds[risk.id]);
            const isQuantitativeEvaluation = normalizeText(risk.tipoAvaliacao).includes("quantit");
            const allowsCalculatedInputs = getIsCalculatedCriteria(
              risk.tipoAgente,
              risk.descricaoAgente
            );
            const measuredUnit = String(risk.unidadeMedida || "").trim();
            const measuredUnitPlaceholder =
              measuredUnit && !isNaValue(measuredUnit)
                ? measuredUnit
                : "Unidade de Medida";
            const sanitizedValorMedido = stripTrailingMeasuredUnits(
              String(risk.valorMedido || ""),
              [measuredUnit]
            );
            const numericValorMedido = sanitizeNumericInput(sanitizedValorMedido);
            const sanitizedIntensidade = stripTrailingMeasuredUnits(
              String(risk.intensidade || ""),
              [measuredUnit]
            );
            const sanitizedNivelAcao = stripTrailingMeasuredUnits(
              String(risk.nivelAcao || ""),
              [measuredUnit]
            );
            const sanitizeOptionValues = (options: string[]) =>
              Array.from(
                new Set(
                  options
                    .map((option) => stripTrailingMeasuredUnits(option, [measuredUnit]).trim())
                    .filter(Boolean)
                )
              );
            const intensidadeOptions = sanitizeOptionValues(
              getIntensidadeOptions(
                risk.tipoAgente,
                risk.descricaoAgente,
                sanitizedIntensidade
              )
            );
            const nivelAcaoOptions = sanitizeOptionValues(
              getNivelAcaoOptions(
                risk.tipoAgente,
                risk.descricaoAgente,
                sanitizedNivelAcao
              )
            );
            return (
              <div
                key={risk.id}
                data-risk-id={risk.id}
                className="rounded-[14px] border border-border/60 bg-card px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-foreground">
                    Risco cadastrado
                  </p>
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
                      className="btn-outline px-3 py-1 text-[12px] text-danger hover:bg-danger/10"
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
                    <div className="mt-4 grid gap-4 md:grid-cols-4">
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
                          <p className="mt-1 text-[12px] text-danger">
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
                            options={getDescricaoAgenteOptions(
                              risk.tipoAgente,
                              risk.descricaoAgente
                            ).map((option: string) => ({
                              label: option,
                              value: option,
                            }))}
                            buttonClassName={getRiskFieldClassName(
                              risk.id,
                              "descricaoAgente",
                              selectSmallClass
                            )}
                            searchPlaceholder="Filtrar descrição"
                          />
                        </div>
                        {getRiskFieldError(risk.id, "descricaoAgente") ? (
                          <p className="mt-1 text-[12px] text-danger">
                            {getRiskFieldError(risk.id, "descricaoAgente")}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-foreground">
                          Meio de Propagação *
                        </label>
                        <div className="mt-2">
                          <SearchableSelect
                            value={risk.meioPropagacao}
                            onChange={(value) => {
                              markRiskTouched(risk.id, "meioPropagacao");
                              handleRiskChange(risk.id, "meioPropagacao", value);
                            }}
                            options={getMeioPropagacaoOptions(
                              risk.tipoAgente,
                              risk.descricaoAgente,
                              risk.meioPropagacao
                            ).map((option: string) => ({
                              label: option,
                              value: option,
                            }))}
                            buttonClassName={getRiskFieldClassName(
                              risk.id,
                              "meioPropagacao",
                              selectSmallClass
                            )}
                            searchPlaceholder="Filtrar meio"
                          />
                        </div>
                        {getRiskFieldError(risk.id, "meioPropagacao") ? (
                          <p className="mt-1 text-[12px] text-danger">
                            {getRiskFieldError(risk.id, "meioPropagacao")}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-foreground">
                          Fontes/Circunstâncias *
                        </label>
                        <div className="mt-2">
                          <SearchableSelect
                            value={risk.fontes}
                            onChange={(value) => {
                              markRiskTouched(risk.id, "fontes");
                              handleRiskChange(risk.id, "fontes", value);
                            }}
                            options={getFontesOptions(
                              risk.tipoAgente,
                              risk.descricaoAgente,
                              risk.fontes
                            ).map((option: string) => ({
                              label: option,
                              value: option,
                            }))}
                            buttonClassName={getRiskFieldClassName(
                              risk.id,
                              "fontes",
                              selectSmallClass
                            )}
                            searchPlaceholder="Filtrar fonte"
                          />
                        </div>
                        {getRiskFieldError(risk.id, "fontes") ? (
                          <p className="mt-1 text-[12px] text-danger">
                            {getRiskFieldError(risk.id, "fontes")}
                          </p>
                        ) : null}
                      </div>

                    </div>
                    {isQuantitativeEvaluation ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-4">
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            Unidade de Medida *
                          </label>
                          <div className="mt-2">
                            <SearchableSelect
                              value={risk.unidadeMedida || ""}
                              onChange={(value) => {
                                handleRiskChange(risk.id, "unidadeMedida", value);
                              }}
                              options={getUnidadeMedidaOptions(
                                risk.tipoAgente,
                                risk.descricaoAgente,
                                risk.unidadeMedida || ""
                              ).map((option: string) => ({
                                label: option,
                                value: option,
                              }))}
                              buttonClassName={selectSmallClass}
                              searchPlaceholder="Filtrar unidade"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            Valor Medido *
                          </label>
                          <input
                            className={inputBaseClass}
                            value={numericValorMedido}
                            placeholder={measuredUnitPlaceholder}
                            inputMode="decimal"
                            onChange={(event) => {
                              const nextValue = sanitizeNumericInput(event.target.value);
                              handleRiskChange(risk.id, "valorMedido", nextValue);
                            }}
                            onBlur={() => {
                              if (!isQuantitativeEvaluation) return;
                              const currentValue = String(risk.valorMedido || "").trim();
                              if (!currentValue) return;
                              const valueWithoutUnit = stripTrailingMeasuredUnit(
                                currentValue,
                                measuredUnit
                              );
                              const normalizedNumericValue =
                                normalizeNumericInput(valueWithoutUnit);

                              if (!normalizedNumericValue) {
                                handleRiskChange(risk.id, "valorMedido", "");
                                return;
                              }

                              if (!isStrictNumericValue(normalizedNumericValue)) {
                                handleRiskChange(risk.id, "valorMedido", "");
                                return;
                              }

                              if (normalizedNumericValue !== currentValue) {
                                handleRiskChange(
                                  risk.id,
                                  "valorMedido",
                                  normalizedNumericValue
                                );
                              }
                            }}
                            disabled={!isQuantitativeEvaluation}
                          />
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            Limite de Tolerância *
                          </label>
                          {allowsCalculatedInputs ? (
                            <input
                              className={getRiskFieldClassName(
                                risk.id,
                                "intensidade",
                                inputBaseClass
                              )}
                              value={sanitizedIntensidade}
                              placeholder={measuredUnitPlaceholder}
                              onChange={(event) =>
                                handleRiskChange(risk.id, "intensidade", event.target.value)
                              }
                              onBlur={() => {
                                const currentValue = String(risk.intensidade || "").trim();
                                const sanitizedValue = stripTrailingMeasuredUnit(
                                  currentValue,
                                  measuredUnit
                                );
                                if (sanitizedValue !== currentValue) {
                                  handleRiskChange(risk.id, "intensidade", sanitizedValue);
                                }
                                markRiskTouched(risk.id, "intensidade");
                              }}
                            />
                          ) : (
                            <div className="mt-2">
                              <SearchableSelect
                                value={sanitizedIntensidade}
                                onChange={(value) => {
                                  markRiskTouched(risk.id, "intensidade");
                                  handleRiskChange(risk.id, "intensidade", value);
                                }}
                                placeholder={measuredUnitPlaceholder}
                                options={intensidadeOptions.map((option: string) => ({
                                  label: option,
                                  value: option,
                                }))}
                                buttonClassName={getRiskFieldClassName(
                                  risk.id,
                                  "intensidade",
                                  selectSmallClass
                                )}
                                searchPlaceholder="Filtrar intensidade"
                              />
                            </div>
                          )}
                          {getRiskFieldError(risk.id, "intensidade") ? (
                            <p className="mt-1 text-[12px] text-danger">
                              {getRiskFieldError(risk.id, "intensidade")}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            Nível de Ação *
                          </label>
                          {allowsCalculatedInputs ? (
                            <input
                              className={inputBaseClass}
                              value={sanitizedNivelAcao}
                              placeholder={measuredUnitPlaceholder}
                              onChange={(event) =>
                                handleRiskChange(risk.id, "nivelAcao", event.target.value)
                              }
                              onBlur={() => {
                                const currentValue = String(risk.nivelAcao || "").trim();
                                const sanitizedValue = stripTrailingMeasuredUnit(
                                  currentValue,
                                  measuredUnit
                                );
                                if (sanitizedValue !== currentValue) {
                                  handleRiskChange(risk.id, "nivelAcao", sanitizedValue);
                                }
                              }}
                            />
                          ) : (
                            <div className="mt-2">
                              <SearchableSelect
                                value={sanitizedNivelAcao}
                                onChange={(value) => {
                                  handleRiskChange(risk.id, "nivelAcao", value);
                                }}
                                placeholder={measuredUnitPlaceholder}
                                options={nivelAcaoOptions.map((option: string) => ({
                                  label: option,
                                  value: option,
                                }))}
                                buttonClassName={selectSmallClass}
                                searchPlaceholder="Filtrar nível de ação"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <div>
                        <label className="text-[12px] font-medium text-foreground">
                          Tipo de Avaliação *
                        </label>
                        <div className="mt-2">
                          <SearchableSelect
                            value={risk.tipoAvaliacao}
                            onChange={(value) => {
                              markRiskTouched(risk.id, "tipoAvaliacao");
                              handleRiskChange(risk.id, "tipoAvaliacao", value);
                            }}
                            options={getTipoAvaliacaoOptions(
                              risk.tipoAgente,
                              risk.descricaoAgente,
                              risk.tipoAvaliacao
                            ).map((option: string) => ({
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
                          <p className="mt-1 text-[12px] text-danger">
                            {getRiskFieldError(risk.id, "tipoAvaliacao")}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-foreground">
                          Severidade *
                        </label>
                        <div className="mt-2">
                          <SearchableSelect
                            value={risk.severidade}
                            onChange={(value) => {
                              markRiskTouched(risk.id, "severidade");
                              handleRiskChange(risk.id, "severidade", value);
                            }}
                            options={getSeveridadeOptions(
                              risk.tipoAgente,
                              risk.descricaoAgente,
                              risk.severidade
                            ).map((option: string) => ({
                              label: option,
                              value: option,
                            }))}
                            buttonClassName={getRiskFieldClassName(
                              risk.id,
                              "severidade",
                              selectSmallClass
                            )}
                            searchPlaceholder="Filtrar severidade"
                          />
                        </div>
                        {getRiskFieldError(risk.id, "severidade") ? (
                          <p className="mt-1 text-[12px] text-danger">
                            {getRiskFieldError(risk.id, "severidade")}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-foreground">
                          Probabilidade *
                        </label>
                        <div className="mt-2">
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
                          <p className="mt-1 text-[12px] text-danger">
                            {getRiskFieldError(risk.id, "probabilidade")}
                          </p>
                        ) : null}
                      </div>              
                      <div>
                        <label className="text-[12px] font-medium text-foreground">
                          Classificação de Risco *
                        </label>
                        <input
                          className={getRiskFieldClassName(risk.id, "classificacao", inputBaseClass)}
                          value={risk.classificacao}
                          onChange={(event) =>
                            handleRiskChange(risk.id, "classificacao", event.target.value)
                          }
                          disabled
                        />
                        {getRiskFieldError(risk.id, "classificacao") ? (
                          <p className="mt-1 text-[12px] text-danger">
                            {getRiskFieldError(risk.id, "classificacao")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-8">
                      <p className="text-[13px] font-semibold text-foreground">
                        Medidas de prevenção
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-4">
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            Medidas de Controle Administrativas e/ou de Engenharia *
                          </label>
                          <textarea
                            className={getRiskFieldClassName(
                              risk.id,
                              "medidasControle",
                              `${textareaBaseClass} min-h-[80px]`
                            )}
                            value={risk.medidasControle}
                            onChange={(event) =>
                              handleRiskChange(risk.id, "medidasControle", event.target.value)
                            }
                            onBlur={() => markRiskTouched(risk.id, "medidasControle")}
                          />
                          {getRiskFieldError(risk.id, "medidasControle") ? (
                            <p className="mt-1 text-[12px] text-danger">
                              {getRiskFieldError(risk.id, "medidasControle")}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            EPC *
                          </label>
                          <textarea
                            className={getRiskFieldClassName(
                              risk.id,
                              "epc",
                              `${textareaBaseClass} min-h-[80px]`
                            )}
                            value={withDefaultEpcEpi(risk.epc)}
                            onChange={(event) =>
                              handleRiskChange(risk.id, "epc", event.target.value)
                            }
                            onBlur={() => markRiskTouched(risk.id, "epc")}
                          />
                          {getRiskFieldError(risk.id, "epc") ? (
                            <p className="mt-1 text-[12px] text-danger">
                              {getRiskFieldError(risk.id, "epc")}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            EPI *
                          </label>
                          <textarea
                            className={getRiskFieldClassName(
                              risk.id,
                              "epi",
                              `${textareaBaseClass} min-h-[80px]`
                            )}
                            value={withDefaultEpcEpi(risk.epi)}
                            onChange={(event) =>
                              handleRiskChange(risk.id, "epi", event.target.value)
                            }
                            onBlur={() => markRiskTouched(risk.id, "epi")}
                          />
                          {getRiskFieldError(risk.id, "epi") ? (
                            <p className="mt-1 text-[12px] text-danger">
                              {getRiskFieldError(risk.id, "epi")}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-foreground">
                            CA
                          </label>
                          <textarea
                            className={`${textareaBaseClass} min-h-[80px]`}
                            value={withDefaultEpcEpi(risk.epi)}
                            onChange={(event) =>
                              handleRiskChange(risk.id, "epi", event.target.value)
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
              className="btn-outline border-rose-300 px-4 text-rose-600 hover:bg-rose-50"
            >
              Limpar dados da etapa
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
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
                setSelectedBatchRiskKey(
                  currentRiskGhe?.risks[0]
                    ? getRiskContentKey(currentRiskGhe.risks[0])
                    : null
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
                  <div className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2">
                    <p className="flex items-center gap-2 text-[12px] font-semibold text-amber-900">
                      <TriangleAlert className="h-4 w-4 text-amber-500" />
                      Existem GHEs com a mesma caracterização de risco.
                    </p>
                    <p className="mt-1 text-[11px] text-amber-900/90">
                      {duplicatedRiskStructureGroups
                        .map((group) => group.gheNames.join(", "))
                        .join(" | ")}
                    </p>
                  </div>
                ) : null}
                {visibleFilteredRiskGheGroups.map((ghe: RiskGheGroup) => (
                  <button
                    key={ghe.id}
                    type="button"
                    onClick={() => setCurrentRiskGheId(ghe.id)}
                    className={`w-full rounded-[10px] border px-3 py-2 text-left text-[12px] transition ${
                      currentRiskGheId === ghe.id
                        ? duplicatedRiskStructureGheIds.has(ghe.id)
                          ? "border-amber-500 bg-primary/5"
                          : "border-primary/50 bg-primary/5"
                        : duplicatedRiskStructureGheIds.has(ghe.id)
                          ? "border-amber-300 bg-background/60 hover:bg-muted/60"
                          : "border-border/70 bg-background/60 hover:bg-muted/60"
                    }`}
                  >
                    <p className="flex items-center gap-1 font-semibold text-foreground">
                      {duplicatedRiskStructureGheIds.has(ghe.id) ? (
                        <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
                      ) : null}
                      {ghe.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {ghe.risks.length} riscos cadastrados
                    </p>
                  </button>
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
              <div className="mt-3 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-amber-900">
                  <TriangleAlert className="h-4 w-4 text-amber-500" />
                  Existem GHEs com a mesma caracterização de risco.
                </p>
                <p className="mt-1 text-[11px] text-amber-900/90">
                  {duplicatedRiskStructureGroups
                    .map((group) => group.gheNames.join(", "))
                    .join(" | ")}
                </p>
              </div>
            ) : null}

            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {visibleFilteredRiskGheGroups.map((ghe: RiskGheGroup) => (
                <button
                  key={ghe.id}
                  type="button"
                  onClick={() => setCurrentRiskGheId(ghe.id)}
                  className={`min-w-[150px] rounded-[12px] border px-3 py-2 text-left transition ${
                    currentRiskGheId === ghe.id
                      ? duplicatedRiskStructureGheIds.has(ghe.id)
                        ? "border-amber-500 bg-primary/5"
                        : "border-primary/50 bg-primary/5"
                      : duplicatedRiskStructureGheIds.has(ghe.id)
                        ? "border-amber-300 bg-background/40 hover:bg-muted/60"
                        : "border-border/70 bg-background/40 hover:bg-muted/60"
                  }`}
                >
                  <p className="flex items-center gap-1 text-[12px] font-semibold text-foreground">
                    {duplicatedRiskStructureGheIds.has(ghe.id) ? (
                      <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
                    ) : null}
                    {ghe.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {ghe.risks.length} riscos
                  </p>
                </button>
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
                    Selecione um risco na esquerda e marque os GHEs de destino na direita.
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
                  <p className="mt-3 text-[12px] text-muted-foreground">
                    {filteredBatchRiskGroups.length} riscos encontrados
                  </p>

                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
                    {visibleBatchRiskGroups.length ? (
                      visibleBatchRiskGroups.map((group) => {
                        const isSelected = selectedBatchRiskKey === group.key;
                        return (
                          <button
                            key={group.key}
                            type="button"
                            onClick={() => {
                              setSelectedBatchRiskKey(group.key);
                              setSelectedBatchGheIds([]);
                              setBatchAssignFeedback("");
                            }}
                            className={`w-full rounded-[10px] border px-3 py-3 text-left ${
                              isSelected
                                ? "border-primary/50 bg-primary/5"
                                : "border-border/60 bg-card hover:bg-muted/60"
                            }`}
                          >
                            <p className="text-[13px] font-semibold text-foreground">
                              {group.risk.descricaoAgente || "Agente não informado"}
                            </p>
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              Tipo: {group.risk.tipoAgente || "Não informado"} · Classificação:{" "}
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
                          </button>
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
                      disabled={!visibleBatchGhes.length}
                      className={!visibleBatchGhes.length ? "btn-disabled px-3 py-1 text-[12px]" : "btn-outline px-3 py-1 text-[12px]"}
                    >
                      Marcar visíveis
                    </button>
                  </div>

                  <p className="mt-2 text-[12px] text-muted-foreground">
                    {selectedBatchRiskGroup
                      ? `Origem em: ${selectedBatchRiskGroup.sourceGheNames.join(", ")}`
                      : "Selecione um risco para habilitar os destinos."}
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
                            disabled={!selectedBatchRiskGroup}
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
                      disabled={!selectedBatchRiskGroup || !selectedBatchGheIds.length}
                      className={
                        !selectedBatchRiskGroup || !selectedBatchGheIds.length
                          ? "btn-disabled px-4"
                          : "btn-primary px-4"
                      }
                    >
                      Atribuir risco
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
