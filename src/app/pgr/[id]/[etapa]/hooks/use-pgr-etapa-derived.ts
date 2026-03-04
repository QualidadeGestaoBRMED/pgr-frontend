import { useMemo } from "react";
import { pgrSteps, type PgrStepId } from "@/app/pgr/steps";
import { hasMeaningfulSelections, useRiskCatalogHelpers } from "./use-risk-catalog-helpers";
import type { GheGroup, GheRisk, PgrFunction, RiskCatalogPayload, RiskGheGroup } from "../types";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { AnexoItem, HistoricoData } from "../types";

type PlanTableRow = {
  id: string;
  gheId: string;
  riskId: string;
  gheName: string;
  descricaoAgente: string;
  classificacao: string;
  medidasPrevencao: string;
  groupTargets?: Array<{ gheId: string; riskId: string }>;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function usePgrEtapaDerived({
  riskCatalogs,
  functionsData,
  gheGroups,
  currentGheId,
  searchTerm,
  gheSearch,
  gheFilterId,
  riskGheGroups,
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

  const { tipoAgenteOptions, applyMissingRiskDefaults, getDescricaoAgenteOptions } =
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
    return (
      ghe.info.processo.trim().length > 0 &&
      ghe.info.observacoes.trim().length > 0 &&
      ghe.info.ambiente.trim().length > 0
    );
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

  const rawPlanTableRows = useMemo<PlanTableRow[]>(
    () =>
      riskGheGroups.flatMap((ghe) =>
        ghe.risks.map((risk) => ({
          id: `${ghe.id}-${risk.id}`,
          gheId: ghe.id,
          riskId: risk.id,
          gheName: ghe.name,
          descricaoAgente: risk.descricaoAgente || "Não informado",
          classificacao: risk.classificacao || "Não informado",
          medidasPrevencao: risk.medidasControle || "",
        }))
      ),
    [riskGheGroups]
  );

  const planTableRows = useMemo<PlanTableRow[]>(() => {
    if (!rawPlanTableRows.length) return rawPlanTableRows;

    const measures = rawPlanTableRows.map((row) => row.medidasPrevencao.trim());
    const allHaveMeasure = measures.every((value) => value.length > 0);
    if (!allHaveMeasure) return rawPlanTableRows;

    const normalizedUniqueMeasures = new Set(measures.map((value) => value.toLowerCase()));
    if (normalizedUniqueMeasures.size !== 1) return rawPlanTableRows;

    const gheEntries = Array.from(
      new Map(rawPlanTableRows.map((row) => [row.gheId, row.gheName])).entries()
    )
      .map(([gheId, gheName]) => {
        const token = gheName.replace(/^ghe\s*/i, "").trim();
        const numberMatch = token.match(/\d+/);
        return {
          gheId,
          token: numberMatch ? numberMatch[0] : token || gheName,
        };
      })
      .sort((a, b) => {
        const aNum = Number(a.token);
        const bNum = Number(b.token);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        if (Number.isFinite(aNum)) return -1;
        if (Number.isFinite(bNum)) return 1;
        return a.token.localeCompare(b.token, "pt-BR", { sensitivity: "base" });
      });

    return [
      {
        id: "plan-grouped-all-ghes-same-measure",
        gheId: "__group__",
        riskId: "__group__",
        gheName: gheEntries.map((entry) => entry.token).join(","),
        descricaoAgente: "Múltiplos agentes",
        classificacao: "Múltiplas classificações",
        medidasPrevencao: measures[0],
        groupTargets: rawPlanTableRows.map((row) => ({
          gheId: row.gheId,
          riskId: row.riskId,
        })),
      },
    ];
  }, [rawPlanTableRows]);

  const isInicioComplete =
    inicioDraft.documentTitle.trim().length > 0 &&
    inicioDraft.companyName.trim().length > 0 &&
    inicioDraft.cnpj.trim().length > 0 &&
    inicioDraft.responsible.trim().length > 0 &&
    inicioDraft.email.trim().length > 0;

  const isDadosComplete =
    dadosCadastrais.empresaRazaoSocial.trim().length > 0 &&
    dadosCadastrais.empresaCnpj.trim().length > 0 &&
    dadosCadastrais.empresaCnae.trim().length > 0 &&
    dadosCadastrais.empresaEndereco.trim().length > 0 &&
    dadosCadastrais.empresaCidade.trim().length > 0 &&
    dadosCadastrais.empresaEstado.trim().length > 0 &&
    dadosCadastrais.responsavelPgrNome.trim().length > 0 &&
    dadosCadastrais.responsavelPgrFuncao.trim().length > 0 &&
    dadosCadastrais.responsavelPgrTelefone.trim().length > 0 &&
    dadosCadastrais.responsavelPgrEmail.trim().length > 0 &&
    dadosCadastrais.responsavelPgrCpf.trim().length > 0;

  const isDescricaoComplete =
    allGhesDescribed &&
    remainingCount === 0 &&
    gheGroups.length > 0 &&
    gheGroups.every((ghe) => ghe.items.length > 0);

  const isCaracterizacaoComplete = useMemo(() => {
    const isRiskFullyFilled = (risk: GheRisk) =>
      risk.tipoAgente.trim().length > 0 &&
      risk.descricaoAgente.trim().length > 0 &&
      risk.perigo.trim().length > 0 &&
      risk.meioPropagacao.trim().length > 0 &&
      risk.fontes.trim().length > 0 &&
      risk.tipoAvaliacao.trim().length > 0 &&
      risk.intensidade.trim().length > 0 &&
      risk.severidade.trim().length > 0 &&
      risk.probabilidade.trim().length > 0 &&
      risk.classificacao.trim().length > 0 &&
      risk.medidasControle.trim().length > 0 &&
      hasMeaningfulSelections(risk.epc) &&
      hasMeaningfulSelections(risk.epi);

    if (!riskGheGroups.length) return false;
    let hasAnyRisk = false;
    for (const ghe of riskGheGroups) {
      if (!ghe.risks.length) return false;
      hasAnyRisk = true;
      if (!ghe.risks.every((risk) => isRiskFullyFilled(risk))) return false;
    }
    return hasAnyRisk;
  }, [riskGheGroups]);

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

  const stepStatusById = useMemo<Partial<Record<PgrStepId, boolean>>>(
    () => ({
      inicio: isInicioComplete,
      historico: isHistoricoComplete,
      dados: isDadosComplete,
      descricao: isDescricaoComplete,
      caracterizacao: isCaracterizacaoComplete,
      plano: isPlanoComplete,
      anexos: isAnexosComplete,
      revisao:
        isInicioComplete &&
        isHistoricoComplete &&
        isDadosComplete &&
        isDescricaoComplete &&
        isCaracterizacaoComplete &&
        isPlanoComplete &&
        isAnexosComplete,
    }),
    [
      isInicioComplete,
      isAnexosComplete,
      isCaracterizacaoComplete,
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
        caracterizacao: shouldAlertStepWhenAdvanced("caracterizacao", isCaracterizacaoComplete),
        plano: shouldAlertStepWhenAdvanced("plano", isPlanoComplete),
        anexos: shouldAlertStepWhenAdvanced("anexos", isAnexosComplete),
      };
    },
    [
      currentStepId,
      completedSteps,
      isAnexosComplete,
      isCaracterizacaoComplete,
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
    alertSteps,
    planActionGheOptions,
    planActionRiskOptions,
    planTableTotalPages,
    planTableCurrentPage,
    planTableRowsPage,
  };
}
