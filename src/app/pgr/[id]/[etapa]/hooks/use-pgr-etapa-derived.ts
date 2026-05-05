import { useMemo } from "react";
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
import type { GheGroup, PgrFunction, RiskCatalogPayload, RiskGheGroup } from "../types";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { AnexoItem, HistoricoData } from "../types";

type PlanTableRow = {
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
  groupTargets?: Array<{ gheId: string; riskId: string }>;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const uniqueValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

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

  const rawPlanTableRows = useMemo<PlanTableRow[]>(
    () => {
      const excludedKeys = new Set(removedPlanRiskKeys);
      return riskGheGroups.flatMap((ghe) =>
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
            const exposureValue = exposureFromWorkforce?.exposureValue;
            const actionPlanCalculated =
              riskCalculated?.classificationId && exposureValue
                ? calculateActionPlanClassification({
                    riskEvaluationClassificationId: riskCalculated.classificationId,
                    exposure: exposureValue,
                  })
                : null;

            return {
              id: `${ghe.id}-${risk.id}`,
              gheId: ghe.id,
              riskId: risk.id,
              gheName: ghe.name,
              tipoAgente: risk.tipoAgente || "",
              descricaoAgente: risk.descricaoAgente || "Não informado",
              prioridade:
                actionPlanCalculated?.classification ||
                riskCalculated?.classification ||
                risk.classificacao ||
                "Não informado",
              classificacao: risk.classificacao || "Não informado",
              exposureValue,
              medidasPrevencao: risk.medidasControle || "",
            };
          })
      );
    },
    [
      calculateActionPlanClassification,
      calculateExposureFromWorkforceRatio,
      calculateRiskClassification,
      riskGheGroups,
      removedPlanRiskKeys,
      totalWorkersAllGhes,
      workersByGheId,
    ]
  );

  const planTableRows = useMemo<PlanTableRow[]>(() => {
    if (!rawPlanTableRows.length) return rawPlanTableRows;

    const grouped = new Map<
      string,
      {
        firstIndex: number;
        rows: PlanTableRow[];
      }
    >();

    rawPlanTableRows.forEach((row, index) => {
      const key = [
        row.descricaoAgente.trim().toLowerCase(),
        row.tipoAgente.trim().toLowerCase(),
        row.prioridade.trim().toLowerCase(),
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

    return Array.from(grouped.values())
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
  }, [rawPlanTableRows]);

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

  const isPlanoComplete = useMemo(() => {
    if (!rawPlanTableRows.length) return false;
    return rawPlanTableRows.every((row) => row.medidasPrevencao.trim().length > 0);
  }, [rawPlanTableRows]);

  // Histórico é uma etapa sempre considerada completa por regra de negócio.
  const isHistoricoComplete = true;

  const isAnexosComplete = useMemo(
    () => anexos.some((anexo) => anexo.files.length > 0),
    [anexos]
  );

  const missingFieldsByStep = useMemo<Partial<Record<PgrStepId, string[]>>>(() => {
    const missingInicio = getInicioDraftIssues(inicioDraft);
    const missingDados = getDadosCadastraisIssues(dadosCadastrais);

    const missingDescricao: string[] = [];
    if (!gheGroups.length) {
      missingDescricao.push("Adicionar ao menos um GHE.");
    }
    if (remainingCount > 0) {
      missingDescricao.push(
        `Associar todas as funções aos GHEs (${remainingCount} restantes).`
      );
    }
    gheGroups.forEach((ghe) => {
      if (!ghe.items.length) {
        missingDescricao.push(`${ghe.name}: adicionar ao menos uma função associada.`);
      }
      const gheInfoIssues = getGheInfoIssues(ghe.info);
      gheInfoIssues.forEach((issue) => {
        missingDescricao.push(`${ghe.name}: ${issue}`);
      });
    });

    const missingCaracterizacao: string[] = [];
    if (!riskGheGroups.length) {
      missingCaracterizacao.push("Adicionar ao menos um GHE para caracterização.");
    } else {
      riskGheGroups.forEach((ghe) => {
        if (!ghe.risks.length) {
          missingCaracterizacao.push(`${ghe.name}: adicionar ao menos um risco.`);
          return;
        }
        ghe.risks.forEach((risk, index) => {
          const riskIssues = getRiskIssues(risk);
          riskIssues.forEach((issue) => {
            missingCaracterizacao.push(`${ghe.name} · Risco ${index + 1}: ${issue}`);
          });
        });
      });
      if (hasDuplicatedRiskStructure) {
        missingCaracterizacao.push(
          "Os seguintes GHEs possuem a mesma estrutura de caracterização de risco:"
        );
        duplicatedRiskStructureNameGroups.forEach((gheNames) => {
          missingCaracterizacao.push(`• ${gheNames.join(", ")}.`);
        });
      }
    }

    const missingPlano: string[] = [];
    if (!rawPlanTableRows.length) {
      missingPlano.push("Adicionar riscos na etapa de caracterização.");
    } else {
      rawPlanTableRows.forEach((row) => {
        if (row.medidasPrevencao.trim().length > 0) return;
        missingPlano.push(
          `${row.gheName}: preencher medidas de prevenção para ${row.descricaoAgente}.`
        );
      });
    }

    const missingAnexos = isAnexosComplete
      ? []
      : ["Anexar ao menos um arquivo em qualquer item de anexo."];

    return {
      inicio: uniqueValues(missingInicio),
      dados: uniqueValues(missingDados),
      descricao: uniqueValues(missingDescricao),
      caracterizacao: uniqueValues(missingCaracterizacao),
      plano: uniqueValues(missingPlano),
      anexos: uniqueValues(missingAnexos),
      historico: [],
      revisao: [],
    };
  }, [
    dadosCadastrais,
    gheGroups,
    inicioDraft,
    isAnexosComplete,
    rawPlanTableRows,
    remainingCount,
    riskGheGroups,
    hasDuplicatedRiskStructure,
    duplicatedRiskStructureNameGroups,
  ]);

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

  const planActionGheOptions = useMemo(
    () => riskGheGroups.map((ghe) => ({ label: ghe.name, value: ghe.id })),
    [riskGheGroups]
  );
  const selectedPlanActionGhe =
    riskGheGroups.find((ghe) => ghe.id === planActionGheId) ?? riskGheGroups[0];
  const planActionRiskOptions = useMemo(() => {
    if (!selectedPlanActionGhe) return [];
    return selectedPlanActionGhe.risks.map((risk, index) => ({
      label: `${risk.descricaoAgente || `Risco ${index + 1}`} · ${
        risk.classificacao || "Sem classificação"
      }`,
      value: risk.id,
    }));
  }, [selectedPlanActionGhe]);

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
    alertSteps,
    planActionGheOptions,
    planActionRiskOptions,
    planTableTotalPages,
    planTableCurrentPage,
    planTableRowsPage,
  };
}
