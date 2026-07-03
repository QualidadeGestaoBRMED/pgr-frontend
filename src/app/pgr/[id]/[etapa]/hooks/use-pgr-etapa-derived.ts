import { useCallback, useMemo } from "react";
import { pgrSteps, type PgrStepId } from "@/app/pgr/steps";
import { useRiskCatalogHelpers } from "./use-risk-catalog-helpers";
import {
  getDadosCadastraisIssues,
  getGheInfoIssues,
  getInicioDraftIssues,
  getRiskIssues,
  isDadosCadastraisComplete,
  isGheInfoComplete as isGheInfoCompleteBySchema,
  isInicioDraftComplete,
  isRiskComplete,
} from "../validation/step-schemas";
import {
  isValidCpf,
  isValidEmail,
  isValidMeasuredValue,
  isValidPhoneBr,
  isValidQuantitativeMeasurementValue,
} from "../validation/br-field-utils";
import type {
  GheGroup,
  PendingReviewTarget,
  PgrFunction,
  PlanGeneralMeasureRow,
  RiskCatalogPayload,
  RiskGheGroup,
} from "../types";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { AnexoItem, HistoricoData } from "../types";
import { buildPendingReviewTarget } from "../utils/pending-review";
import {
  buildCommonRiskOptionsForGhes,
  calculateAffectedWorkersRange,
  calculatePlanActionPriority,
} from "../utils/plan-actions";
import {
  isModerateOrHigherPriority,
  normalizePriorityText,
} from "../utils/plan-priority";
import { calculateAutomaticActionDueDate } from "../utils/action-date";
import { calculatePlanActionVigencia } from "../utils/vigencia";

export type PlanTableRow = {
  id: string;
  gheId: string;
  riskId: string;
  gheName: string;
  tipoAgente: string;
  descricaoAgente: string;
  prioridade: string;
  classificacao: string;
  exposureValue?: number;
  medidasPrevencao: string;
  tipoMedida?: string;
  prazoAcao?: string;
  responsavelAcao?: string;
  acompanhamento?: string;
  afericaoResultado?: string;
  groupTargets?: Array<{ gheId: string; riskId: string }>;
  isCustomPlanRow?: boolean;
  hasPlanSnapshot?: boolean;
};
const PLAN_ALL_GHE_ID = "__plan_all_ghes__";
export const DEFAULT_PLAN_ACOMPANHAMENTO = "Programado";
export const DEFAULT_PLAN_AFERICAO_RESULTADO = "Aguardando realização da Ação";

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const uniqueValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const riskIssueFieldMap: Record<string, string> = {
  "Tipo de agente e obrigatorio": "tipoAgente",
  "Descricao do agente e obrigatorio": "descricaoAgente",
  "Este risco ja foi cadastrado neste ghe": "descricaoAgente",
  "Meio de propagacao e obrigatorio": "meioPropagacao",
  "Fontes e obrigatorio": "fontes",
  "Unidade de medida e obrigatoria": "unidadeMedida",
  "Valor medido e obrigatorio para avaliacao quantitativa": "valorMedido",
  "Valor medido deve ser nd lq ou numerico": "valorMedido",
  "Valor medido deve ser numerico": "valorMedido",
  "Tipo de avaliacao e obrigatorio": "tipoAvaliacao",
  "Intensidade e obrigatorio": "intensidade",
  "Intensidadeconcentracao e obrigatoria": "intensidade",
  "Intensidadeconcentracao deve ser numerica ou comparador valido como 80 80 80 ou 80": "intensidade",
  "Severidade e obrigatorio": "severidade",
  "Probabilidade e obrigatorio": "probabilidade",
  "Classificacao e obrigatorio": "classificacao",
  "Medidas de controle e obrigatorio": "medidasControle",
  "EPC e obrigatorio": "epc",
  "EPI e obrigatorio": "epi",
};

const getRiskIssueFieldKey = (issue: string) =>
  riskIssueFieldMap[normalizeText(issue).replace(/[^\w\s]/g, "").trim()] || undefined;

const hasValue = (value: string | undefined | null) => String(value || "").trim().length > 0;

const getRiskDescriptionKey = (tipoAgente: string, descricaoAgente: string) => {
  const normalizedTipoAgente = normalizeText(String(tipoAgente || "").trim());
  const normalizedDescricaoAgente = normalizeText(String(descricaoAgente || "").trim());
  if (!normalizedTipoAgente || !normalizedDescricaoAgente) return "";
  return `${normalizedTipoAgente}::${normalizedDescricaoAgente}`;
};

const supportsMeasuredValueShortcut = (tipoAgente: string, descricaoAgente: string) => {
  const normalizedTipoAgente = normalizeText(String(tipoAgente || ""));
  const normalizedDescricaoAgente = normalizeText(String(descricaoAgente || ""));
  return (
    normalizedTipoAgente.includes("quim") ||
    (normalizedTipoAgente.includes("fisic") && normalizedDescricaoAgente === "calor")
  );
};

const extractGheToken = (gheName: string) => {
  const token = gheName.replace(/^ghe\s*/i, "").trim();
  const numberMatch = token.match(/\d+/);
  return numberMatch ? numberMatch[0] : token || gheName;
};

const compareGheTokens = (a: string, b: string) => {
  const aNum = Number(a);
  const bNum = Number(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
  if (Number.isFinite(aNum)) return -1;
  if (Number.isFinite(bNum)) return 1;
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
};

const isGeneralMeasuresPlanRow = (row: PlanTableRow) =>
  normalizeText(row.descricaoAgente).trim() === "medidas gerais";

const toDisplayText = (value: string, fallback = "Não informado") => {
  const safeValue = String(value || "").trim();
  return safeValue || fallback;
};

const getEffectivePlanValue = (value: string | undefined, fallback: string) =>
  String(value || "").trim() || fallback;

export const materializeEffectivePlanRow = (
  row: PlanTableRow,
  args: {
    calculatedPlanActionVigencia: string;
    defaultResponsibleActionName?: string;
  }
): PlanTableRow => {
  const defaultResponsible = String(args.defaultResponsibleActionName || "").trim();
  return {
    ...row,
    prazoAcao:
      String(row.prazoAcao || "").trim() ||
      calculateAutomaticActionDueDate({
        vigencia: args.calculatedPlanActionVigencia,
        prioridade: row.prioridade || "",
      }),
    responsavelAcao: String(row.responsavelAcao || "").trim() || defaultResponsible,
    acompanhamento: getEffectivePlanValue(
      row.acompanhamento,
      DEFAULT_PLAN_ACOMPANHAMENTO
    ),
    afericaoResultado: getEffectivePlanValue(
      row.afericaoResultado,
      DEFAULT_PLAN_AFERICAO_RESULTADO
    ),
  };
};

const getPlanPriorityText = (row: Pick<PlanTableRow, "prioridade" | "classificacao">) =>
  String(row.prioridade || row.classificacao || "").trim();

const getRiskContentKey = (risk: RiskGheGroup["risks"][number]) =>
  [
    risk.tipoAgente,
    risk.descricaoAgente,
    risk.meioPropagacao,
    risk.fontes,
    risk.valorMedido || "",
    risk.tipoAvaliacao,
    risk.intensidade,
    risk.nivelAcao || "",
    risk.severidade,
    risk.probabilidade,
    risk.classificacao,
    risk.medidasControle,
    risk.epc,
    risk.epi,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("||");

export function usePgrEtapaDerived({
  riskCatalogs,
  functionsData,
  gheGroups,
  currentGheId,
  searchTerm,
  gheSearch,
  gheFilterId,
  riskGheGroups,
  planGeneralMeasures,
  removedPlanRiskKeys,
  planActionGheId,
  planTablePage,
  planTablePageSize,
  inicioDraft,
  dadosCadastrais,
  historicoData,
  anexos,
  completedSteps,
  currentStepId,
}: {
  riskCatalogs: RiskCatalogPayload | null;
  functionsData: PgrFunction[];
  gheGroups: GheGroup[];
  currentGheId: string;
  searchTerm: string;
  gheSearch: string;
  gheFilterId: "all" | string;
  riskGheGroups: RiskGheGroup[];
  planGeneralMeasures: PlanGeneralMeasureRow[];
  removedPlanRiskKeys: string[];
  planActionGheId: string;
  planTablePage: number;
  planTablePageSize: number;
  inicioDraft: InicioDraft;
  dadosCadastrais: DadosCadastraisDraft;
  historicoData: HistoricoData;
  anexos: AnexoItem[];
  completedSteps: number;
  currentStepId: PgrStepId;
}) {
  const normalizedSearchTerm = useMemo(
    () => normalizeText(searchTerm.trim()),
    [searchTerm]
  );
  const normalizedGheSearch = useMemo(() => normalizeText(gheSearch.trim()), [gheSearch]);

  const {
    tipoAgenteOptions,
    applyMissingRiskDefaults,
    getDescricaoAgenteOptions,
    getMeioPropagacaoOptions,
    getFontesOptions,
    getDanosSaudeOptions,
    getTipoAvaliacaoOptions,
    getUnidadeMedidaOptions,
    getIntensidadeOptions,
    getIsCalculatedCriteria,
    getHasQuantitativeCriteria,
    getNivelAcaoOptions,
    getSeveridadeOptions,
    getMedidasControleOptions,
    getNormasOptions,
    getActionDescriptionOptions,
    getEpiOptions,
    getEpcOptions,
    calculateRiskClassification,
    calculateActionPlanClassification,
    calculateExposureFromWorkforceRatio,
  } =
    useRiskCatalogHelpers(riskCatalogs);

  const diretrizOptions = ["Diretriz 1", "Diretriz 2", "Diretriz 3"];
  const estabelecimentoOptions = ["Próprio", "Terceirizado"];

  const functionMap = useMemo(
    () => new Map(functionsData.map((item) => [item.id, item])),
    [functionsData]
  );
  const functionAssignments = useMemo(() => {
    const map = new Map<string, string>();
    gheGroups.forEach((ghe) => {
      ghe.items.forEach((item) => {
        map.set(item.functionId, ghe.id);
      });
    });
    return map;
  }, [gheGroups]);

  const availableFunctions = useMemo(
    () => functionsData.filter((item) => !functionAssignments.has(item.id)),
    [functionsData, functionAssignments]
  );
  const filteredFunctions = useMemo(() => {
    if (!normalizedSearchTerm) {
      return availableFunctions;
    }
    return availableFunctions.filter((item) => {
      const haystack = normalizeText(`${item.setor} ${item.funcao} ${item.descricao}`);
      return haystack.includes(normalizedSearchTerm);
    });
  }, [availableFunctions, normalizedSearchTerm]);

  const groupedFunctions = useMemo(() => {
    const groups = new Map<string, typeof filteredFunctions>();
    filteredFunctions.forEach((item) => {
      const current = groups.get(item.setor) ?? [];
      current.push(item);
      groups.set(item.setor, current);
    });
    return Array.from(groups.entries()).map(([setor, items]) => ({
      setor,
      items,
    }));
  }, [filteredFunctions]);

  const availableCountLabel = normalizedSearchTerm
    ? `${filteredFunctions.length} resultados`
    : `${availableFunctions.length} disponíveis`;

  const currentGhe = useMemo(
    () => gheGroups.find((ghe) => ghe.id === currentGheId) ?? gheGroups[0],
    [gheGroups, currentGheId]
  );
  const currentGheIndex = useMemo(
    () => gheGroups.findIndex((ghe) => ghe.id === currentGheId),
    [gheGroups, currentGheId]
  );
  const nextExistingGhe =
    currentGheIndex >= 0 && currentGheIndex < gheGroups.length - 1
      ? gheGroups[currentGheIndex + 1]
      : null;
  const currentGheName = currentGhe?.name ?? "GHE";
  const currentItems = currentGhe?.items ?? [];

  const isGheInfoComplete = (ghe?: GheGroup) => {
    if (!ghe) return false;
    return isGheInfoCompleteBySchema(ghe.info) && ghe.items.length > 0;
  };

  const describedGheCount = useMemo(
    () => gheGroups.filter((ghe) => isGheInfoComplete(ghe)).length,
    [gheGroups]
  );
  const allGhesDescribed = gheGroups.length > 0 && describedGheCount === gheGroups.length;
  const remainingCount = availableFunctions.length;
  const canOpenInfoModal = currentItems.length > 0;
  const canCreateNextGhe = remainingCount > 0 && canOpenInfoModal;

  const filteredAllFunctions = useMemo(() => {
    return functionsData.filter((item) => {
      if (gheFilterId !== "all") {
        const assigned = functionAssignments.get(item.id);
        if (assigned !== gheFilterId) return false;
      }
      if (!normalizedGheSearch) return true;
      const haystack = normalizeText(`${item.setor} ${item.funcao} ${item.descricao}`);
      return haystack.includes(normalizedGheSearch);
    });
  }, [functionsData, gheFilterId, functionAssignments, normalizedGheSearch]);

  const filteredFunctionIds = useMemo(
    () => new Set(filteredAllFunctions.map((item) => item.id)),
    [filteredAllFunctions]
  );

  const filteredGheGroupsForList = useMemo(() => {
    const scoped = gheGroups.filter((ghe) => (gheFilterId === "all" ? true : ghe.id === gheFilterId));
    if (!gheSearch.trim()) return scoped;
    return scoped
      .map((ghe) => ({
        ...ghe,
        items: ghe.items.filter((item) => filteredFunctionIds.has(item.functionId)),
      }))
      .filter((ghe) => ghe.items.length > 0);
  }, [gheGroups, gheFilterId, gheSearch, filteredFunctionIds]);

  const assignGheOptions = useMemo(
    () => [{ label: "Sem GHE", value: "none" }, ...gheGroups.map((ghe) => ({ label: ghe.name, value: ghe.id }))],
    [gheGroups]
  );

  const parseWorkersCount = (value: string) => {
    const safeValue = String(value || "").replace(/\s+/g, "").replace(",", ".");
    const parsed = Number.parseFloat(safeValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const workersByGheId = useMemo(() => {
    const map = new Map<string, number>();
    gheGroups.forEach((ghe) => {
      const total = ghe.items.reduce(
        (acc, item) => acc + parseWorkersCount(item.funcionarios),
        0
      );
      map.set(ghe.id, total);
    });
    return map;
  }, [gheGroups]);

  const totalWorkersAllGhes = useMemo(
    () =>
      Array.from(workersByGheId.values()).reduce(
        (acc, count) => acc + (Number.isFinite(count) ? count : 0),
        0
      ),
    [workersByGheId]
  );
  const calculatedPlanActionVigencia = useMemo(
    () => calculatePlanActionVigencia(historicoData.changes),
    [historicoData.changes]
  );
  const defaultResponsibleActionName = useMemo(
    () => String(inicioDraft.companyName || "").trim(),
    [inicioDraft.companyName]
  );

  const rawPlanTableRows = useMemo<PlanTableRow[]>(
    () => {
      const excludedKeys = new Set(removedPlanRiskKeys);
      const riskRows = riskGheGroups.flatMap((ghe) =>
        ghe.risks
          .filter((risk) => !excludedKeys.has(`${ghe.id}::${risk.id}`))
          .map((risk) => {
            const riskCalculated = calculateRiskClassification({
              severidade: risk.severidade,
              probabilidade: risk.probabilidade,
              tipoAvaliacao: risk.tipoAvaliacao,
              valorMedido: risk.valorMedido,
              intensidade: risk.intensidade,
              nivelAcao: risk.nivelAcao,
            });
            const gheWorkers = workersByGheId.get(ghe.id) || 0;
            const workforceRatio =
              totalWorkersAllGhes > 0 ? gheWorkers / totalWorkersAllGhes : null;
            const exposureFromWorkforce =
              calculateExposureFromWorkforceRatio(workforceRatio);
            const affectedWorkersRange = calculateAffectedWorkersRange(workforceRatio);
            const exposureValue =
              affectedWorkersRange || exposureFromWorkforce?.exposureValue;
            const actionPlanCalculated =
              riskCalculated?.classificationId && exposureValue
                ? calculateActionPlanClassification({
                    riskEvaluationClassificationId: riskCalculated.classificationId,
                    exposure: exposureValue,
                  })
                : null;
            const planActionPriority = calculatePlanActionPriority(
              riskCalculated?.classification || risk.classificacao,
              affectedWorkersRange || exposureValue
            );

            return materializeEffectivePlanRow(
              {
              id: `${ghe.id}-${risk.id}`,
              gheId: ghe.id,
              riskId: risk.id,
              gheName: ghe.name,
              tipoAgente: risk.tipoAgente || "",
              descricaoAgente: risk.descricaoAgente || "Não informado",
              prioridade:
                planActionPriority ||
                normalizePriorityText(
                  actionPlanCalculated?.classification ||
                  riskCalculated?.classification ||
                  risk.classificacao
                ),
              classificacao: toDisplayText(risk.classificacao),
              exposureValue,
              medidasPrevencao:
                (Object.prototype.hasOwnProperty.call(risk, "medidasPrevencaoPlano")
                  ? risk.medidasPrevencaoPlano
                  : risk.medidasControle) || "",
              tipoMedida: risk.tipoMedida || "",
              prazoAcao: risk.prazoAcao || "",
              responsavelAcao: risk.responsavelAcao || "",
              acompanhamento: risk.acompanhamento || "",
              afericaoResultado: risk.afericaoResultado || "",
              hasPlanSnapshot: Object.prototype.hasOwnProperty.call(
                risk,
                "medidasPrevencaoPlano"
              ),
              },
              {
                calculatedPlanActionVigencia,
                defaultResponsibleActionName,
              }
            );
          })
      );
      const generalRows = planGeneralMeasures.map((item) =>
        materializeEffectivePlanRow(
          {
            id: `plan-general-${item.id}`,
            gheId: PLAN_ALL_GHE_ID,
            riskId: item.id,
            gheName: item.gheName || "Todos os GHEs",
            tipoAgente: "Medidas Gerais",
            descricaoAgente: "Medidas Gerais",
            prioridade: "Média",
            classificacao: "Risco Moderado",
            exposureValue: undefined,
            medidasPrevencao: item.descricao || "",
            tipoMedida: item.tipoMedida || "",
            prazoAcao: item.prazoAcao || "",
            responsavelAcao: item.responsavelAcao || "",
            acompanhamento: item.acompanhamento || "",
            afericaoResultado: item.afericaoResultado || "",
            isCustomPlanRow: true,
          },
          {
            calculatedPlanActionVigencia,
            defaultResponsibleActionName,
          }
        )
      );
      return [...generalRows, ...riskRows];
    },
    [
      calculatedPlanActionVigencia,
      calculateActionPlanClassification,
      calculateExposureFromWorkforceRatio,
      calculateRiskClassification,
      defaultResponsibleActionName,
      planGeneralMeasures,
      riskGheGroups,
      removedPlanRiskKeys,
      totalWorkersAllGhes,
      workersByGheId,
    ]
  );

  const rawPlanTableRowsForPlan = useMemo<PlanTableRow[]>(
    () =>
      rawPlanTableRows.filter((row) =>
        isModerateOrHigherPriority(getPlanPriorityText(row))
      ),
    [rawPlanTableRows]
  );

  const planTableRows = useMemo<PlanTableRow[]>(() => {
    if (!rawPlanTableRowsForPlan.length) return rawPlanTableRowsForPlan;

    const grouped = new Map<
      string,
      {
        firstIndex: number;
        rows: PlanTableRow[];
      }
    >();

    rawPlanTableRowsForPlan.forEach((row, index) => {
      const key = row.isCustomPlanRow
        ? `custom::${row.id}`
        : [
            row.descricaoAgente.trim().toLowerCase(),
            row.tipoAgente.trim().toLowerCase(),
            getPlanPriorityText(row).toLowerCase(),
            String(row.exposureValue || ""),
            row.medidasPrevencao.trim().toLowerCase(),
          ].join("||");
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { firstIndex: index, rows: [row] });
        return;
      }
      existing.rows.push(row);
    });

    const groupedRows = Array.from(grouped.values())
      .sort((a, b) => a.firstIndex - b.firstIndex)
      .map(({ rows }) => {
        if (rows.length === 1) return rows[0];

        const first = rows[0];
        const gheTokens = Array.from(
          new Map(rows.map((row) => [row.gheId, extractGheToken(row.gheName)])).values()
        ).sort(compareGheTokens);

        return {
          ...first,
          id: `plan-grouped-${first.id}-${rows.length}`,
          gheId: "__group__",
          riskId: "__group__",
          gheName: `GHE ${gheTokens.join(", ")}`,
          groupTargets: rows.map((row) => ({
            gheId: row.gheId,
            riskId: row.riskId,
          })),
        };
      });

    return groupedRows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const aPriority = isGeneralMeasuresPlanRow(a.row) ? 0 : 1;
        const bPriority = isGeneralMeasuresPlanRow(b.row) ? 0 : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.index - b.index;
      })
      .map(({ row }) => row);
  }, [rawPlanTableRowsForPlan]);

  const isInicioComplete = isInicioDraftComplete(inicioDraft);
  const isDadosComplete = isDadosCadastraisComplete(dadosCadastrais);

  const isDescricaoComplete =
    allGhesDescribed &&
    remainingCount === 0 &&
    gheGroups.length > 0 &&
    gheGroups.every((ghe) => ghe.items.length > 0);

  const isCaracterizacaoComplete = useMemo(() => {
    if (!riskGheGroups.length) return false;
    let hasAnyRisk = false;
    for (const ghe of riskGheGroups) {
      if (!ghe.risks.length) return false;
      hasAnyRisk = true;
      if (!ghe.risks.every((risk) => isRiskComplete(risk))) return false;
    }
    return hasAnyRisk;
  }, [riskGheGroups]);
  const duplicatedRiskStructureNameGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const ghe of riskGheGroups) {
      if (!ghe.risks.length) continue;
      const signature = ghe.risks
        .map((risk) => getRiskContentKey(risk))
        .sort()
        .join("##");
      const existing = groups.get(signature);
      if (!existing) {
        groups.set(signature, [ghe.name]);
        continue;
      }
      existing.push(ghe.name);
    }
    return Array.from(groups.values()).filter((names) => names.length > 1);
  }, [riskGheGroups]);
  const hasDuplicatedRiskStructure = duplicatedRiskStructureNameGroups.length > 0;
  const isCaracterizacaoStepComplete =
    isCaracterizacaoComplete && !hasDuplicatedRiskStructure;
  const getEffectivePrazoAcao = useCallback(
    (row: PlanTableRow) =>
      String(row.prazoAcao || "").trim() ||
      calculateAutomaticActionDueDate({
        vigencia: calculatedPlanActionVigencia,
        prioridade: row.prioridade || "",
      }),
    [calculatedPlanActionVigencia]
  );

  const isPlanoComplete = useMemo(() => {
    if (!rawPlanTableRowsForPlan.length) return false;
    return rawPlanTableRowsForPlan.every(
      (row) =>
        row.medidasPrevencao.trim().length > 0 &&
        String(row.tipoMedida || "").trim().length > 0 &&
        getEffectivePrazoAcao(row).length > 0 &&
        getEffectivePlanValue(row.acompanhamento, DEFAULT_PLAN_ACOMPANHAMENTO).length >
          0 &&
        getEffectivePlanValue(
          row.afericaoResultado,
          DEFAULT_PLAN_AFERICAO_RESULTADO
        ).length > 0
    );
  }, [getEffectivePrazoAcao, rawPlanTableRowsForPlan]);

  // Histórico é uma etapa sempre considerada completa por regra de negócio.
  const isHistoricoComplete = true;

  const isAnexosComplete = true;

  const missingTargetsByStep = useMemo<
    Partial<Record<PgrStepId, PendingReviewTarget[]>>
  >(() => {
    const missingInicio = getInicioDraftIssues(inicioDraft).map((message) =>
      buildPendingReviewTarget("inicio", message, {
        fieldKey:
          message.includes("Título do card")
            ? "documentTitle"
            : message.includes("Nome da empresa")
              ? "companyName"
              : message.includes("CNPJ")
                ? "cnpj"
                : message.includes("Responsável")
                  ? "responsible"
                  : undefined,
      })
    );
    const missingDados = getDadosCadastraisIssues(dadosCadastrais).map((message) => {
      const normalized = normalizeText(message);
      const establishmentMatch = normalized.match(/^estabelecimento\s+(\d+):/);
      const contractorMatch = normalized.match(/^contratante\s+(\d+):/);
      return buildPendingReviewTarget("dados", message, {
        sectionKey: establishmentMatch
          ? "estabelecimentos"
          : contractorMatch
            ? "contratantes"
            : normalized.includes("responsavel")
              ? "responsavelPgr"
              : "empresa",
        itemIndex: establishmentMatch
          ? Number(establishmentMatch[1]) - 1
          : contractorMatch
            ? Number(contractorMatch[1]) - 1
            : undefined,
        fieldKey: normalized.includes("razao social")
          ? "empresaRazaoSocial"
          : normalized.includes("cnpj da empresa")
            ? "empresaCnpj"
            : normalized.includes("cnae da empresa")
              ? "empresaCnae"
              : normalized.includes("endereco da empresa")
                ? "empresaEndereco"
                : normalized.includes("cidade da empresa")
                  ? "empresaCidade"
                  : normalized.includes("estado da empresa")
                    ? "empresaEstado"
                    : normalized.includes("grau de risco da empresa")
                      ? "empresaGrauRisco"
                      : normalized.includes("nome do estabelecimento")
                        ? "nome"
                        : normalized.includes("cnpj do estabelecimento")
                          ? "cnpj"
                          : normalized.includes("grau de risco do estabelecimento")
                            ? "grauRisco"
                            : normalized.includes("nome do responsavel pgr")
                              ? "responsavelPgrNome"
                              : normalized.includes("telefone do responsavel pgr")
                                ? "responsavelPgrTelefone"
                                : normalized.includes("email do responsavel pgr")
                                  ? "responsavelPgrEmail"
                                  : normalized.includes("cpf do responsavel pgr")
                                    ? "responsavelPgrCpf"
                              : undefined,
      });
    });
    const technicalCoordinator = dadosCadastrais.responsaveisCoordenacaoTecnica?.[0];
    if (technicalCoordinator) {
      const coordinatorIssues = [
        !technicalCoordinator.nome.trim() ? "Responsável técnico: Nome é obrigatório." : "",
        !technicalCoordinator.funcao.trim() ? "Responsável técnico: Função é obrigatória." : "",
        !technicalCoordinator.telefone.trim()
          ? "Responsável técnico: Telefone é obrigatório."
          : isValidPhoneBr(technicalCoordinator.telefone)
            ? ""
            : "Responsável técnico: Telefone inválido.",
        !technicalCoordinator.email.trim()
          ? "Responsável técnico: E-mail é obrigatório."
          : isValidEmail(technicalCoordinator.email)
            ? ""
            : "Responsável técnico: E-mail inválido.",
        !technicalCoordinator.cpf.trim()
          ? "Responsável técnico: CPF é obrigatório."
          : isValidCpf(technicalCoordinator.cpf)
            ? ""
            : "Responsável técnico: CPF inválido.",
      ].filter(Boolean);
      coordinatorIssues.forEach((message) => {
        const normalized = normalizeText(message);
        missingDados.push(
          buildPendingReviewTarget("dados", message, {
            sectionKey: "technical-coordinators",
            itemIndex: 0,
            fieldKey: normalized.includes("nome")
              ? "technicalCoordinatorNome"
              : normalized.includes("funcao")
                ? "technicalCoordinatorFuncao"
                : normalized.includes("telefone")
                  ? "technicalCoordinatorTelefone"
                  : normalized.includes("email")
                    ? "technicalCoordinatorEmail"
                    : normalized.includes("cpf")
                      ? "technicalCoordinatorCpf"
                      : undefined,
          })
        );
      });
    }

    const missingDescricao: PendingReviewTarget[] = [];
    if (!gheGroups.length) {
      missingDescricao.push(
        buildPendingReviewTarget("descricao", "Adicionar ao menos um GHE.", {
          fieldKey: "create-ghe",
          sectionKey: "ghe-header",
        })
      );
    }
    if (remainingCount > 0) {
      missingDescricao.push(
        buildPendingReviewTarget(
          "descricao",
          `Associar todas as funções aos GHEs (${remainingCount} restantes).`,
          {
            fieldKey: "assign-functions",
            sectionKey: "available-functions",
          }
        )
      );
    }
    gheGroups.forEach((ghe) => {
      if (!ghe.items.length) {
        missingDescricao.push(
          buildPendingReviewTarget(
            "descricao",
            `${ghe.name}: adicionar ao menos uma função associada.`,
            {
              gheId: ghe.id,
              gheName: ghe.name,
              fieldKey: "assign-functions",
              sectionKey: "ghe-functions",
            }
          )
        );
      }
      const gheInfoIssues = getGheInfoIssues(ghe.info);
      gheInfoIssues.forEach((issue) => {
        missingDescricao.push(
          buildPendingReviewTarget("descricao", `${ghe.name}: ${issue}`, {
            gheId: ghe.id,
            gheName: ghe.name,
            fieldKey: issue.includes("Processo")
              ? "processo"
              : issue.includes("Observações")
                ? "observacoes"
                : issue.includes("Ambiente")
                  ? "ambiente"
                  : undefined,
            sectionKey: "ghe-info",
          })
        );
      });
    });

    const missingCaracterizacao: PendingReviewTarget[] = [];
    if (!riskGheGroups.length) {
      missingCaracterizacao.push(
        buildPendingReviewTarget(
          "caracterizacao",
          "Adicionar ao menos um GHE para caracterização.",
          {
            fieldKey: "add-ghe",
            sectionKey: "ghe-list",
          }
        )
      );
    } else {
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
        if (!ghe.risks.length) {
          missingCaracterizacao.push(
            buildPendingReviewTarget(
              "caracterizacao",
              `${ghe.name}: adicionar ao menos um risco.`,
              {
                gheId: ghe.id,
                gheName: ghe.name,
                fieldKey: "add-risk",
                sectionKey: "risk-list",
              }
            )
          );
          return;
        }
        ghe.risks.forEach((risk, index) => {
          const riskLabelParts = [
            String(risk.tipoAgente || "").trim(),
            String(risk.descricaoAgente || "").trim(),
          ].filter(Boolean);
          const riskLabel =
            riskLabelParts.length > 0
              ? riskLabelParts.join(" · ")
              : `Risco ${index + 1}`;
          const descriptionKey = getRiskDescriptionKey(risk.tipoAgente, risk.descricaoAgente);
          const isDuplicateDescription =
            !!descriptionKey &&
            (duplicateCountByGhe.get(ghe.id)?.get(descriptionKey) || 0) > 1;
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
          const extendedRiskIssues = uniqueValues([
            ...getRiskIssues(risk),
            !hasValue(risk.descricaoAgente)
              ? ""
              : isDuplicateDescription
                ? "Este risco já foi cadastrado neste GHE."
                : "",
            isQuantitativeEvaluation
              ? hasValue(risk.unidadeMedida)
                ? ""
                : "Unidade de Medida é obrigatória."
              : "",
            isQuantitativeEvaluation
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
            isCalculatedQualitativeEvaluation
              ? ""
              : hasValue(risk.intensidade)
                ? isQuantitativeEvaluation
                  ? isValidQuantitativeMeasurementValue(String(risk.intensidade || ""))
                    ? ""
                    : "Intensidade/Concentração deve ser numérica ou comparador válido, como <80, >80, <=80 ou >=80."
                  : ""
                : "Intensidade/Concentração é obrigatória.",
          ]);
          extendedRiskIssues.forEach((issue) => {
            missingCaracterizacao.push(
              buildPendingReviewTarget(
                "caracterizacao",
                `${ghe.name} · ${riskLabel}: ${issue}`,
                {
                  gheId: ghe.id,
                  gheName: ghe.name,
                  riskId: risk.id,
                  fieldKey: getRiskIssueFieldKey(issue),
                  sectionKey: "risk-card",
                }
              )
            );
          });
        });
      });
      if (hasDuplicatedRiskStructure) {
        missingCaracterizacao.push(
          buildPendingReviewTarget(
            "caracterizacao",
            "Os seguintes GHEs possuem a mesma estrutura de caracterização de risco:",
            {
              fieldKey: "duplicate-structure",
              sectionKey: "ghe-list",
            }
          )
        );
        duplicatedRiskStructureNameGroups.forEach((gheNames) => {
          missingCaracterizacao.push(
            buildPendingReviewTarget("caracterizacao", `• ${gheNames.join(", ")}.`, {
              fieldKey: "duplicate-structure",
              sectionKey: "ghe-list",
            })
          );
        });
      }
    }

    const missingPlano: PendingReviewTarget[] = [];
    if (!rawPlanTableRowsForPlan.length) {
      missingPlano.push(
        buildPendingReviewTarget("plano", "Adicionar riscos na etapa de caracterização.", {
          fieldKey: "add-risks",
          sectionKey: "plan-table",
        })
      );
    } else {
      rawPlanTableRowsForPlan.forEach((row) => {
        if (row.medidasPrevencao.trim().length === 0) {
          missingPlano.push(
            buildPendingReviewTarget(
              "plano",
              `${row.gheName}: preencher medidas de prevenção para ${row.descricaoAgente}.`,
              {
                gheId: row.gheId,
                gheName: row.gheName,
                riskId: row.riskId,
                fieldKey: "medidasPrevencao",
                sectionKey: "plan-table",
              }
            )
          );
        }
        if (String(row.tipoMedida || "").trim().length === 0) {
          missingPlano.push(
            buildPendingReviewTarget(
              "plano",
              `${row.gheName}: preencher tipo de medida de prevenção para ${row.descricaoAgente}.`,
              {
                gheId: row.gheId,
                gheName: row.gheName,
                riskId: row.riskId,
                fieldKey: "tipoMedida",
                sectionKey: "plan-table",
              }
            )
          );
        }
        if (getEffectivePrazoAcao(row).length === 0) {
          missingPlano.push(
            buildPendingReviewTarget(
              "plano",
              `${row.gheName}: preencher prazo para realização da ação para ${row.descricaoAgente}.`,
              {
                gheId: row.gheId,
                gheName: row.gheName,
                riskId: row.riskId,
                fieldKey: "prazoAcao",
                sectionKey: "plan-table",
              }
            )
          );
        }
        if (
          String(
            getEffectivePlanValue(row.acompanhamento, DEFAULT_PLAN_ACOMPANHAMENTO)
          ).trim().length === 0
        ) {
          missingPlano.push(
            buildPendingReviewTarget(
              "plano",
              `${row.gheName}: preencher acompanhamento das medidas de prevenção para ${row.descricaoAgente}.`,
              {
                gheId: row.gheId,
                gheName: row.gheName,
                riskId: row.riskId,
                fieldKey: "acompanhamento",
                sectionKey: "plan-table",
              }
            )
          );
        }
        if (
          String(
            getEffectivePlanValue(
              row.afericaoResultado,
              DEFAULT_PLAN_AFERICAO_RESULTADO
            )
          ).trim().length === 0
        ) {
          missingPlano.push(
            buildPendingReviewTarget(
              "plano",
              `${row.gheName}: preencher aferição de resultados para ${row.descricaoAgente}.`,
              {
                gheId: row.gheId,
                gheName: row.gheName,
                riskId: row.riskId,
                fieldKey: "afericaoResultado",
                sectionKey: "plan-table",
              }
            )
          );
        }
      });
    }

    const missingAnexos: PendingReviewTarget[] = [];

    return {
      inicio: missingInicio,
      dados: missingDados,
      descricao: missingDescricao,
      caracterizacao: missingCaracterizacao,
      plano: missingPlano,
      anexos: missingAnexos,
      historico: [],
      revisao: [],
    };
  }, [
    dadosCadastrais,
    gheGroups,
    getIsCalculatedCriteria,
    inicioDraft,
    rawPlanTableRowsForPlan,
    getEffectivePrazoAcao,
    remainingCount,
    riskGheGroups,
    hasDuplicatedRiskStructure,
    duplicatedRiskStructureNameGroups,
  ]);

  const missingFieldsByStep = useMemo<Partial<Record<PgrStepId, string[]>>>(
    () =>
      Object.fromEntries(
        Object.entries(missingTargetsByStep).map(([stepId, targets]) => [
          stepId,
          uniqueValues((targets || []).map((target) => target.message)),
        ])
      ) as Partial<Record<PgrStepId, string[]>>,
    [missingTargetsByStep]
  );

  const stepStatusById = useMemo<Partial<Record<PgrStepId, boolean>>>(
    () => ({
      inicio: isInicioComplete,
      historico: isHistoricoComplete,
      dados: isDadosComplete,
      descricao: isDescricaoComplete,
      caracterizacao: isCaracterizacaoStepComplete,
      plano: isPlanoComplete,
      anexos: isAnexosComplete,
      revisao:
        isInicioComplete &&
        isHistoricoComplete &&
        isDadosComplete &&
        isDescricaoComplete &&
        isCaracterizacaoStepComplete &&
        isPlanoComplete &&
        isAnexosComplete,
    }),
    [
      isInicioComplete,
      isAnexosComplete,
      isCaracterizacaoStepComplete,
      isDadosComplete,
      isDescricaoComplete,
      isHistoricoComplete,
      isPlanoComplete,
    ]
  );

  const alertSteps = useMemo<Partial<Record<PgrStepId, boolean>>>(
    () => {
      const currentStepIndex = pgrSteps.findIndex((step) => step.id === currentStepId);
      const shouldAlertStepWhenAdvanced = (stepId: PgrStepId, isComplete: boolean) => {
        if (stepId === "historico") return false;
        const index = pgrSteps.findIndex((step) => step.id === stepId);
        if (index < 0) return false;
        const isCurrentAndIncomplete = currentStepId === stepId && !isComplete;
        const isBeforeCurrentAndIncomplete = currentStepIndex > index && !isComplete;
        return (
          (completedSteps > index && !isComplete) ||
          isBeforeCurrentAndIncomplete ||
          isCurrentAndIncomplete
        );
      };
      return {
        inicio: shouldAlertStepWhenAdvanced("inicio", isInicioComplete),
        historico: false,
        dados: shouldAlertStepWhenAdvanced("dados", isDadosComplete),
        descricao: shouldAlertStepWhenAdvanced("descricao", isDescricaoComplete),
        caracterizacao: shouldAlertStepWhenAdvanced(
          "caracterizacao",
          isCaracterizacaoStepComplete
        ),
        plano: shouldAlertStepWhenAdvanced("plano", isPlanoComplete),
        anexos: shouldAlertStepWhenAdvanced("anexos", isAnexosComplete),
      };
    },
    [
      currentStepId,
      completedSteps,
      isAnexosComplete,
      isCaracterizacaoStepComplete,
      isDadosComplete,
      isDescricaoComplete,
      isInicioComplete,
      isPlanoComplete,
    ]
  );

  const planActionAvailableGheGroups = useMemo(
    () => riskGheGroups.filter((ghe) => ghe.risks.length > 0),
    [riskGheGroups]
  );
  const planActionGheOptions = useMemo(
    () => planActionAvailableGheGroups.map((ghe) => ({ label: ghe.name, value: ghe.id })),
    [planActionAvailableGheGroups]
  );
  const selectedPlanActionGhe =
    planActionAvailableGheGroups.find((ghe) => ghe.id === planActionGheId) ??
    planActionAvailableGheGroups[0];
  const getPlanActionRiskOptions = useCallback(
    (selectedGheIds: string[]) =>
      buildCommonRiskOptionsForGhes(planActionAvailableGheGroups, selectedGheIds),
    [planActionAvailableGheGroups]
  );
  const planActionRiskOptions = useMemo(
    () => getPlanActionRiskOptions(selectedPlanActionGhe ? [selectedPlanActionGhe.id] : []),
    [getPlanActionRiskOptions, selectedPlanActionGhe]
  );

  const planTableTotalPages = Math.max(1, Math.ceil(planTableRows.length / planTablePageSize));
  const planTableCurrentPage = Math.min(planTablePage, planTableTotalPages);
  const planTableStart = (planTableCurrentPage - 1) * planTablePageSize;
  const planTableRowsPage = planTableRows.slice(planTableStart, planTableStart + planTablePageSize);

  return {
    tipoAgenteOptions,
    applyMissingRiskDefaults,
    getDescricaoAgenteOptions,
    getMeioPropagacaoOptions,
    getFontesOptions,
    getDanosSaudeOptions,
    getTipoAvaliacaoOptions,
    getUnidadeMedidaOptions,
    getIntensidadeOptions,
    getIsCalculatedCriteria,
    getHasQuantitativeCriteria,
    getNivelAcaoOptions,
    getSeveridadeOptions,
    getMedidasControleOptions,
    getNormasOptions,
    getActionDescriptionOptions,
    getEpiOptions,
    getEpcOptions,
    calculateRiskClassification,
    diretrizOptions,
    estabelecimentoOptions,
    normalizedGheSearch,
    functionMap,
    functionAssignments,
    availableFunctions,
    groupedFunctions,
    availableCountLabel,
    currentGhe,
    nextExistingGhe,
    currentGheName,
    currentItems,
    isGheInfoComplete,
    describedGheCount,
    allGhesDescribed,
    remainingCount,
    canOpenInfoModal,
    canCreateNextGhe,
    filteredAllFunctions,
    filteredGheGroupsForList,
    assignGheOptions,
    planTableRows,
    stepStatusById,
    missingFieldsByStep,
    missingTargetsByStep,
    alertSteps,
    planActionGheOptions,
    getPlanActionRiskOptions,
    planActionRiskOptions,
    planTableTotalPages,
    planTableCurrentPage,
    planTableRowsPage,
  };
}
