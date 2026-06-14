import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { apiGet } from "@/lib/api";
import { putPgrState, setKnownUpdatedAt } from "../state/state-version";
import { pgrSteps } from "@/app/pgr/steps";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type {
  AnexoItem,
  GheGroup,
  GheRisk,
  HistoricoData,
  PgrFunction,
  PlanGeneralMeasureRow,
  RiskCatalogPayload,
  RiskGheGroup,
} from "../types";
import type { PersistedPgrState } from "../state/runtime-cache";
import { syncLegacyContractorFields } from "../utils/contractors";
import {
  DEFAULT_PDF_LAYOUT_STATE,
  normalizePdfLayoutState,
  type PdfLayoutState,
} from "@/lib/pgr-pdf-runtime/layout";

// Último PGR para o qual já forçamos a reconstrução do catálogo de risco.
// O catálogo é refeito (refresh=1) ao ABRIR um card; navegar entre etapas do
// mesmo card reaproveita o cache do backend (sem refresh, sem reconstrução).
let lastCatalogRefreshedPgrId: string | null = null;

type CardMeta = PersistedPgrState["cardMeta"];
type ExtraField = PersistedPgrState["extraEstabelecimentoFields"][number];
type PlanAction = PersistedPgrState["planAction"];
type Workflow = PersistedPgrState["workflow"];

type PersistPayload = {
  completedSteps: number;
  meta: {
    pgrId: string;
    progressPercent: number;
  };
  inicioDraft: InicioDraft;
  dadosCadastrais: DadosCadastraisDraft;
  cardMeta: CardMeta;
  historico: HistoricoData;
  functions: PgrFunction[];
  extraEstabelecimentoFields: ExtraField[];
  estabelecimentoSelecionado: string;
  planAction: PlanAction;
  persistedOptionsByRowId: Record<string, string[]>;
  removedPlanRiskKeys: string[];
  planGeneralMeasures: PlanGeneralMeasureRow[];
  anexos: AnexoItem[];
  anexoDiretriz: string;
  gheGroups: GheGroup[];
  currentGheId: string;
  riskGheGroups: RiskGheGroup[];
  currentRiskGheId: string;
  pdfLayout: PdfLayoutState;
  workflow: Workflow;
};

type BackendStateResponse = Partial<{
  completedSteps: number;
  meta: Partial<{
    pgrId: string;
    progressPercent: number;
  }>;
  inicioDraft: Partial<InicioDraft>;
  dadosCadastrais: Partial<DadosCadastraisDraft>;
  cardMeta: Partial<CardMeta> & { companyPipefyId?: string; responsiblePipefyId?: string };
  historico: Partial<HistoricoData> & { changes?: HistoricoData["changes"] };
  functions: PgrFunction[];
  extraEstabelecimentoFields: Array<Partial<ExtraField>>;
  estabelecimentoSelecionado: string;
  planAction: Partial<PlanAction>;
  persistedOptionsByRowId?: Record<string, string[]>;
  removedPlanRiskKeys: string[];
  planGeneralMeasures: PlanGeneralMeasureRow[];
  anexos: AnexoItem[];
  anexoDiretriz: string;
  gheGroups: GheGroup[];
  currentGheId: string;
  riskGheGroups: Array<Omit<RiskGheGroup, "risks"> & { risks?: GheRisk[] }>;
  currentRiskGheId: string;
  pdfLayout: unknown;
  workflow: Partial<Workflow>;
  updatedAt: string;
}>;

type UsePgrPersistenceContext = {
  params: { id: string };
  shouldHydrateFromApi: boolean;
  defaultHistorico: HistoricoData;
  initialInicioDraft: InicioDraft;
  initialDadosCadastrais: DadosCadastraisDraft;
  defaultAnexos: AnexoItem[];
  applyMissingRiskDefaults: (risk: GheRisk) => GheRisk;
  areStringArraysEqual: (a: string[], b: string[]) => boolean;
  riskCatalogs: RiskCatalogPayload | null;
  setRiskCatalogs: Dispatch<SetStateAction<RiskCatalogPayload | null>>;
  setters: {
    setCompletedSteps: Dispatch<SetStateAction<number>>;
    setProgressPercent: Dispatch<SetStateAction<number>>;
    setInicioDraft: Dispatch<SetStateAction<InicioDraft>>;
    setDadosCadastrais: Dispatch<SetStateAction<DadosCadastraisDraft>>;
    setCardMeta: Dispatch<SetStateAction<CardMeta>>;
    setHistoricoData: Dispatch<SetStateAction<HistoricoData>>;
    setFunctionsData: Dispatch<SetStateAction<PgrFunction[]>>;
    setExtraEstabelecimentoFields: Dispatch<SetStateAction<ExtraField[]>>;
    setEstabelecimentoSelecionado: Dispatch<SetStateAction<string>>;
    setPlanAction: Dispatch<SetStateAction<PlanAction>>;
    setPersistedOptionsByRowId: Dispatch<SetStateAction<Record<string, string[]>>>;
    setRemovedPlanRiskKeys: Dispatch<SetStateAction<string[]>>;
    setPlanGeneralMeasures: Dispatch<SetStateAction<PlanGeneralMeasureRow[]>>;
    setAnexos: Dispatch<SetStateAction<AnexoItem[]>>;
    setAnexoDiretriz: Dispatch<SetStateAction<string>>;
    setGheGroups: Dispatch<SetStateAction<GheGroup[]>>;
    setCurrentGheId: Dispatch<SetStateAction<string>>;
    setRiskGheGroups: Dispatch<SetStateAction<RiskGheGroup[]>>;
    setCurrentRiskGheId: Dispatch<SetStateAction<string>>;
    setPdfLayout: Dispatch<SetStateAction<PdfLayoutState>>;
    setWorkflow: Dispatch<SetStateAction<Workflow>>;
    setIsStateLoading: Dispatch<SetStateAction<boolean>>;
  };
  state: {
    completedSteps: number;
    progressPercent: number;
    inicioDraft: InicioDraft;
    dadosCadastrais: DadosCadastraisDraft;
    cardMeta: CardMeta;
    historicoData: HistoricoData;
    functionsData: PgrFunction[];
    extraEstabelecimentoFields: ExtraField[];
    estabelecimentoSelecionado: string;
    planAction: PlanAction;
    persistedOptionsByRowId: Record<string, string[]>;
    removedPlanRiskKeys: string[];
    planGeneralMeasures: PlanGeneralMeasureRow[];
    anexos: AnexoItem[];
    anexoDiretriz: string;
    gheGroups: GheGroup[];
    currentGheId: string;
    riskGheGroups: RiskGheGroup[];
    currentRiskGheId: string;
    pdfLayout: PdfLayoutState;
    workflow: Workflow;
    isStateLoading: boolean;
  };
  refs: {
    saveTimerRef: MutableRefObject<number | null>;
    lastCompletedSyncRef: MutableRefObject<number | null>;
  };
  setRuntimeCachedStateFn: (pgrId: string, state: PersistedPgrState) => void;
};

export function usePgrPersistence(ctx: UsePgrPersistenceContext) {
  const {
    params,
    shouldHydrateFromApi,
    defaultHistorico,
    initialInicioDraft,
    initialDadosCadastrais,
    defaultAnexos,
    applyMissingRiskDefaults,
    areStringArraysEqual,
    riskCatalogs,
    setRiskCatalogs,
    setters,
    state,
    refs,
    setRuntimeCachedStateFn,
  } = ctx;

  const {
    setCompletedSteps,
    setProgressPercent,
    setInicioDraft,
    setDadosCadastrais,
    setCardMeta,
    setHistoricoData,
    setFunctionsData,
    setExtraEstabelecimentoFields,
    setEstabelecimentoSelecionado,
    setPlanAction,
    setPersistedOptionsByRowId,
    setRemovedPlanRiskKeys,
    setPlanGeneralMeasures,
    setAnexos,
    setAnexoDiretriz,
    setGheGroups,
    setCurrentGheId,
    setRiskGheGroups,
    setCurrentRiskGheId,
    setPdfLayout,
    setWorkflow,
    setIsStateLoading,
  } = setters;

  const {
    completedSteps,
    progressPercent,
    inicioDraft,
    dadosCadastrais,
    cardMeta,
    historicoData,
    functionsData,
    extraEstabelecimentoFields,
    estabelecimentoSelecionado,
    planAction,
    persistedOptionsByRowId,
    removedPlanRiskKeys,
    planGeneralMeasures,
    anexos,
    anexoDiretriz,
    gheGroups,
    currentGheId,
    riskGheGroups,
    currentRiskGheId,
    pdfLayout,
    workflow,
    isStateLoading,
  } = state;

  const { saveTimerRef } = refs;
  const skipInitialPersistRef = useRef(true);
  const pendingPersistPayloadRef = useRef<PersistPayload | null>(null);

  const buildRuntimeCacheState = ({
    completed,
    progress,
    inicio,
    dados,
    card,
    historico,
    functions,
    extraFields,
    estabelecimento,
    plan,
    removedPlanRiskKeys,
    planGeneralMeasures,
    anexosState,
    diretriz,
    ghes,
    gheId,
    riskGhes,
    riskGheId,
    pdfLayout,
    workflowState,
    persistedOptions,
  }: {
    completed: number;
    progress: number;
    inicio: InicioDraft;
    dados: DadosCadastraisDraft;
    card: CardMeta;
    historico: HistoricoData;
    functions: PgrFunction[];
    extraFields: ExtraField[];
    estabelecimento: string;
    plan: PlanAction;
    removedPlanRiskKeys: string[];
    planGeneralMeasures: PlanGeneralMeasureRow[];
    anexosState: AnexoItem[];
    diretriz: string;
    ghes: GheGroup[];
    gheId: string;
    riskGhes: RiskGheGroup[];
    riskGheId: string;
    pdfLayout: PdfLayoutState;
    workflowState: Workflow;
    persistedOptions?: Record<string, string[]>;
  }) => ({
    serverSynced: true,
    syncedAt: Date.now(),
    completedSteps: completed,
    progressPercent: progress,
    inicioDraft: inicio,
    dadosCadastrais: dados,
    cardMeta: card,
    historicoData: historico,
    functionsData: functions,
    extraEstabelecimentoFields: extraFields,
    estabelecimentoSelecionado: estabelecimento,
    planAction: plan,
    persistedOptionsByRowId: persistedOptions,
    removedPlanRiskKeys,
    planGeneralMeasures,
    anexos: anexosState,
    anexoDiretriz: diretriz,
    gheGroups: ghes,
    currentGheId: gheId,
    riskGheGroups: riskGhes,
    currentRiskGheId: riskGheId,
    pdfLayout,
    workflow: workflowState,
  });

  const persistPayload = useCallback(
    (payload: PersistPayload) => {
      pendingPersistPayloadRef.current = payload;
      return putPgrState(params.id, payload)
        .then((result) => {
          // result === null => save pausado por conflito; não atualiza cache.
          if (result === null) return;
          setRuntimeCachedStateFn(
            params.id,
            buildRuntimeCacheState({
              completed: payload.completedSteps,
              progress: payload.meta.progressPercent,
              inicio: payload.inicioDraft,
              dados: payload.dadosCadastrais,
              card: payload.cardMeta,
              historico: payload.historico,
              functions: payload.functions,
              extraFields: payload.extraEstabelecimentoFields,
              estabelecimento: payload.estabelecimentoSelecionado,
              plan: payload.planAction,
              persistedOptions: persistedOptionsByRowId,
              removedPlanRiskKeys: payload.removedPlanRiskKeys,
              planGeneralMeasures: payload.planGeneralMeasures,
              anexosState: payload.anexos,
              diretriz: payload.anexoDiretriz,
              ghes: payload.gheGroups,
              gheId: payload.currentGheId,
              riskGhes: payload.riskGheGroups,
              riskGheId: payload.currentRiskGheId,
              pdfLayout: payload.pdfLayout,
              workflowState: payload.workflow,
            })
          );
        })
        .catch(() => {})
        .finally(() => {
          if (pendingPersistPayloadRef.current === payload) {
            pendingPersistPayloadRef.current = null;
          }
        });
    },
    [params.id, persistedOptionsByRowId, setRuntimeCachedStateFn]
  );

  useEffect(() => {
    let active = true;
    let retryTimer: number | null = null;
    // Refaz o catálogo só ao abrir o card; sem polling de 60s (era o maior
    // churn de memória/CPU no backend — resposta de ~2,4 MB).
    const forceRefresh = lastCatalogRefreshedPgrId !== params.id;
    const loadRiskCatalogs = async () => {
      try {
        const data = await apiGet<RiskCatalogPayload>(
          `/api/catalogs/risk?ts=${Date.now()}${forceRefresh ? "&refresh=1" : ""}`
        );
        if (!active) return;
        const hasMatrixData =
          Array.isArray(data.riskMatrix?.qualitative) &&
          data.riskMatrix.qualitative.length > 0 &&
          Array.isArray(data.riskMatrix?.quantitative) &&
          data.riskMatrix.quantitative.length > 0;

        const hasCatalogData =
          (Array.isArray(data.riskAgents) && data.riskAgents.length > 0) ||
          hasMatrixData;

        if (!hasCatalogData) {
          setRiskCatalogs(null);
          retryTimer = window.setTimeout(() => {
            void loadRiskCatalogs();
          }, 10000);
          return;
        }

        lastCatalogRefreshedPgrId = params.id;
        setRiskCatalogs(data);
      } catch {
        if (!active) return;
        setRiskCatalogs(null);
        retryTimer = window.setTimeout(() => {
          void loadRiskCatalogs();
        }, 10000);
      }
    };
    void loadRiskCatalogs();
    return () => {
      active = false;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [setRiskCatalogs, params.id]);

  useEffect(() => {
    if (!riskCatalogs) return;
    setRiskGheGroups((prev: RiskGheGroup[]) => {
      let changed = false;
      const next = prev.map((ghe) => {
        const risks = ghe.risks.map((risk) => {
          const normalized = applyMissingRiskDefaults(risk);
          const same =
            normalized.meioPropagacao === risk.meioPropagacao &&
            normalized.fontes === risk.fontes &&
            (normalized.valorMedido || "") === (risk.valorMedido || "") &&
            normalized.tipoAvaliacao === risk.tipoAvaliacao &&
            normalized.intensidade === risk.intensidade &&
            (normalized.nivelAcao || "") === (risk.nivelAcao || "") &&
            normalized.severidade === risk.severidade &&
            normalized.probabilidade === risk.probabilidade &&
            normalized.classificacao === risk.classificacao &&
            normalized.medidasControle === risk.medidasControle &&
            normalized.epc === risk.epc &&
            normalized.epi === risk.epi;
          if (!same) changed = true;
          return same ? risk : normalized;
        });
        const sameRisks = risks.every((risk, index: number) => risk === ghe.risks[index]);
        return sameRisks ? ghe : { ...ghe, risks };
      });
      return changed ? next : prev;
    });
  }, [applyMissingRiskDefaults, areStringArraysEqual, riskCatalogs, setRiskGheGroups]);

  useEffect(() => {
    skipInitialPersistRef.current = true;
  }, [params.id]);

  useEffect(() => {
    if (!shouldHydrateFromApi) {
      setIsStateLoading(false);
      return;
    }
    let active = true;

    const loadState = async () => {
      try {
        const state = await apiGet<BackendStateResponse>(`/api/v1/frontend/pgr/${params.id}/state`);
        if (!active) return;

        // Prime o token de lock otimista com a versão recém-carregada.
        setKnownUpdatedAt(params.id, state.updatedAt);

        const rawCompleted = Number(state.completedSteps);
        const normalizedCompleted = Number.isFinite(rawCompleted)
          ? Math.max(0, Math.min(rawCompleted, pgrSteps.length))
          : 0;
        const rawProgress = Number(state.meta?.progressPercent);
        const normalizedProgress = Number.isFinite(rawProgress)
          ? Math.max(0, Math.min(100, Math.round(rawProgress)))
          : Math.round((normalizedCompleted / Math.max(1, pgrSteps.length)) * 100);
        const loadedInicioDraft = { ...initialInicioDraft, ...(state.inicioDraft || {}) };
        const loadedDadosCadastrais = syncLegacyContractorFields({
          ...initialDadosCadastrais,
          ...(state.dadosCadastrais || {}),
        });
        const loadedCardMeta = {
          pipefyCardId: state.cardMeta?.pipefyCardId || "",
          cardName: state.cardMeta?.cardName || "",
          dueDate: state.cardMeta?.dueDate || "",
          companyId:
            typeof state.cardMeta?.companyId === "number" ? state.cardMeta.companyId : null,
          responsibleId:
            typeof state.cardMeta?.responsibleId === "number"
              ? state.cardMeta.responsibleId
              : null,
        };
        const loadedHistoricoData = {
          ...defaultHistorico,
          ...(state.historico || {}),
          changes: state.historico?.changes || [],
        };
        const loadedFunctions = state.functions?.length ? state.functions : [];
        const loadedExtraFields = Array.isArray(state.extraEstabelecimentoFields)
          ? state.extraEstabelecimentoFields.map((field) => ({
              id: field.id || `est-field-${Date.now()}-${Math.random()}`,
              title: field.title || "",
              value: field.value || "",
              scope: field.scope || "estabelecimento",
            }))
          : [];
        const loadedEstabelecimento = state.estabelecimentoSelecionado || "";
        const loadedPlanAction = { nr: "NR-01", vigencia: "", ...(state.planAction || {}) };
        const loadedPersistedOptions = (state as any).persistedOptionsByRowId ?? {};
        const loadedRemovedPlanRiskKeys = Array.isArray(state.removedPlanRiskKeys)
          ? state.removedPlanRiskKeys.filter((item): item is string => typeof item === "string")
          : [];
        const loadedPlanGeneralMeasures = Array.isArray(state.planGeneralMeasures)
          ? state.planGeneralMeasures
              .map((item) => ({
                id: String(item?.id || "").trim(),
                nr: String(item?.nr || "").trim(),
                descricao: String(item?.descricao || "").trim(),
                tipoMedida: String(item?.tipoMedida || "").trim(),
                prazoAcao: String(item?.prazoAcao || "").trim(),
                responsavelAcao: String(item?.responsavelAcao || "").trim(),
                acompanhamento: String(item?.acompanhamento || "").trim(),
                afericaoResultado: String(item?.afericaoResultado || "").trim(),
              }))
              .filter((item) => item.id && item.descricao)
          : [];
        const loadedAnexos = Array.isArray(state.anexos) ? state.anexos : defaultAnexos;
        const loadedAnexoDiretriz = state.anexoDiretriz || "Diretriz 1";
        const loadedGheGroups = Array.isArray(state.gheGroups) ? state.gheGroups : gheGroups;
        const loadedCurrentGheId = state.currentGheId || loadedGheGroups[0]?.id || currentGheId;
        const normalizeHydratedRisk = (risk: GheRisk) => {
          const rawRisk = risk as GheRisk & {
            danos_saude?: string;
            healthDamage?: string;
            "Danos à saude"?: string;
            "Danos à saúde"?: string;
          };
          return {
            ...risk,
            danosSaude:
              rawRisk.danosSaude ||
              rawRisk.danos_saude ||
              rawRisk.healthDamage ||
              rawRisk["Danos à saude"] ||
              rawRisk["Danos à saúde"] ||
              "",
          };
        };
        const loadedRiskGheGroups = Array.isArray(state.riskGheGroups)
          ? state.riskGheGroups.map((ghe) => ({
              ...ghe,
              risks: (ghe.risks || []).map((risk) =>
                applyMissingRiskDefaults(normalizeHydratedRisk(risk))
              ),
            }))
          : riskGheGroups;
        const loadedCurrentRiskGheId =
          state.currentRiskGheId || loadedRiskGheGroups[0]?.id || currentRiskGheId;
        const loadedPdfLayout = normalizePdfLayoutState(
          state.pdfLayout ?? DEFAULT_PDF_LAYOUT_STATE
        );
        const loadedWorkflow: Workflow = {
          isLocked: Boolean(state.workflow?.isLocked),
          version: Math.max(1, Number(state.workflow?.version || 1)),
          finalizedAt:
            typeof state.workflow?.finalizedAt === "string"
              ? state.workflow.finalizedAt
              : null,
          finalizedBy:
            typeof state.workflow?.finalizedBy === "string"
              ? state.workflow.finalizedBy
              : null,
          finalizedById:
            typeof state.workflow?.finalizedById === "number"
              ? state.workflow.finalizedById
              : null,
        };

        setCompletedSteps(normalizedCompleted);
        setProgressPercent(normalizedProgress);
        setInicioDraft(loadedInicioDraft);
        setDadosCadastrais(loadedDadosCadastrais);
        setCardMeta(loadedCardMeta);
        setHistoricoData(loadedHistoricoData);
        setFunctionsData(loadedFunctions);
        setExtraEstabelecimentoFields(loadedExtraFields);
        setEstabelecimentoSelecionado(loadedEstabelecimento);
        setPlanAction(loadedPlanAction);
        setPersistedOptionsByRowId(loadedPersistedOptions);
        setRemovedPlanRiskKeys(loadedRemovedPlanRiskKeys);
        setPlanGeneralMeasures(loadedPlanGeneralMeasures);
        setAnexos(loadedAnexos);
        setAnexoDiretriz(loadedAnexoDiretriz);

        setGheGroups(loadedGheGroups);
        setCurrentGheId(loadedCurrentGheId);
        setRiskGheGroups(loadedRiskGheGroups);
        setCurrentRiskGheId(loadedCurrentRiskGheId);
        setPdfLayout(loadedPdfLayout);
        setWorkflow(loadedWorkflow);

        setRuntimeCachedStateFn(
          params.id,
          buildRuntimeCacheState({
            completed: normalizedCompleted,
            progress: normalizedProgress,
            inicio: loadedInicioDraft,
            dados: loadedDadosCadastrais,
            card: loadedCardMeta,
            historico: loadedHistoricoData,
            functions: loadedFunctions,
            extraFields: loadedExtraFields,
            estabelecimento: loadedEstabelecimento,
            plan: loadedPlanAction,
            persistedOptions: loadedPersistedOptions,
            removedPlanRiskKeys: loadedRemovedPlanRiskKeys,
            planGeneralMeasures: loadedPlanGeneralMeasures,
            anexosState: loadedAnexos,
            diretriz: loadedAnexoDiretriz,
            ghes: loadedGheGroups,
            gheId: loadedCurrentGheId,
            riskGhes: loadedRiskGheGroups,
            riskGheId: loadedCurrentRiskGheId,
            pdfLayout: loadedPdfLayout,
            workflowState: loadedWorkflow,
          })
        );
      } catch {
        // Mantém estado padrão local caso a API falhe.
      } finally {
        if (active) setIsStateLoading(false);
      }
    };

    loadState();

    return () => {
      active = false;
    };
    // Recarrega estado apenas ao trocar de card (ou quando cache expira).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, shouldHydrateFromApi]);

  useEffect(() => {
    setRiskGheGroups((prev: RiskGheGroup[]) => {
      const prevById = new Map(prev.map((group) => [group.id, group]));
      const nextFromDescricao = gheGroups.map((ghe) => ({
        id: ghe.id,
        name: ghe.name,
        risks: prevById.get(ghe.id)?.risks || [],
      }));
      const next = nextFromDescricao;
      const unchanged =
        next.length === prev.length &&
        next.every(
          (item, index: number) =>
            item.id === prev[index]?.id &&
            item.name === prev[index]?.name &&
            item.risks === prev[index]?.risks
        );
      return unchanged ? prev : next;
    });
  }, [gheGroups, setRiskGheGroups]);

  useEffect(() => {
    if (!riskGheGroups.length) return;
    if (!riskGheGroups.some((ghe) => ghe.id === currentRiskGheId)) {
      setCurrentRiskGheId(riskGheGroups[0].id);
    }
  }, [riskGheGroups, currentRiskGheId, setCurrentRiskGheId]);

  useEffect(() => {
    if (isStateLoading) return;
    if (workflow.isLocked) return;
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    const payload = {
      completedSteps,
      meta: {
        pgrId: params.id,
        progressPercent,
      },
      inicioDraft,
      dadosCadastrais,
      cardMeta,
      historico: historicoData,
      functions: functionsData,
      extraEstabelecimentoFields,
      estabelecimentoSelecionado,
      planAction,
      persistedOptionsByRowId,
      removedPlanRiskKeys,
      planGeneralMeasures,
      anexos,
      anexoDiretriz,
      gheGroups,
      currentGheId,
      riskGheGroups,
      currentRiskGheId,
      pdfLayout,
      workflow,
    };

    pendingPersistPayloadRef.current = payload;
    saveTimerRef.current = window.setTimeout(() => {
      void persistPayload(payload);
      saveTimerRef.current = null;
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [
    anexoDiretriz,
    anexos,
    cardMeta,
    completedSteps,
    progressPercent,
    currentGheId,
    currentRiskGheId,
    dadosCadastrais,
    estabelecimentoSelecionado,
    extraEstabelecimentoFields,
    functionsData,
    gheGroups,
    historicoData,
    inicioDraft,
    isStateLoading,
    params.id,
    persistPayload,
    persistedOptionsByRowId,
    planAction,
    planGeneralMeasures,
    removedPlanRiskKeys,
    pdfLayout,
    riskGheGroups,
    saveTimerRef,
    workflow,
  ]);

  useEffect(() => {
    return () => {
      const pendingPayload = pendingPersistPayloadRef.current;
      if (!pendingPayload) return;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void persistPayload(pendingPayload);
    };
  }, [persistPayload, saveTimerRef]);
}
