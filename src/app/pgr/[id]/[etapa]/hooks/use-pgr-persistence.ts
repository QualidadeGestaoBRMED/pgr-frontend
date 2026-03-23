import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { pgrSteps } from "@/app/pgr/steps";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { AnexoItem, GheGroup, GheRisk, HistoricoData, PgrFunction, RiskCatalogPayload, RiskGheGroup } from "../types";
import type { PersistedPgrState } from "../state/runtime-cache";

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
  anexos: AnexoItem[];
  anexoDiretriz: string;
  gheGroups: GheGroup[];
  currentGheId: string;
  riskGheGroups: RiskGheGroup[];
  currentRiskGheId: string;
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
  anexos: AnexoItem[];
  anexoDiretriz: string;
  gheGroups: GheGroup[];
  currentGheId: string;
  riskGheGroups: Array<Omit<RiskGheGroup, "risks"> & { risks?: GheRisk[] }>;
  currentRiskGheId: string;
  workflow: Partial<Workflow>;
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
    setAnexos: Dispatch<SetStateAction<AnexoItem[]>>;
    setAnexoDiretriz: Dispatch<SetStateAction<string>>;
    setGheGroups: Dispatch<SetStateAction<GheGroup[]>>;
    setCurrentGheId: Dispatch<SetStateAction<string>>;
    setRiskGheGroups: Dispatch<SetStateAction<RiskGheGroup[]>>;
    setCurrentRiskGheId: Dispatch<SetStateAction<string>>;
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
    anexos: AnexoItem[];
    anexoDiretriz: string;
    gheGroups: GheGroup[];
    currentGheId: string;
    riskGheGroups: RiskGheGroup[];
    currentRiskGheId: string;
    workflow: Workflow;
    isStateLoading: boolean;
  };
  refs: {
    saveTimerRef: MutableRefObject<number | null>;
    lastCompletedSyncRef: MutableRefObject<number | null>;
  };
  setRuntimeCachedStateFn: (pgrId: string, state: PersistedPgrState) => void;
};

let riskCatalogsRuntimeCache: RiskCatalogPayload | undefined;

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
    setAnexos,
    setAnexoDiretriz,
    setGheGroups,
    setCurrentGheId,
    setRiskGheGroups,
    setCurrentRiskGheId,
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
    anexos,
    anexoDiretriz,
    gheGroups,
    currentGheId,
    riskGheGroups,
    currentRiskGheId,
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
    anexosState,
    diretriz,
    ghes,
    gheId,
    riskGhes,
    riskGheId,
    workflowState,
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
    anexosState: AnexoItem[];
    diretriz: string;
    ghes: GheGroup[];
    gheId: string;
    riskGhes: RiskGheGroup[];
    riskGheId: string;
    workflowState: Workflow;
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
    anexos: anexosState,
    anexoDiretriz: diretriz,
    gheGroups: ghes,
    currentGheId: gheId,
    riskGheGroups: riskGhes,
    currentRiskGheId: riskGheId,
    workflow: workflowState,
  });

  const persistPayload = useCallback(
    (payload: PersistPayload) => {
      pendingPersistPayloadRef.current = payload;
      return apiPut(`/api/v1/frontend/pgr/${params.id}/state`, payload)
        .then(() => {
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
              anexosState: payload.anexos,
              diretriz: payload.anexoDiretriz,
              ghes: payload.gheGroups,
              gheId: payload.currentGheId,
              riskGhes: payload.riskGheGroups,
              riskGheId: payload.currentRiskGheId,
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
    [params.id, setRuntimeCachedStateFn]
  );

  useEffect(() => {
    if (riskCatalogsRuntimeCache) {
      setRiskCatalogs(riskCatalogsRuntimeCache);
      return;
    }

    let active = true;
    let retryTimer: number | null = null;
    const loadRiskCatalogs = async () => {
      try {
        const data = await apiGet<RiskCatalogPayload>("/api/v1/frontend/catalogs/risk");
        if (!active) return;
        const hasCatalogData =
          Array.isArray(data.riskAgents) &&
          data.riskAgents.length > 0 &&
          Array.isArray(data.riskDescriptions) &&
          data.riskDescriptions.length > 0;

        if (!hasCatalogData) {
          setRiskCatalogs(null);
          retryTimer = window.setTimeout(() => {
            void loadRiskCatalogs();
          }, 10000);
          return;
        }

        riskCatalogsRuntimeCache = data;
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
  }, [setRiskCatalogs]);

  useEffect(() => {
    if (!riskCatalogs) return;
    setRiskGheGroups((prev: RiskGheGroup[]) => {
      let changed = false;
      const next = prev.map((ghe) => {
        const risks = ghe.risks.map((risk) => {
          const normalized = applyMissingRiskDefaults(risk);
          const same =
            normalized.perigo === risk.perigo &&
            normalized.meioPropagacao === risk.meioPropagacao &&
            normalized.fontes === risk.fontes &&
            normalized.tipoAvaliacao === risk.tipoAvaliacao &&
            normalized.intensidade === risk.intensidade &&
            normalized.severidade === risk.severidade &&
            normalized.probabilidade === risk.probabilidade &&
            normalized.classificacao === risk.classificacao &&
            normalized.medidasControle === risk.medidasControle &&
            areStringArraysEqual(normalized.epc, risk.epc) &&
            areStringArraysEqual(normalized.epi, risk.epi);
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

        const rawCompleted = Number(state.completedSteps);
        const normalizedCompleted = Number.isFinite(rawCompleted)
          ? Math.max(0, Math.min(rawCompleted, pgrSteps.length))
          : 0;
        const rawProgress = Number(state.meta?.progressPercent);
        const normalizedProgress = Number.isFinite(rawProgress)
          ? Math.max(0, Math.min(100, Math.round(rawProgress)))
          : Math.round((normalizedCompleted / Math.max(1, pgrSteps.length)) * 100);
        const loadedInicioDraft = { ...initialInicioDraft, ...(state.inicioDraft || {}) };
        const loadedDadosCadastrais = {
          ...initialDadosCadastrais,
          ...(state.dadosCadastrais || {}),
        };
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
        const loadedAnexos = state.anexos?.length ? state.anexos : defaultAnexos;
        const loadedAnexoDiretriz = state.anexoDiretriz || "Diretriz 1";
        const loadedGheGroups = state.gheGroups?.length ? state.gheGroups : gheGroups;
        const loadedCurrentGheId = state.currentGheId || loadedGheGroups[0]?.id || currentGheId;
        const loadedRiskGheGroups = state.riskGheGroups?.length
          ? state.riskGheGroups.map((ghe) => ({
              ...ghe,
              risks: (ghe.risks || []).map((risk) => applyMissingRiskDefaults(risk)),
            }))
          : riskGheGroups;
        const loadedCurrentRiskGheId =
          state.currentRiskGheId || loadedRiskGheGroups[0]?.id || currentRiskGheId;
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
        setAnexos(loadedAnexos);
        setAnexoDiretriz(loadedAnexoDiretriz);

        setGheGroups(loadedGheGroups);
        setCurrentGheId(loadedCurrentGheId);
        setRiskGheGroups(loadedRiskGheGroups);
        setCurrentRiskGheId(loadedCurrentRiskGheId);
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
            anexosState: loadedAnexos,
            diretriz: loadedAnexoDiretriz,
            ghes: loadedGheGroups,
            gheId: loadedCurrentGheId,
            riskGhes: loadedRiskGheGroups,
            riskGheId: loadedCurrentRiskGheId,
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
      const next = gheGroups.map((ghe) => ({
        id: ghe.id,
        name: ghe.name,
        risks: prevById.get(ghe.id)?.risks || [],
      }));
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
      anexos,
      anexoDiretriz,
      gheGroups,
      currentGheId,
      riskGheGroups,
      currentRiskGheId,
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
    planAction,
    riskGheGroups,
    saveTimerRef,
    setRuntimeCachedStateFn,
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
