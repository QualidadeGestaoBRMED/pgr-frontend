import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { apiGet } from "@/lib/api";
import { putPgrState, setKnownUpdatedAt } from "../state/state-version";
import { pgrSteps } from "@/app/pgr/steps";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type { PlanTableRow } from "./use-pgr-etapa-derived";
import type {
  AnexoItem,
  GheGroup,
  GheRisk,
  HistoricoData,
  PgrDocxTemplateOption,
  PgrFunction,
  PlanGeneralMeasureRow,
  RiskCatalogPayload,
  RiskGheGroup,
} from "../types";
import type { PersistedPgrState } from "../state/runtime-cache";
import {
  normalizeAdditionalFields,
  syncLegacyContractorFields,
} from "../utils/contractors";
import { syncLegacyEstablishmentFields } from "../utils/establishments";
import { calculatePlanActionVigencia } from "../utils/vigencia";
import {
  buildPersistedPlanActionItems,
  type PersistedPlanActionItem,
} from "../utils/plan-action-items";
import {
  DEFAULT_PDF_LAYOUT_STATE,
  normalizePdfLayoutState,
  type PdfLayoutState,
} from "@/lib/pgr-pdf-runtime/layout";

const stableSerialize = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`)
    .join(",")}}`;
};

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
  planTableRows?: PlanTableRow[];
  persistedOptionsByRowId: Record<string, string[]>;
  removedPlanRiskKeys: string[];
  planGeneralMeasures: PlanGeneralMeasureRow[];
  anexos: AnexoItem[];
  anexoDiretriz: string;
  anexoDiretrizTemplateId: number | null;
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
  planAction: Partial<PlanAction> & { items?: PersistedPlanActionItem[]; itens?: PersistedPlanActionItem[] };
  planTableRows?: PlanTableRow[];
  persistedOptionsByRowId?: Record<string, string[]>;
  removedPlanRiskKeys: string[];
  planGeneralMeasures: PlanGeneralMeasureRow[];
  anexos: AnexoItem[];
  anexoDiretriz: string;
  anexoDiretrizTemplateId?: number | null;
  pgrDocxTemplates?: PgrDocxTemplateOption[];
  gheGroups: GheGroup[];
  currentGheId: string;
  riskGheGroups: Array<Omit<RiskGheGroup, "risks"> & { risks?: GheRisk[] }>;
  currentRiskGheId: string;
  pdfLayout: unknown;
  // O backend expõe rejectionSourcePhaseId aninhado em `rejection` (não
  // flattened como no resto do Workflow do frontend) — tipado à parte aqui
  // só para a leitura do payload cru.
  workflow: Partial<Workflow> & { rejection?: { sourcePhaseId?: string | null } };
  updatedAt: string;
}>;

type UsePgrPersistenceContext = {
  params: { id: string };
  shouldHydrateFromApi: boolean | null;
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
    setAnexoDiretrizTemplateId: Dispatch<SetStateAction<number | null>>;
    setPgrDocxTemplates: Dispatch<SetStateAction<PgrDocxTemplateOption[]>>;
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
    planTableRows?: PlanTableRow[];
    persistedOptionsByRowId: Record<string, string[]>;
    removedPlanRiskKeys: string[];
    planGeneralMeasures: PlanGeneralMeasureRow[];
    anexos: AnexoItem[];
    anexoDiretriz: string;
    anexoDiretrizTemplateId: number | null;
    pgrDocxTemplates: PgrDocxTemplateOption[];
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
    setAnexoDiretrizTemplateId,
    setPgrDocxTemplates,
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
    planTableRows,
    persistedOptionsByRowId,
    removedPlanRiskKeys,
    planGeneralMeasures,
    anexos,
    anexoDiretriz,
    anexoDiretrizTemplateId,
    pgrDocxTemplates,
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
  const skipPostHydrationPersistsRef = useRef(0);
  const pendingPersistPayloadRef = useRef<PersistPayload | null>(null);
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const latestRiskGheGroupsRef = useRef<RiskGheGroup[]>(riskGheGroups);
  const prevImmediatePersistRefs = useRef<{
    riskGheGroups: RiskGheGroup[];
    removedPlanRiskKeys: string[];
    planGeneralMeasures: PlanGeneralMeasureRow[];
    anexoDiretrizTemplateId: number | null;
  }>({
    riskGheGroups,
    removedPlanRiskKeys,
    planGeneralMeasures,
    anexoDiretrizTemplateId,
  });

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
    planTableRows,
    removedPlanRiskKeys,
    planGeneralMeasures,
    anexosState,
    diretriz,
    diretrizTemplateId,
    pgrDocxTemplates,
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
    planTableRows?: PlanTableRow[];
    removedPlanRiskKeys: string[];
    planGeneralMeasures: PlanGeneralMeasureRow[];
    anexosState: AnexoItem[];
    diretriz: string;
    diretrizTemplateId: number | null;
    pgrDocxTemplates: PgrDocxTemplateOption[];
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
    planTableRows,
    persistedOptionsByRowId: persistedOptions,
    removedPlanRiskKeys,
    planGeneralMeasures,
    anexos: anexosState,
    anexoDiretriz: diretriz,
    anexoDiretrizTemplateId: diretrizTemplateId,
    pgrDocxTemplates,
    gheGroups: ghes,
    currentGheId: gheId,
    riskGheGroups: riskGhes,
    currentRiskGheId: riskGheId,
    pdfLayout,
    workflow: workflowState,
  });

  const persistPayload = useCallback(
    (payload: PersistPayload) => {
      const payloadSignature = stableSerialize(payload);
      if (lastPersistedSignatureRef.current === payloadSignature) {
        pendingPersistPayloadRef.current = null;
        return Promise.resolve();
      }

      pendingPersistPayloadRef.current = payload;
      return putPgrState(params.id, payload)
        .then((result) => {
          // result === null => save pausado por conflito; não atualiza cache.
          if (result === null) return;
          lastPersistedSignatureRef.current = payloadSignature;
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
              planTableRows: payload.planTableRows,
              persistedOptions: payload.persistedOptionsByRowId,
              removedPlanRiskKeys: payload.removedPlanRiskKeys,
              planGeneralMeasures: payload.planGeneralMeasures,
              anexosState: payload.anexos,
              diretriz: payload.anexoDiretriz,
              diretrizTemplateId: payload.anexoDiretrizTemplateId,
              pgrDocxTemplates,
              ghes: payload.gheGroups,
              gheId: payload.currentGheId,
              riskGhes: payload.riskGheGroups,
              riskGheId: payload.currentRiskGheId,
              pdfLayout: payload.pdfLayout,
              workflowState: payload.workflow,
            })
          );
        })
        .finally(() => {
          if (pendingPersistPayloadRef.current === payload) {
            pendingPersistPayloadRef.current = null;
          }
        });
    },
    [params.id, pgrDocxTemplates, setRuntimeCachedStateFn]
  );

  useEffect(() => {
    let active = true;
    let retryTimer: number | null = null;
    // Catálogo servido do cache do backend (sem refresh=1, sem polling de 60s).
    // O catálogo só muda em import de admin, que invalida o cache no servidor —
    // então abrir o card sempre reflete o catálogo vigente sem reconstruir os
    // ~2,4 MB a cada abertura (era o que estourava a memória / causava 502).
    const loadRiskCatalogs = async () => {
      try {
        const data = await apiGet<RiskCatalogPayload>(`/api/catalogs/risk?ts=${Date.now()}`);
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
          }, 15000);
          return;
        }

        setRiskCatalogs(data);
      } catch {
        if (!active) return;
        setRiskCatalogs(null);
        retryTimer = window.setTimeout(() => {
          void loadRiskCatalogs();
        }, 15000);
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
    latestRiskGheGroupsRef.current = riskGheGroups;
  }, [riskGheGroups]);

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
    if (shouldHydrateFromApi === null) {
      return;
    }
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
        const rawExtraFields = Array.isArray(state.extraEstabelecimentoFields)
          ? state.extraEstabelecimentoFields
          : [];
        const legacyContractorExtraFields = rawExtraFields.filter(
          (field) => field.scope === "contratante"
        );
        const loadedDadosCadastrais = syncLegacyContractorFields(
          syncLegacyEstablishmentFields(
            {
              ...initialDadosCadastrais,
              ...(state.dadosCadastrais || {}),
            },
            state.estabelecimentoSelecionado || ""
          )
        );
        const migratedDadosCadastrais =
          legacyContractorExtraFields.length > 0
            ? {
                ...loadedDadosCadastrais,
                contratantes: loadedDadosCadastrais.contratantes.map((contractor) => ({
                  ...contractor,
                  camposAdicionais:
                    contractor.camposAdicionais.length > 0
                      ? contractor.camposAdicionais
                      : normalizeAdditionalFields(legacyContractorExtraFields),
                })),
              }
            : loadedDadosCadastrais;
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
        const loadedExtraFields = rawExtraFields
          .filter((field) => field.scope !== "contratante")
          .map((field) => ({
            id: field.id || `est-field-${Date.now()}-${Math.random()}`,
            title: field.title || "",
            value: field.value || "",
            scope: field.scope || "estabelecimento",
          }));
        const loadedEstabelecimento = state.estabelecimentoSelecionado || "";
        const loadedPlanAction = {
          nr: state.planAction?.nr || "NR-01",
          vigencia:
            state.planAction?.vigencia ||
            calculatePlanActionVigencia(loadedHistoricoData.changes),
          items: Array.isArray(state.planAction?.items)
            ? state.planAction.items
            : Array.isArray(state.planAction?.itens)
              ? state.planAction.itens
              : [],
        };
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
                gheName: String(item?.gheName || "").trim(),
                targetGheIds: Array.isArray(item?.targetGheIds)
                  ? item.targetGheIds.map((id) => String(id || "").trim()).filter(Boolean)
                  : [],
                tipoMedida: String(item?.tipoMedida || "").trim(),
                prazoAcao: String(item?.prazoAcao || "").trim(),
                disableAutoPrazoAcao: Boolean(item?.disableAutoPrazoAcao),
                responsavelAcao: String(item?.responsavelAcao || "").trim(),
                acompanhamento:
                  String(item?.acompanhamento || "").trim() || "Programado",
                afericaoResultado:
                  String(item?.afericaoResultado || "").trim() ||
                  "Aguardando realização da Ação",
              }))
              .filter((item) => item.id && item.descricao)
          : [];
        const loadedAnexos = Array.isArray(state.anexos) ? state.anexos : defaultAnexos;
        const loadedAnexoDiretriz = state.anexoDiretriz || "Padrão da NR-01";
        const loadedAnexoDiretrizTemplateId =
          typeof state.anexoDiretrizTemplateId === "number"
            ? state.anexoDiretrizTemplateId
            : null;
        const loadedPgrDocxTemplates = Array.isArray(state.pgrDocxTemplates)
          ? state.pgrDocxTemplates
              .map((item) => ({
                id: Number(item?.id || 0),
                name: String(item?.name || "").trim(),
                description: String(item?.description || "").trim(),
                nrCode: String(item?.nrCode || "").trim(),
                companyId:
                  typeof item?.companyId === "number"
                    ? item.companyId
                    : item?.companyId === null
                      ? null
                      : undefined,
                companyName: String(item?.companyName || "").trim(),
                baseTemplateId:
                  typeof item?.baseTemplateId === "number"
                    ? item.baseTemplateId
                    : item?.baseTemplateId === null
                      ? null
                      : undefined,
                version: Number(item?.version || 0) || undefined,
                isActive:
                  typeof item?.isActive === "boolean" ? item.isActive : undefined,
              }))
              .filter((item) => item.id > 0 && item.name && item.nrCode)
          : [];
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
        const loadedRiskGheGroupsById = new Map(
          (Array.isArray(state.riskGheGroups) ? state.riskGheGroups : []).map((ghe) => [
            String(ghe?.id || "").trim(),
            {
              ...ghe,
              risks: (ghe.risks || []).map((risk) =>
                applyMissingRiskDefaults(normalizeHydratedRisk(risk))
              ),
            },
          ])
        );
        const loadedRiskGheGroups = loadedGheGroups.map((ghe) => {
          const existing = loadedRiskGheGroupsById.get(String(ghe?.id || "").trim());
          if (!existing) {
            return {
              id: ghe.id,
              name: ghe.name,
              risks: [],
            };
          }
          return {
            ...existing,
            id: ghe.id,
            name: ghe.name,
            risks: (existing.risks || []).map((risk) => ({
              ...risk,
              acompanhamento: String(risk?.acompanhamento || "").trim() || "Programado",
              afericaoResultado:
                String(risk?.afericaoResultado || "").trim() ||
                "Aguardando realização da Ação",
            })),
          };
        });
        const loadedCurrentRiskGheId =
          state.currentRiskGheId || loadedRiskGheGroups[0]?.id || currentRiskGheId;
        const loadedPdfLayout = normalizePdfLayoutState(
          state.pdfLayout ?? DEFAULT_PDF_LAYOUT_STATE
        );
        const loadedWorkflow: Workflow = {
          isLocked: Boolean(state.workflow?.isLocked),
          version: Math.max(1, Number(state.workflow?.version || 1)),
          statusLabel:
            typeof state.workflow?.statusLabel === "string"
              ? state.workflow.statusLabel
              : null,
          rejectionReason:
            typeof state.workflow?.rejectionReason === "string"
              ? state.workflow.rejectionReason
              : null,
          wasRejected: Boolean(state.workflow?.wasRejected),
          rejectionSourcePhaseId:
            typeof state.workflow?.rejection?.sourcePhaseId === "string"
              ? state.workflow.rejection.sourcePhaseId
              : null,
          editContext:
            state.workflow?.editContext === "function_inclusion"
              ? "function_inclusion"
              : null,
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
          currentVersionEditHistory: Array.isArray(
            state.workflow?.currentVersionEditHistory
          )
            ? state.workflow.currentVersionEditHistory
                .filter(
                  (item): item is {
                    version: number;
                    openedAt: string;
                    openedBy: string;
                    openedById: number | null;
                  } =>
                    Boolean(item) &&
                    typeof item.version === "number" &&
                    typeof item.openedAt === "string" &&
                    typeof item.openedBy === "string"
                )
                .map((item) => ({
                  ...item,
                  openedById:
                    typeof item.openedById === "number" ? item.openedById : null,
                }))
            : [],
        };

        setCompletedSteps(normalizedCompleted);
        setProgressPercent(normalizedProgress);
        setInicioDraft(loadedInicioDraft);
        setDadosCadastrais(migratedDadosCadastrais);
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
        setAnexoDiretrizTemplateId(loadedAnexoDiretrizTemplateId);
        setPgrDocxTemplates(loadedPgrDocxTemplates);

        setGheGroups(loadedGheGroups);
        setCurrentGheId(loadedCurrentGheId);
        latestRiskGheGroupsRef.current = loadedRiskGheGroups;
        setRiskGheGroups(loadedRiskGheGroups);
        setCurrentRiskGheId(loadedCurrentRiskGheId);
        setPdfLayout(loadedPdfLayout);
        setWorkflow(loadedWorkflow);
        skipPostHydrationPersistsRef.current = 2;

        lastPersistedSignatureRef.current = stableSerialize({
          completedSteps: normalizedCompleted,
          meta: {
            pgrId: params.id,
            progressPercent: normalizedProgress,
          },
          inicioDraft: loadedInicioDraft,
          dadosCadastrais: migratedDadosCadastrais,
          cardMeta: loadedCardMeta,
          historico: loadedHistoricoData,
          functions: loadedFunctions,
          extraEstabelecimentoFields: loadedExtraFields,
          estabelecimentoSelecionado: loadedEstabelecimento,
          planAction: loadedPlanAction,
          planTableRows: Array.isArray(state.planTableRows) ? state.planTableRows : undefined,
          persistedOptionsByRowId: loadedPersistedOptions,
          removedPlanRiskKeys: loadedRemovedPlanRiskKeys,
          planGeneralMeasures: loadedPlanGeneralMeasures,
          anexos: loadedAnexos,
          anexoDiretriz: loadedAnexoDiretriz,
          anexoDiretrizTemplateId: loadedAnexoDiretrizTemplateId,
          gheGroups: loadedGheGroups,
          currentGheId: loadedCurrentGheId,
          riskGheGroups: loadedRiskGheGroups,
          currentRiskGheId: loadedCurrentRiskGheId,
          pdfLayout: loadedPdfLayout,
          workflow: loadedWorkflow,
        });

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
            diretrizTemplateId: loadedAnexoDiretrizTemplateId,
            pgrDocxTemplates: loadedPgrDocxTemplates,
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
    if (isStateLoading) return;
    setRiskGheGroups((prev: RiskGheGroup[]) => {
      const sourceGroups =
        latestRiskGheGroupsRef.current.length >= prev.length
          ? latestRiskGheGroupsRef.current
          : prev;
      const prevById = new Map(sourceGroups.map((group) => [group.id, group]));
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
  }, [gheGroups, isStateLoading, setRiskGheGroups]);

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
      prevImmediatePersistRefs.current = {
        riskGheGroups,
        removedPlanRiskKeys,
        planGeneralMeasures,
        anexoDiretrizTemplateId,
      };
      return;
    }

    if (skipPostHydrationPersistsRef.current > 0) {
      skipPostHydrationPersistsRef.current -= 1;
      prevImmediatePersistRefs.current = {
        riskGheGroups,
        removedPlanRiskKeys,
        planGeneralMeasures,
        anexoDiretrizTemplateId,
      };
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
      planAction: {
        ...planAction,
        items: buildPersistedPlanActionItems(planTableRows),
      },
      planTableRows,
      persistedOptionsByRowId,
      removedPlanRiskKeys,
      planGeneralMeasures,
      anexos,
      anexoDiretriz,
      anexoDiretrizTemplateId,
      gheGroups,
      currentGheId,
      riskGheGroups,
      currentRiskGheId,
      pdfLayout,
      workflow,
    };

    const payloadSignature = stableSerialize(payload);
    if (lastPersistedSignatureRef.current === payloadSignature) {
      pendingPersistPayloadRef.current = null;
      return;
    }

    pendingPersistPayloadRef.current = payload;
    const shouldPersistImmediately =
      prevImmediatePersistRefs.current.riskGheGroups !== riskGheGroups ||
      prevImmediatePersistRefs.current.removedPlanRiskKeys !== removedPlanRiskKeys ||
      prevImmediatePersistRefs.current.planGeneralMeasures !== planGeneralMeasures ||
      // Seleção do modelo DOCX persiste imediatamente: o valor
      // define qual template a geração usa e não pode depender do debounce.
      prevImmediatePersistRefs.current.anexoDiretrizTemplateId !== anexoDiretrizTemplateId;

    prevImmediatePersistRefs.current = {
      riskGheGroups,
      removedPlanRiskKeys,
      planGeneralMeasures,
      anexoDiretrizTemplateId,
    };

    if (shouldPersistImmediately) {
      void persistPayload(payload).catch(() => {});
      return;
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistPayload(payload).catch(() => {});
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
    anexoDiretrizTemplateId,
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
    planTableRows,
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
      void persistPayload(pendingPayload).catch(() => {});
    };
  }, [persistPayload, saveTimerRef]);

  const persistLatestStateNow = useCallback(
    async (args?: {
      payloadOverride?: PersistPayload;
      buildFallbackPayload?: () => PersistPayload;
    }) => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const payloadToPersist =
        args?.payloadOverride ??
        pendingPersistPayloadRef.current ??
        args?.buildFallbackPayload?.();
      if (!payloadToPersist) return;
      await persistPayload(payloadToPersist);
    },
    [persistPayload, saveTimerRef]
  );

  const cancelPendingPersist = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingPersistPayloadRef.current = null;
  }, [saveTimerRef]);

  return {
    persistLatestStateNow,
    cancelPendingPersist,
  };
}
