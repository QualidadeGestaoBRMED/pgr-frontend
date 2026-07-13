import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, notFound, useSearchParams } from "next/navigation";
import { apiBlobGet, apiGet, apiPost, apiPostForm, ApiError } from "@/lib/api";
import { pgrSteps, type PgrStepId } from "@/app/pgr/steps";
import {
  defaultAnexos,
  defaultFunctions,
  defaultGheGroups,
  defaultHistorico,
  defaultRiskGheGroups,
  initialDadosCadastrais,
  initialInicioDraft,
} from "../defaults";
import type { HistoricoData } from "../types";
import type { PersistedPgrState } from "../state/runtime-cache";
import { truncatePreview } from "../utils/text";
import { buildPgrDocxPayload } from "../utils/docx-payload";
import { buildPersistedPlanActionItems } from "../utils/plan-action-items";
import { computeWeightedProgressPercent } from "../utils/progress";
import { calculatePlanActionVigencia } from "../utils/vigencia";
import { parsePendingReviewFocus } from "../utils/pending-review";
import {
  buildPgrExportFileBase,
  sortHistoricoChanges,
} from "../utils/export-filename";
import { createGeneralActions } from "./create-general-actions";
import { useDescricaoInteractions } from "./use-descricao-interactions";
import { useHistoryUndo } from "./use-history-undo";
import { usePgrPersistence } from "./use-pgr-persistence";
import { areStringArraysEqual } from "./use-risk-catalog-helpers";
import { usePgrEtapaState } from "./use-pgr-etapa-state";
import { usePgrEtapaDerived } from "./use-pgr-etapa-derived";
import { useCycleTimeTracker } from "./use-cycle-time-tracker";
import { setRuntimeCachedState } from "../state/runtime-cache";
import {
  putPgrState,
  setKnownUpdatedAt,
  setConflictHandler,
  resumeSaving,
  clearKnownUpdatedAt,
} from "../state/state-version";
import { DEFAULT_PDF_LAYOUT_STATE, type PdfLayoutState } from "@/lib/pgr-pdf-runtime/layout";

const PGR_EXPORT_POLL_MIN_INTERVAL_MS = 5000;
const PGR_EXPORT_POLL_MAX_INTERVAL_MS = 10000;
// Deadline de espera do DOCX/PDF. Exportacoes com anexos pesados (ex.: PDF de
// ~200 paginas) sao processadas no worker sob job_timeout de 1800s; 2 min nao
// cobriam esse tempo e o usuario via "Tempo limite excedido" com o job ainda
// rodando. 15 min da folga para os dois formatos na maquina de 1 CPU do Render.
const PGR_EXPORT_POLL_TIMEOUT_MS = 900000;
// Anexos somando >= 10 MB fazem a geracao (rasterizacao + composicao) levar
// alguns minutos na maquina de producao; avisamos o usuario ao clicar em gerar.
const LARGE_ATTACHMENT_BYTES_THRESHOLD = 10 * 1024 * 1024;
const PIPEFY_ORGANIZATION_ID = "300527823";
const PIPEFY_CHECKBOX_FIELD_LABEL = "PGR Web";

const PIPEFY_ATTACH_POLL_MIN_INTERVAL_MS = 5000;
const PIPEFY_ATTACH_POLL_MAX_INTERVAL_MS = 10000;
// Upload dos arquivos gerados + presign + PUT no S3 + 3 mutations GraphQL
// (xlsx, pdf, checkbox), cada uma com leitura de confirmacao. Bem mais leve
// que a geracao do PDF/DOCX (sem renderizacao), mas ainda assim ajustar este
// valor se o backend mudar o job_timeout do worker do Celery.
const PIPEFY_ATTACH_POLL_TIMEOUT_MS = 180000;
const PIPEFY_ATTACH_WAIT_MESSAGE =
  "Enviando arquivos para o Pipefy e confirmando os anexos...";

type ExternalJobStartResponse = {
  job_id?: string;
  jobId?: string;
  id?: string;
  docxDownloadUrl?: string;
  docx_download_url?: string;
};

type PipefyAttachJobStartResponse = {
  job_id: string;
  status: string;
};

type PipefyAttachJobStatusResponse = {
  job_id?: string;
  status?: string;
  error?: string;
  steps?: { xlsx?: boolean; pdf?: boolean; checkbox?: boolean };
};

type ExternalExportKind = "pdf" | "docx" | "xlsx";

type ExternalJobStatusResponse = {
  status?: string;
  state?: string;
  message?: string;
  detail?: string;
  error?: string;
  docxDownloadUrl?: string;
  docx_download_url?: string;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const normalizeJobStatus = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const extractJobId = (payload: ExternalJobStartResponse) =>
  String(payload.job_id ?? payload.jobId ?? payload.id ?? "").trim();

const extractJobStatus = (payload: ExternalJobStatusResponse) =>
  normalizeJobStatus(payload.status ?? payload.state);

const extractJobError = (payload: ExternalJobStatusResponse) =>
  String(payload.error ?? payload.detail ?? payload.message ?? "").trim();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const extractDocxDownloadUrl = (payload: unknown): string => {
  if (!isRecord(payload)) return "";

  const directUrl = String(
    payload.docxDownloadUrl ?? payload.docx_download_url ?? ""
  ).trim();
  if (directUrl) return directUrl;

  for (const value of Object.values(payload)) {
    if (!isRecord(value) && !Array.isArray(value)) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        const nestedUrl = extractDocxDownloadUrl(item);
        if (nestedUrl) return nestedUrl;
      }
      continue;
    }
    const nestedUrl = extractDocxDownloadUrl(value);
    if (nestedUrl) return nestedUrl;
  }

  return "";
};

const HEAVY_GENERATION_IN_PROGRESS_CODE = "HEAVY_GENERATION_IN_PROGRESS";
// Mesmo teto do polling de conclusao: se o job pesado que esta segurando o
// slot tambem estiver perto do proprio timeout (1800s no worker), nao faz
// sentido esperar mais que isso por um slot livre.
const HEAVY_GENERATION_WAIT_TIMEOUT_MS = 900000;
const HEAVY_GENERATION_RETRY_INTERVAL_MS = 8000;
const HEAVY_GENERATION_WAIT_MESSAGE =
  "Sistema ocupado gerando outro documento com anexos grandes. Aguardando para iniciar automaticamente...";

async function startExternalExportJobWithResponse(
  pgrId: string,
  kind: ExternalExportKind,
  onHeavyWaitChange?: (message: string | null) => void
) {
  const startedAt = Date.now();
  for (;;) {
    try {
      const response = await apiPost<ExternalJobStartResponse>(
        `/api/v1/frontend/pgr/${pgrId}/external-export/${kind}/start`,
      );
      onHeavyWaitChange?.(null);
      return response;
    } catch (error) {
      const isHeavyGenerationBusy =
        error instanceof ApiError && error.code === HEAVY_GENERATION_IN_PROGRESS_CODE;
      const waitedTooLong = Date.now() - startedAt >= HEAVY_GENERATION_WAIT_TIMEOUT_MS;
      if (!isHeavyGenerationBusy || waitedTooLong) {
        onHeavyWaitChange?.(null);
        throw error;
      }
      onHeavyWaitChange?.(HEAVY_GENERATION_WAIT_MESSAGE);
      await sleep(HEAVY_GENERATION_RETRY_INTERVAL_MS);
    }
  }
}

async function startExternalExportJob(
  pgrId: string,
  kind: ExternalExportKind,
  onHeavyWaitChange?: (message: string | null) => void
): Promise<string> {
  const data = await startExternalExportJobWithResponse(pgrId, kind, onHeavyWaitChange);
  const jobId = extractJobId(data);
  if (!jobId) {
    throw new Error(`API não retornou job_id para ${kind.toUpperCase()}.`);
  }
  return jobId;
}

async function waitForExternalExportCompletion(
  pgrId: string,
  kind: ExternalExportKind,
  jobId: string
): Promise<ExternalJobStatusResponse> {
  const startedAt = Date.now();
  let pollIntervalMs = PGR_EXPORT_POLL_MIN_INTERVAL_MS;
  while (Date.now() - startedAt <= PGR_EXPORT_POLL_TIMEOUT_MS) {
    const data = await apiGet<ExternalJobStatusResponse>(
      `/api/v1/frontend/pgr/${pgrId}/external-export/${kind}/${jobId}`
    );
    const status = extractJobStatus(data);
    if (status === "completed") return data;
    if (status === "failed" || status === "error" || status === "cancelled") {
      throw new Error(
        extractJobError(data) || `Geração de ${kind.toUpperCase()} falhou.`
      );
    }

    await sleep(pollIntervalMs);
    pollIntervalMs = Math.min(
      PGR_EXPORT_POLL_MAX_INTERVAL_MS,
      pollIntervalMs + PGR_EXPORT_POLL_MIN_INTERVAL_MS
    );
  }

  throw new Error(`Tempo limite excedido na geração de ${kind.toUpperCase()}.`);
}

async function downloadExternalExport(
  pgrId: string,
  kind: ExternalExportKind,
  jobId: string
): Promise<Blob> {
  return apiBlobGet(`/api/v1/frontend/pgr/${pgrId}/external-export/${kind}/${jobId}/download`, {
    attempts: 4,
    backoffMs: 500,
    statuses: [503],
  });
}

const extractDocxJobIdFromDownloadUrl = (url: string): string => {
  const rawUrl = String(url || "").trim();
  if (!rawUrl) return "";

  let pathname = rawUrl;
  try {
    pathname = new URL(rawUrl, window.location.origin).pathname;
  } catch {
    pathname = rawUrl.split(/[?#]/, 1)[0] || "";
  }

  const segments = pathname.split("/").filter(Boolean);
  const jobsIndex = segments.findIndex((segment) => segment === "jobs");
  const jobId =
    jobsIndex >= 0 &&
    segments[jobsIndex + 1] === "docx" &&
    segments[jobsIndex + 2] === "pgr" &&
    segments[jobsIndex + 3] &&
    segments[jobsIndex + 4] === "download"
      ? segments[jobsIndex + 3]
      : "";

  return decodeURIComponent(jobId).trim();
};

async function downloadDocxFromUrlOrJob(args: {
  pgrId: string;
  docxDownloadUrl?: string;
}): Promise<Blob> {
  const docxDownloadUrl = String(args.docxDownloadUrl || "").trim();
  if (docxDownloadUrl) {
    const docxJobId = extractDocxJobIdFromDownloadUrl(docxDownloadUrl);
    if (docxJobId) {
      return downloadExternalExport(args.pgrId, "docx", docxJobId);
    }
  }

  const docxJobId = await startExternalExportJob(args.pgrId, "docx");
  await waitForExternalExportCompletion(args.pgrId, "docx", docxJobId);
  return downloadExternalExport(args.pgrId, "docx", docxJobId);
}

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 200);
};

async function startPipefyAttachJob(args: {
  pgrId: string;
  pdfBlob: Blob;
  xlsxBlob: Blob;
  pdfFilename: string;
  xlsxFilename: string;
}): Promise<string> {
  const formData = new FormData();
  formData.append("pdf_file", args.pdfBlob, args.pdfFilename);
  formData.append("xlsx_file", args.xlsxBlob, args.xlsxFilename);
  formData.append("organizationId", PIPEFY_ORGANIZATION_ID);
  formData.append("checkboxFieldLabel", PIPEFY_CHECKBOX_FIELD_LABEL);

  const response = await apiPostForm<PipefyAttachJobStartResponse>(
    `/api/v1/frontend/pgr/${args.pgrId}/pipefy/attach-files-and-mark/start`,
    formData
  );
  const jobId = extractJobId(response);
  if (!jobId) {
    throw new Error("API não retornou job_id para o anexo no Pipefy.");
  }
  return jobId;
}

async function waitForPipefyAttachJobCompletion(
  pgrId: string,
  jobId: string
): Promise<void> {
  const startedAt = Date.now();
  let pollIntervalMs = PIPEFY_ATTACH_POLL_MIN_INTERVAL_MS;
  while (Date.now() - startedAt <= PIPEFY_ATTACH_POLL_TIMEOUT_MS) {
    const data = await apiGet<PipefyAttachJobStatusResponse>(
      `/api/v1/frontend/pgr/${pgrId}/pipefy/attach-files-and-mark/${jobId}`
    );
    const status = extractJobStatus(data);
    if (status === "succeeded") return;
    if (status === "failed") {
      throw new Error(extractJobError(data) || "Falha ao anexar arquivos no Pipefy.");
    }

    await sleep(pollIntervalMs);
    pollIntervalMs = Math.min(
      PIPEFY_ATTACH_POLL_MAX_INTERVAL_MS,
      pollIntervalMs + PIPEFY_ATTACH_POLL_MIN_INTERVAL_MS
    );
  }

  throw new Error("Tempo limite excedido ao confirmar anexos no Pipefy.");
}

export function usePgrEtapaController({
  params,
}: {
  params: { id: string; etapa: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = pgrSteps.find((item) => item.id === params.etapa);
  if (!step) {
    notFound();
  }

  const currentIndex = useMemo(
    () => pgrSteps.findIndex((item) => item.id === step.id),
    [step.id]
  );

  const prevStep = currentIndex > 0 ? pgrSteps[currentIndex - 1] : null;
  const nextStep =
    currentIndex < pgrSteps.length - 1 ? pgrSteps[currentIndex + 1] : null;

  const { shouldHydrateFromApi, state, setters, refs, actions, ui } = usePgrEtapaState({
    paramsId: params.id,
    currentIndex,
  });

  const derived = usePgrEtapaDerived({
    riskCatalogs: state.riskCatalogs,
    functionsData: state.functionsData,
    gheGroups: state.gheGroups,
    currentGheId: state.currentGheId,
    searchTerm: state.searchTerm,
    gheSearch: state.gheSearch,
    gheFilterId: state.gheFilterId,
    riskGheGroups: state.riskGheGroups,
    planGeneralMeasures: state.planGeneralMeasures,
    removedPlanRiskKeys: state.removedPlanRiskKeys,
    planActionGheId: state.planActionGheId,
    planTablePage: state.planTablePage,
    planTablePageSize: state.planTablePageSize,
    inicioDraft: state.inicioDraft,
    dadosCadastrais: state.dadosCadastrais,
    historicoData: state.historicoData,
    anexos: state.anexos,
    planAction: state.planAction,
    pgrDocxTemplates: state.pgrDocxTemplates,
    completedSteps: state.completedSteps,
    currentStepId: step.id,
  });

  const weightedProgressPercent = useMemo(
    () =>
      computeWeightedProgressPercent({
        stepStatusById: derived.stepStatusById,
        gheGroups: state.gheGroups,
        isLocked: state.workflow.isLocked,
      }),
    [derived.stepStatusById, state.gheGroups, state.workflow.isLocked]
  );

  const [pipefySyncCooldownSeconds, setPipefySyncCooldownSeconds] = useState(0);
  const pipefySyncCooldownTimerRef = useRef<number | null>(null);
  const isPipefySyncCoolingDown = pipefySyncCooldownSeconds > 0;
  const rejectionReasonAppliedRef = useRef(false);

  // Conflito de edição concorrente (lock otimista): o save bateu 409 porque
  // outra pessoa alterou este PGR.
  const [saveConflict, setSaveConflict] = useState(false);
  useEffect(() => {
    // Ao abrir a etapa, sempre retoma as gravações: NUNCA deixar o save preso
    // em pausa silenciosa de uma navegação/sessão anterior (causava perda de
    // dados — o autosave parava de enviar request sem o usuário perceber).
    resumeSaving();
    setConflictHandler(() => setSaveConflict(true));
    return () => setConflictHandler(null);
  }, []);
  const reloadAfterConflict = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);
  const dismissSaveConflict = useCallback(() => {
    // "Continuar editando" = a minha versão prevalece. Limpa o token para o
    // próximo save ir sem expectedUpdatedAt (o backend pula a checagem),
    // sobrescrever e re-sincronizar, e retoma as gravações. Assim o trabalho do
    // usuário é salvo em vez de descartado em silêncio.
    clearKnownUpdatedAt(params.id);
    resumeSaving();
    setSaveConflict(false);
  }, [params.id]);

  const { persistLatestStateNow } = usePgrPersistence({
    params,
    shouldHydrateFromApi,
    defaultHistorico,
    initialInicioDraft,
    initialDadosCadastrais,
    defaultAnexos,
    applyMissingRiskDefaults: derived.applyMissingRiskDefaults,
    areStringArraysEqual,
    riskCatalogs: state.riskCatalogs,
    setRiskCatalogs: setters.setRiskCatalogs,
    setters: {
      setCompletedSteps: setters.setCompletedSteps,
      setProgressPercent: setters.setProgressPercent,
      setInicioDraft: setters.setInicioDraft,
      setDadosCadastrais: setters.setDadosCadastrais,
      setCardMeta: setters.setCardMeta,
      setHistoricoData: setters.setHistoricoData,
      setFunctionsData: setters.setFunctionsData,
      setExtraEstabelecimentoFields: setters.setExtraEstabelecimentoFields,
      setEstabelecimentoSelecionado: setters.setEstabelecimentoSelecionado,
      setPlanAction: setters.setPlanAction,
      setPersistedOptionsByRowId: setters.setPersistedOptionsByRowId,
      setRemovedPlanRiskKeys: setters.setRemovedPlanRiskKeys,
      setPlanGeneralMeasures: setters.setPlanGeneralMeasures,
      setAnexos: setters.setAnexos,
      setAnexoDiretriz: setters.setAnexoDiretriz,
      setAnexoDiretrizTemplateId: setters.setAnexoDiretrizTemplateId,
      setPgrDocxTemplates: setters.setPgrDocxTemplates,
      setGheGroups: setters.setGheGroups,
      setCurrentGheId: setters.setCurrentGheId,
      setRiskGheGroups: setters.setRiskGheGroups,
      setCurrentRiskGheId: setters.setCurrentRiskGheId,
      setPdfLayout: setters.setPdfLayout,
      setWorkflow: setters.setWorkflow,
      setIsStateLoading: setters.setIsStateLoading,
    },
    state: {
      completedSteps: state.completedSteps,
      progressPercent: state.progressPercent,
      inicioDraft: state.inicioDraft,
      dadosCadastrais: state.dadosCadastrais,
      cardMeta: state.cardMeta,
      historicoData: state.historicoData,
      functionsData: state.functionsData,
      extraEstabelecimentoFields: state.extraEstabelecimentoFields,
      estabelecimentoSelecionado: state.estabelecimentoSelecionado,
      planAction: state.planAction,
      planTableRows: derived.planTableRows,
      persistedOptionsByRowId: state.persistedOptionsByRowId,
      removedPlanRiskKeys: state.removedPlanRiskKeys,
      planGeneralMeasures: state.planGeneralMeasures,
      anexos: state.anexos,
      anexoDiretriz: state.anexoDiretriz,
      anexoDiretrizTemplateId: state.anexoDiretrizTemplateId,
      pgrDocxTemplates: state.pgrDocxTemplates,
      gheGroups: state.gheGroups,
      currentGheId: state.currentGheId,
      riskGheGroups: state.riskGheGroups,
      currentRiskGheId: state.currentRiskGheId,
      pdfLayout: state.pdfLayout,
      workflow: state.workflow,
      isStateLoading: state.isStateLoading,
    },
    refs: {
      saveTimerRef: refs.saveTimerRef,
      lastCompletedSyncRef: refs.lastCompletedSyncRef,
    },
    setRuntimeCachedStateFn: setRuntimeCachedState,
  });

  useEffect(() => {
    if (state.workflow.version !== 1) return;
    if (state.historicoData.changes.length > 0) return;

    const companyFallback =
      String(state.dadosCadastrais.empresaNome || "").trim() ||
      String(state.dadosCadastrais.empresaRazaoSocial || "").trim() ||
      String(state.inicioDraft.companyName || "").trim() ||
      "Empresa não informada";
    const todayIso = new Date().toISOString().slice(0, 10);
    const initialChange = {
      id: `historico-v1-${Date.now()}`,
      company: companyFallback,
      analysis: "00",
      change: "00",
      reason: "Elaboração inicial",
      date: todayIso,
      status: state.workflow.isLocked ? "Documento finalizado" : "Em edição",
    };

    setters.setPlanAction((current) => ({
      ...current,
      vigencia:
        current.vigencia ||
        calculatePlanActionVigencia([initialChange]),
    }));

    setters.setHistoricoData((prev) => {
      if (prev.changes.length > 0) return prev;
      return {
        ...prev,
        changes: [initialChange],
      };
    });
  }, [
    setters,
    state.dadosCadastrais.empresaNome,
    state.dadosCadastrais.empresaRazaoSocial,
    state.historicoData.changes.length,
    state.inicioDraft.companyName,
    state.workflow.isLocked,
    state.workflow.version,
  ]);

  const cycleTime = useCycleTimeTracker({
    stepId: step.id,
    historicoData: state.historicoData,
    isStateLoading: state.isStateLoading,
    isLocked: state.workflow.isLocked,
  });

  const handleAdvanceApiSync = useCallback((nextCompleted: number) => {
    void putPgrState(params.id, {
      completedSteps: nextCompleted,
      meta: {
        pgrId: params.id,
        progressPercent: weightedProgressPercent,
      },
    }).catch(() => {
      // Sem bloqueio de navegação em caso de falha de rede.
      // Conflito (409) já é tratado pelo funil putPgrState.
    });
  }, [params.id, weightedProgressPercent]);

  const buildStatePayload = useCallback(
    (layoutOverride?: PdfLayoutState) => ({
      completedSteps: state.completedSteps,
      meta: {
        pgrId: params.id,
        progressPercent: weightedProgressPercent,
      },
      inicioDraft: state.inicioDraft,
      dadosCadastrais: state.dadosCadastrais,
      cardMeta: state.cardMeta,
      historico: state.historicoData,
      functions: state.functionsData,
      extraEstabelecimentoFields: state.extraEstabelecimentoFields,
      estabelecimentoSelecionado: state.estabelecimentoSelecionado,
      planAction: {
        ...state.planAction,
        items: buildPersistedPlanActionItems(derived.planTableRows),
      },
      planTableRows: derived.planTableRows,
      persistedOptionsByRowId: state.persistedOptionsByRowId,
      removedPlanRiskKeys: state.removedPlanRiskKeys,
      planGeneralMeasures: state.planGeneralMeasures,
      anexos: state.anexos,
      anexoDiretriz: state.anexoDiretriz,
      anexoDiretrizTemplateId: state.anexoDiretrizTemplateId,
      gheGroups: state.gheGroups,
      currentGheId: state.currentGheId,
      riskGheGroups: state.riskGheGroups,
      currentRiskGheId: state.currentRiskGheId,
      pdfLayout: layoutOverride ?? state.pdfLayout,
      workflow: state.workflow,
    }),
    [
      params.id,
      derived.planTableRows,
      state,
      weightedProgressPercent,
    ]
  );

  const persistStateNow = useCallback(
    async (layoutOverride?: PdfLayoutState) => {
      await persistLatestStateNow({
        payloadOverride: layoutOverride
          ? buildStatePayload(layoutOverride)
          : undefined,
        buildFallbackPayload: () => buildStatePayload(layoutOverride),
      });
    },
    [buildStatePayload, persistLatestStateNow]
  );

  const rejectionReasonFromQuery = useMemo(
    () => String(searchParams?.get("rejectionReason") || "").trim(),
    [searchParams]
  );

  const pendingReviewFocus = useMemo(
    () => parsePendingReviewFocus(searchParams),
    [searchParams]
  );

  const accessibleStepIds = useMemo(
    () => pgrSteps.slice(0, Math.min(pgrSteps.length, state.completedSteps + 1)).map((step) => step.id),
    [state.completedSteps]
  );

  useEffect(() => {
    if (!rejectionReasonFromQuery) return;
    if (rejectionReasonAppliedRef.current) return;
    if (state.workflow.rejectionReason === rejectionReasonFromQuery) {
      rejectionReasonAppliedRef.current = true;
      return;
    }
    rejectionReasonAppliedRef.current = true;
    const nextWorkflow = {
      ...state.workflow,
      rejectionReason: rejectionReasonFromQuery,
    };
    setters.setWorkflow(nextWorkflow);
    void putPgrState(params.id, {
      ...buildStatePayload(),
      workflow: nextWorkflow,
    }).catch(() => {
      rejectionReasonAppliedRef.current = false;
    });
  }, [
    buildStatePayload,
    params.id,
    rejectionReasonFromQuery,
    setters,
    state.workflow,
  ]);

  const resolvedPlanAction = useMemo(
    () => ({
      ...state.planAction,
      items: buildPersistedPlanActionItems(derived.planTableRows),
    }),
    [derived.planTableRows, state.planAction]
  );

  const docxPayload = useMemo(
    () =>
      buildPgrDocxPayload({
        pgrId: params.id,
        generatedAt: new Date().toLocaleString("pt-BR"),
        completedSteps: state.completedSteps,
        totalSteps: pgrSteps.length,
        stepStatusById: derived.stepStatusById,
        inicioDraft: state.inicioDraft,
        dadosCadastrais: state.dadosCadastrais,
        historicoData: state.historicoData,
        gheGroups: state.gheGroups,
        riskGheGroups: state.riskGheGroups,
        planTableRows: derived.planTableRows,
        planGeneralMeasures: state.planGeneralMeasures,
        removedPlanRiskKeys: state.removedPlanRiskKeys,
        functionsData: state.functionsData,
        planAction: resolvedPlanAction,
        anexos: state.anexos,
        anexoDiretriz: state.anexoDiretriz,
        extraEstabelecimentoFields: state.extraEstabelecimentoFields,
        pdfLayout: state.pdfLayout,
      }),
    [
      derived.stepStatusById,
      derived.planTableRows,
      params.id,
      state.anexoDiretriz,
      state.anexos,
      state.completedSteps,
      state.dadosCadastrais,
      state.extraEstabelecimentoFields,
      state.functionsData,
      state.gheGroups,
      state.historicoData,
      state.inicioDraft,
      resolvedPlanAction,
      state.planGeneralMeasures,
      state.pdfLayout,
      state.removedPlanRiskKeys,
      state.riskGheGroups,
    ]
  );

  const fakePreviewLines = useMemo(
    () => JSON.stringify(docxPayload, null, 2).split("\n"),
    [docxPayload]
  );

  const attachmentsTotalBytes = useMemo(
    () =>
      state.anexos.reduce(
        (groupTotal, anexo) =>
          groupTotal +
          anexo.files.reduce((fileTotal, file) => fileTotal + (file.sizeBytes ?? 0), 0),
        0
      ),
    [state.anexos]
  );
  const attachmentsAreLarge = attachmentsTotalBytes >= LARGE_ATTACHMENT_BYTES_THRESHOLD;
  const attachmentsTotalMb = Math.round(attachmentsTotalBytes / (1024 * 1024));

  const handleFinalizePgr = useCallback(async () => {
    setters.setIsFinalizingPgr(true);
    try {
      await persistStateNow();
      const fileBase = buildPgrExportFileBase({
        companyName: state.inicioDraft.companyName,
        historico: state.historicoData,
        fallbackPgrId: params.id,
      });

      const [pdfStartResponse, xlsxJobId] = await Promise.all([
        startExternalExportJobWithResponse(
          params.id,
          "pdf",
          setters.setHeavyGenerationWaitMessage
        ),
        startExternalExportJob(params.id, "xlsx"),
      ]);
      const pdfJobId = extractJobId(pdfStartResponse);
      if (!pdfJobId) {
        throw new Error("API não retornou job_id para PDF.");
      }

      await Promise.all([
        waitForExternalExportCompletion(params.id, "pdf", pdfJobId),
        waitForExternalExportCompletion(params.id, "xlsx", xlsxJobId),
      ]);

      const [pdfBlob, xlsxBlob] = await Promise.all([
        downloadExternalExport(params.id, "pdf", pdfJobId),
        downloadExternalExport(params.id, "xlsx", xlsxJobId),
      ]);

      const pipefyAttachJobId = await startPipefyAttachJob({
        pgrId: params.id,
        pdfBlob,
        xlsxBlob,
        pdfFilename: `${fileBase}.pdf`,
        xlsxFilename: `${fileBase}.xlsx`,
      });
      setters.setHeavyGenerationWaitMessage(PIPEFY_ATTACH_WAIT_MESSAGE);
      try {
        await waitForPipefyAttachJobCompletion(params.id, pipefyAttachJobId);
      } finally {
        setters.setHeavyGenerationWaitMessage(null);
      }

      const finalizedState = await apiPost<{
        completedSteps: number;
        historico: HistoricoData;
        workflow: PersistedPgrState["workflow"];
        meta?: { progressPercent?: number };
        updatedAt?: string;
      }>(`/api/v1/frontend/pgr/${params.id}/finalize`);
      setKnownUpdatedAt(params.id, finalizedState?.updatedAt);
      if (finalizedState?.workflow) {
        setters.setWorkflow(finalizedState.workflow);
      }
      if (typeof finalizedState?.completedSteps === "number") {
        setters.setCompletedSteps(finalizedState.completedSteps);
      }
      if (typeof finalizedState?.meta?.progressPercent === "number") {
        setters.setProgressPercent(finalizedState.meta.progressPercent);
      } else if (finalizedState?.workflow?.isLocked) {
        setters.setProgressPercent(100);
      }
      if (finalizedState?.historico) {
        setters.setHistoricoData(finalizedState.historico);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar o PGR agora.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setters.setIsFinalizingPgr(false);
    }
  }, [
    persistStateNow,
    params.id,
    setters,
    state.historicoData,
    state.inicioDraft,
  ]);

  const handleGenerateFakePdf = useCallback(async () => {
    setters.setIsGeneratingFakePdf(true);
    try {
      await persistStateNow();
      const fileBase = buildPgrExportFileBase({
        companyName: state.inicioDraft.companyName,
        historico: state.historicoData,
        fallbackPgrId: params.id,
      });

      const [pdfStartResponse, xlsxJobId] = await Promise.all([
        startExternalExportJobWithResponse(
          params.id,
          "pdf",
          setters.setHeavyGenerationWaitMessage
        ),
        startExternalExportJob(params.id, "xlsx"),
      ]);
      const pdfJobId = extractJobId(pdfStartResponse);
      if (!pdfJobId) {
        throw new Error("API não retornou job_id para PDF.");
      }

      const [pdfCompletion] = await Promise.all([
        waitForExternalExportCompletion(params.id, "pdf", pdfJobId),
        waitForExternalExportCompletion(params.id, "xlsx", xlsxJobId),
      ]);

      const pdfBlob = await downloadExternalExport(params.id, "pdf", pdfJobId);
      triggerBlobDownload(pdfBlob, `${fileBase}.pdf`);

      const docxBlob = await downloadDocxFromUrlOrJob({
        pgrId: params.id,
        docxDownloadUrl:
          extractDocxDownloadUrl(pdfStartResponse) || extractDocxDownloadUrl(pdfCompletion),
      });
      triggerBlobDownload(docxBlob, `${fileBase}.docx`);

      const xlsxBlob = await downloadExternalExport(params.id, "xlsx", xlsxJobId);
      triggerBlobDownload(xlsxBlob, `${fileBase}.xlsx`);

      setters.setLastFakePdfAt(new Date().toLocaleString("pt-BR"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível gerar/baixar os arquivos agora.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setters.setIsGeneratingFakePdf(false);
    }
  }, [
    persistStateNow,
    params.id,
    setters,
    state.historicoData,
    state.inicioDraft,
  ]);

  const handleGeneratePreviewPdf = useCallback(
    async (layoutOverride?: PdfLayoutState) => {
      const effectiveLayout = layoutOverride ?? state.pdfLayout;
      await persistStateNow(effectiveLayout);
      const pdfStartResponse = await startExternalExportJobWithResponse(
        params.id,
        "pdf",
        setters.setHeavyGenerationWaitMessage
      );
      const pdfJobId = extractJobId(pdfStartResponse);
      if (!pdfJobId) {
        throw new Error("API não retornou job_id para PDF.");
      }
      await waitForExternalExportCompletion(params.id, "pdf", pdfJobId);
      const blob = await downloadExternalExport(params.id, "pdf", pdfJobId);
      return window.URL.createObjectURL(blob);
    },
    [
      state.pdfLayout,
      persistStateNow,
      params.id,
      setters,
    ]
  );

  const handleStartNewVersion = useCallback(async () => {
    try {
      if (refs.saveTimerRef.current) {
        window.clearTimeout(refs.saveTimerRef.current);
        refs.saveTimerRef.current = null;
      }

      const updatedState = await apiPost<{
        completedSteps?: number;
        historico?: HistoricoData;
        workflow?: PersistedPgrState["workflow"];
        meta?: { progressPercent?: number };
      }>(`/api/v1/frontend/pgr/${params.id}/new-version`);

      const refreshedState = await apiGet<{
        completedSteps?: number;
        historico?: HistoricoData;
        workflow?: PersistedPgrState["workflow"];
        meta?: { progressPercent?: number };
        updatedAt?: string;
      }>(`/api/v1/frontend/pgr/${params.id}/state`).catch(() => updatedState);

      setKnownUpdatedAt(params.id, (refreshedState as { updatedAt?: string })?.updatedAt);
      if (refreshedState?.workflow) {
        setters.setWorkflow(refreshedState.workflow);
      }
      if (typeof refreshedState?.completedSteps === "number") {
        setters.setCompletedSteps(refreshedState.completedSteps);
      }
      if (typeof refreshedState?.meta?.progressPercent === "number") {
        setters.setProgressPercent(refreshedState.meta.progressPercent);
      }
      if (refreshedState?.historico) {
        setters.setHistoricoData(refreshedState.historico);
      }
      router.push(`/pgr/${params.id}/inicio`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar uma nova versão agora.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    }
  }, [params.id, refs.saveTimerRef, router, setters]);

  const handleEditCurrentVersion = useCallback(
    (reason: string) => {
      const normalizedReason = String(reason || "").trim();
      const suffix = normalizedReason
        ? `?rejectionReason=${encodeURIComponent(normalizedReason)}`
        : "";
      router.push(`/pgr/${params.id}/inicio${suffix}`);
    },
    [params.id, router]
  );

  const handleHistoricoChangeField = useCallback(
    (
      changeId: string,
      field: "company" | "analysis" | "change" | "reason" | "date" | "status",
      value: string
    ) => {
      setters.setHistoricoData((prev) => ({
        ...prev,
        changes: sortHistoricoChanges(
          prev.changes.map((item) =>
            item.id === changeId ? { ...item, [field]: value } : item
          )
        ),
      }));
    },
    [setters]
  );

  const handleResetInicioData = useCallback(() => {
    if (state.workflow.isLocked) return;
    setters.setInicioDraft(initialInicioDraft);
  }, [setters, state.workflow.isLocked]);

  const handleResetDadosData = useCallback(() => {
    if (state.workflow.isLocked) return;
    refs.lastCepLookupRef.current = {
      empresa: "",
      estabelecimentoByIndex: {},
      contratanteByIndex: {},
    };
    setters.setDadosCadastrais(initialDadosCadastrais);
    setters.setExtraEstabelecimentoFields([]);
    setters.setEstabelecimentoSelecionado("");
  }, [refs.lastCepLookupRef, setters, state.workflow.isLocked]);

  const handleResetDescricaoData = useCallback(() => {
    if (state.workflow.isLocked) return;
    setters.setFunctionsData(defaultFunctions);
    setters.setGheGroups(defaultGheGroups);
    setters.setCurrentGheId(defaultGheGroups[0]?.id ?? "ghe-1");
    setters.setSelectedLeftIds([]);
    setters.setSelectedRightIds([]);
    setters.setHistory([]);
    setters.setSearchTerm("");
    setters.setGheSearch("");
    setters.setGheFilterId("all");
    setters.setIsGheListView(false);
    setters.setIsGheModalOpen(false);
    setters.setIsInfoModalOpen(false);
    setters.setInfoModalError("");
    setters.setInfoModalMode("next");
    setters.setLastGheNotice(null);
    setters.setExcelImportFeedback(null);
    setters.setRiskGheGroups(defaultRiskGheGroups);
    setters.setCurrentRiskGheId(defaultRiskGheGroups[0]?.id ?? "ghe-1");
    setters.setRemovedPlanRiskKeys([]);
    setters.setPlanGeneralMeasures([]);
    setters.setPlanActionGheId("");
    setters.setPlanActionRiskId("");
  }, [setters, state.workflow.isLocked]);

  const handleResetCaracterizacaoData = useCallback(() => {
    if (state.workflow.isLocked) return;
    setters.setRiskGheGroups(defaultRiskGheGroups);
    setters.setCurrentRiskGheId(defaultRiskGheGroups[0]?.id ?? "ghe-1");
    setters.setHistory([]);
    setters.setRemovedPlanRiskKeys([]);
    setters.setPlanGeneralMeasures([]);
    setters.setPlanActionGheId("");
    setters.setPlanActionRiskId("");
  }, [setters, state.workflow.isLocked]);

  const handleResetPlanoData = useCallback(() => {
    if (state.workflow.isLocked) return;
    setters.setPlanAction({
      nr: "NR-01",
      vigencia: calculatePlanActionVigencia(state.historicoData.changes),
    });
    setters.setRemovedPlanRiskKeys([]);
    setters.setPlanGeneralMeasures([]);
    setters.setEditingMedidasId(null);
    setters.setEditingMedidasValue("");
    setters.setPlanTablePage(1);
    setters.setIsPlanActionModalOpen(false);
    setters.setPlanActionScope("risk");
    setters.setPlanActionGheId("");
    setters.setPlanActionRiskId("");
    setters.setPlanActionDescription("");
    setters.setRiskGheGroups((prev) =>
      prev.map((ghe) => ({
        ...ghe,
        risks: ghe.risks.map((risk) => ({
          ...risk,
          medidasControle: "",
          tipoMedida: "",
          prazoAcao: "",
          responsavelAcao: "",
          acompanhamento: "",
          afericaoResultado: "",
        })),
      }))
    );
  }, [setters, state.historicoData.changes, state.workflow.isLocked]);

  useEffect(() => {
    if (!state.workflow.isLocked) return;
    if (step.id === "historico" || step.id === "revisao") return;
    router.push(`/pgr/${params.id}/historico`);
  }, [params.id, router, state.workflow.isLocked, step.id]);

  useEffect(() => {
    if (state.progressPercent !== weightedProgressPercent) {
      setters.setProgressPercent(weightedProgressPercent);
    }
  }, [setters, state.progressPercent, weightedProgressPercent]);

  useEffect(() => {
    const orderedSteps = pgrSteps.map((item) => item.id);
    let contiguousDone = 0;
    for (const stepId of orderedSteps) {
      if (!derived.stepStatusById[stepId]) break;
      contiguousDone += 1;
    }
    if (contiguousDone > state.completedSteps) {
      setters.setCompletedSteps(contiguousDone);
      handleAdvanceApiSync(contiguousDone);
    }
  }, [derived.stepStatusById, handleAdvanceApiSync, setters, state.completedSteps]);

  useEffect(() => {
    if (state.planTablePage > derived.planTableTotalPages) {
      setters.setPlanTablePage(derived.planTableTotalPages);
    }
  }, [derived.planTableTotalPages, setters, state.planTablePage]);

  useEffect(() => {
    const selectedTemplateId = state.anexoDiretrizTemplateId;
    const selectedOption =
      selectedTemplateId === null
        ? derived.diretrizOptions[0]
        : derived.diretrizOptions.find((item) => item.templateId === selectedTemplateId);

    if (!selectedOption) {
      const fallbackOption = derived.diretrizOptions[0];
      if (!fallbackOption) return;
      if (state.anexoDiretriz !== fallbackOption.label) {
        setters.setAnexoDiretriz(fallbackOption.label);
      }
      if (state.anexoDiretrizTemplateId !== fallbackOption.templateId) {
        setters.setAnexoDiretrizTemplateId(fallbackOption.templateId);
      }
      return;
    }

    if (state.anexoDiretriz !== selectedOption.label) {
      setters.setAnexoDiretriz(selectedOption.label);
    }
  }, [
    derived.diretrizOptions,
    setters,
    state.anexoDiretriz,
    state.anexoDiretrizTemplateId,
  ]);

  useEffect(
    () => () => {
      if (pipefySyncCooldownTimerRef.current !== null) {
        window.clearInterval(pipefySyncCooldownTimerRef.current);
      }
    },
    []
  );

  const generalActions = createGeneralActions({
    params,
    initialDadosCadastrais,
    setters: {
      setInicioDraft: setters.setInicioDraft,
      setDadosCadastrais: setters.setDadosCadastrais,
      setCardMeta: setters.setCardMeta,
      setHistoricoData: setters.setHistoricoData,
      setIsPipefySyncing: setters.setIsPipefySyncing,
      setPlanActionScope: setters.setPlanActionScope,
      setPlanActionGheId: setters.setPlanActionGheId,
      setPlanActionRiskId: setters.setPlanActionRiskId,
      setPlanActionDescription: setters.setPlanActionDescription,
      setIsPlanActionModalOpen: setters.setIsPlanActionModalOpen,
      setRiskGheGroups: setters.setRiskGheGroups,
      setRemovedPlanRiskKeys: setters.setRemovedPlanRiskKeys,
      setPlanGeneralMeasures: setters.setPlanGeneralMeasures,
      setEditingMedidasId: setters.setEditingMedidasId,
      setEditingMedidasValue: setters.setEditingMedidasValue,
      setCompletedSteps: setters.setCompletedSteps,
      setExtraEstabelecimentoFields: setters.setExtraEstabelecimentoFields,
      setFunctionsData: setters.setFunctionsData,
      setGheGroups: setters.setGheGroups,
      setCurrentGheId: setters.setCurrentGheId,
      setCurrentRiskGheId: setters.setCurrentRiskGheId,
      setSelectedLeftIds: setters.setSelectedLeftIds,
      setSelectedRightIds: setters.setSelectedRightIds,
      setGheSearch: setters.setGheSearch,
      setSearchTerm: setters.setSearchTerm,
      setGheFilterId: setters.setGheFilterId,
      setHistory: setters.setHistory,
      setLastGheNotice: setters.setLastGheNotice,
      setExcelImportFeedback: setters.setExcelImportFeedback,
      setIsImportingExcel: setters.setIsImportingExcel,
      setAnexos: setters.setAnexos,
      setDraggedAnexoId: setters.setDraggedAnexoId,
      setDragOverAnexoId: setters.setDragOverAnexoId,
    },
    current: {
      stepId: step.id,
      allGhesDescribed: derived.allGhesDescribed,
      lastCepLookupRef: refs.lastCepLookupRef,
      functionsData: state.functionsData,
      gheGroups: state.gheGroups,
      planActionScope: state.planActionScope,
      planAction: state.planAction,
      riskGheGroups: state.riskGheGroups,
      planActionGheId: state.planActionGheId,
      planActionRiskId: state.planActionRiskId,
      planActionDescription: state.planActionDescription,
      editingMedidasValue: state.editingMedidasValue,
      completedSteps: state.completedSteps,
      currentIndex,
      nextStep,
      router,
      historicoData: state.historicoData,
      anexos: state.anexos,
      dragOverAnexoId: state.dragOverAnexoId,
      draggedAnexoId: state.draggedAnexoId,
    },
    helpers: {
      handleAdvanceApiSync,
      persistStateNow: () => persistStateNow(),
    },
  });

  const handleSyncPipefy = useCallback(async () => {
    if (state.isPipefySyncing || isPipefySyncCoolingDown) return;

    setPipefySyncCooldownSeconds(5);
    try {
      await generalActions.handleLoadPipefyMock();
    } finally {
      if (pipefySyncCooldownTimerRef.current !== null) {
        window.clearInterval(pipefySyncCooldownTimerRef.current);
      }
      pipefySyncCooldownTimerRef.current = window.setInterval(() => {
        setPipefySyncCooldownSeconds((prev) => {
          if (prev <= 1) {
            if (pipefySyncCooldownTimerRef.current !== null) {
              window.clearInterval(pipefySyncCooldownTimerRef.current);
              pipefySyncCooldownTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [generalActions, isPipefySyncCoolingDown, state.isPipefySyncing]);

  const autoPipefySyncCardRef = useRef<string | null>(null);
  const hasMeaningfulLocalState = useMemo(() => {
    if (state.completedSteps > 0) return true;
    if (state.functionsData.length > 0) return true;
    if (state.planGeneralMeasures.length > 0) return true;
    if (state.gheGroups.some((ghe) =>
      ghe.items.length > 0 ||
      String(ghe.info.processo || "").trim() ||
      String(ghe.info.observacoes || "").trim() !== "-" ||
      String(ghe.info.ambiente || "").trim() !== "A ser evidenciado na fase de reconhecimento"
    )) {
      return true;
    }
    return state.riskGheGroups.some((ghe) => ghe.risks.length > 0);
  }, [
    state.completedSteps,
    state.functionsData.length,
    state.gheGroups,
    state.planGeneralMeasures.length,
    state.riskGheGroups,
  ]);

  useEffect(() => {
    if (state.isStateLoading) return;
    if (state.isPipefySyncing) return;
    if (state.inicioDraft.syncedAt) return;
    if (hasMeaningfulLocalState) return;
    if (autoPipefySyncCardRef.current === params.id) return;

    autoPipefySyncCardRef.current = params.id;
    void generalActions.handleLoadPipefyMock().catch(() => {
      // Mantém silencioso: usuário pode continuar preenchendo manualmente.
    });
  }, [
    generalActions,
    hasMeaningfulLocalState,
    params.id,
    state.inicioDraft.syncedAt,
    state.isPipefySyncing,
    state.isStateLoading,
  ]);

  const descricaoInteractions = useDescricaoInteractions({
    currentGhe: derived.currentGhe,
    currentGheName: derived.currentGheName,
    nextExistingGhe: derived.nextExistingGhe,
    canOpenInfoModal: derived.canOpenInfoModal,
    canCreateNextGhe: derived.canCreateNextGhe,
    remainingCount: derived.remainingCount,
    allGhesDescribed: derived.allGhesDescribed,
    infoModalMode: state.infoModalMode,
    infoModalError: state.infoModalError,
    functionsData: state.functionsData,
    availableFunctions: derived.availableFunctions,
    selectedLeftIds: state.selectedLeftIds,
    selectedRightIds: state.selectedRightIds,
    functionAssignments: derived.functionAssignments,
    gheGroups: state.gheGroups,
    isGheInfoComplete: derived.isGheInfoComplete,
    setGheGroups: setters.setGheGroups,
    setFunctionsData: setters.setFunctionsData,
    setRiskGheGroups: setters.setRiskGheGroups,
    setCurrentGheId: setters.setCurrentGheId,
    setCurrentRiskGheId: setters.setCurrentRiskGheId,
    setLastGheNotice: setters.setLastGheNotice,
    setSelectedLeftIds: setters.setSelectedLeftIds,
    setSelectedRightIds: setters.setSelectedRightIds,
    setInfoModalError: setters.setInfoModalError,
    setInfoModalMode: setters.setInfoModalMode,
    setIsInfoModalOpen: setters.setIsInfoModalOpen,
    setIsGheModalOpen: setters.setIsGheModalOpen,
    pushHistory: actions.pushHistory,
    handleAdvance: generalActions.handleAdvance,
  });

  useHistoryUndo({
    setHistory: setters.setHistory,
    setGheGroups: setters.setGheGroups,
    setCurrentGheId: setters.setCurrentGheId,
    setSelectedLeftIds: setters.setSelectedLeftIds,
    setSelectedRightIds: setters.setSelectedRightIds,
    setRiskGheGroups: setters.setRiskGheGroups,
    setCurrentRiskGheId: setters.setCurrentRiskGheId,
  });

  return {
    conflict: {
      open: saveConflict,
      onReload: reloadAfterConflict,
      onDismiss: dismissSaveConflict,
    },
    shellProps: {
      pgrId: params.id,
      currentStep: step.id as PgrStepId,
      completedSteps: state.completedSteps,
      progressPercent: state.progressPercent,
      alertSteps: derived.alertSteps,
      stepStatusById: derived.stepStatusById,
      accessibleStepIds,
      cycleTimeMs: cycleTime.cycleTotalMs,
      cycleSessionStartedAtMs: cycleTime.activeSessionStartedAtMs,
      onNavigateStep: (stepId: PgrStepId) => router.push(`/pgr/${params.id}/${stepId}`),
    },
    bodyCtx: {
      step,
      params,
      router,
      completedSteps: state.completedSteps,
      inicioDraft: state.inicioDraft,
      isPipefySyncing: state.isPipefySyncing,
      isPipefySyncCoolingDown,
      pipefySyncCooldownSeconds,
      inputBaseClass: ui.inputBaseClass,
      textareaBaseClass: ui.textareaBaseClass,
      historicoData: state.historicoData,
      selectBaseClass: ui.selectBaseClass,
      dadosCadastrais: state.dadosCadastrais,
      estabelecimentoSelecionado: state.estabelecimentoSelecionado,
      estabelecimentoOptions: derived.estabelecimentoOptions,
      extraEstabelecimentoFields: state.extraEstabelecimentoFields,
      setEstabelecimentoSelecionado: setters.setEstabelecimentoSelecionado,
      currentGheName: derived.currentGheName,
      lastGheNotice: state.lastGheNotice,
      searchTerm: state.searchTerm,
      setSearchTerm: setters.setSearchTerm,
      availableCountLabel: derived.availableCountLabel,
      remainingCount: derived.remainingCount,
      describedGheCount: derived.describedGheCount,
      setIsGheModalOpen: setters.setIsGheModalOpen,
      setIsGheListView: setters.setIsGheListView,
      isGheListView: state.isGheListView,
      importExcelInputRef: refs.importExcelInputRef,
      isImportingExcel: state.isImportingExcel,
      excelImportFeedback: state.excelImportFeedback,
      groupedFunctions: derived.groupedFunctions,
      selectedLeftIds: state.selectedLeftIds,
      setSelectedLeftIds: setters.setSelectedLeftIds,
      currentItems: derived.currentItems,
      functionMap: derived.functionMap,
      selectedRightIds: state.selectedRightIds,
      miniInputClass: ui.miniInputClass,
      isGheModalOpen: state.isGheModalOpen,
      gheFilterId: state.gheFilterId,
      setGheFilterId: setters.setGheFilterId,
      gheGroups: state.gheGroups,
      gheSearch: state.gheSearch,
      setGheSearch: setters.setGheSearch,
      inputInlineClass: ui.inputInlineClass,
      normalizedGheSearch: derived.normalizedGheSearch,
      filteredAllFunctions: derived.filteredAllFunctions,
      filteredGheGroupsForList: derived.filteredGheGroupsForList,
      truncatePreview,
      functionAssignments: derived.functionAssignments,
      assignGheOptions: derived.assignGheOptions,
      isInfoModalOpen: state.isInfoModalOpen,
      setInfoModalError: setters.setInfoModalError,
      setIsInfoModalOpen: setters.setIsInfoModalOpen,
      currentGhe: derived.currentGhe,
      setCurrentGheId: setters.setCurrentGheId,
      infoModalError: state.infoModalError,
      infoModalMode: state.infoModalMode,
      workflow: state.workflow,
      riskCatalogs: state.riskCatalogs,
      riskGheGroups: state.riskGheGroups,
      setRiskGheGroups: setters.setRiskGheGroups,
      currentRiskGheId: state.currentRiskGheId,
      setCurrentRiskGheId: setters.setCurrentRiskGheId,
      pdfLayout: state.pdfLayout,
      setPdfLayout: setters.setPdfLayout,
      pushHistory: actions.pushHistory,
      applyMissingRiskDefaults: derived.applyMissingRiskDefaults,
      tipoAgenteOptions: derived.tipoAgenteOptions,
      getDescricaoAgenteOptions: derived.getDescricaoAgenteOptions,
      getMeioPropagacaoOptions: derived.getMeioPropagacaoOptions,
      getFontesOptions: derived.getFontesOptions,
      getDanosSaudeOptions: derived.getDanosSaudeOptions,
      getTipoAvaliacaoOptions: derived.getTipoAvaliacaoOptions,
      getHasExactQuantitativeCriteria: derived.getHasExactQuantitativeCriteria,
      getUnidadeMedidaOptions: derived.getUnidadeMedidaOptions,
      getIntensidadeOptions: derived.getIntensidadeOptions,
      getIsCalculatedCriteria: derived.getIsCalculatedCriteria,
      getHasQuantitativeCriteria: derived.getHasQuantitativeCriteria,
      getNivelAcaoOptions: derived.getNivelAcaoOptions,
      getSeveridadeOptions: derived.getSeveridadeOptions,
      getMedidasControleOptions: derived.getMedidasControleOptions,
      getNormasOptions: derived.getNormasOptions,
      getActionDescriptionOptions: derived.getActionDescriptionOptions,
      getEpiOptions: derived.getEpiOptions,
      getEpcOptions: derived.getEpcOptions,
      calculateRiskClassification: derived.calculateRiskClassification,
      selectSmallClass: ui.selectSmallClass,
      planAction: state.planAction,
      setPlanAction: setters.setPlanAction,
      planTableRows: derived.planTableRows,
      planTableRowsPage: derived.planTableRowsPage,
      editingMedidasId: state.editingMedidasId,
      editingMedidasValue: state.editingMedidasValue,
      setEditingMedidasValue: setters.setEditingMedidasValue,
      planTableCurrentPage: derived.planTableCurrentPage,
      planTableTotalPages: derived.planTableTotalPages,
      setPlanTablePage: setters.setPlanTablePage,
      isPlanActionModalOpen: state.isPlanActionModalOpen,
      setIsPlanActionModalOpen: setters.setIsPlanActionModalOpen,
      planActionScope: state.planActionScope,
      planActionGheId: state.planActionGheId,
      planActionGheOptions: derived.planActionGheOptions,
      planActionRiskId: state.planActionRiskId,
      setPlanActionRiskId: setters.setPlanActionRiskId,
      getPlanActionRiskOptions: derived.getPlanActionRiskOptions,
      planActionRiskOptions: derived.planActionRiskOptions,
      planActionDescription: state.planActionDescription,
      setPlanActionDescription: setters.setPlanActionDescription,
      persistedOptionsByRowId: state.persistedOptionsByRowId,
      setPersistedOptionsByRowId: setters.setPersistedOptionsByRowId,
      anexoDiretriz: state.anexoDiretriz,
      anexoDiretrizTemplateId: state.anexoDiretrizTemplateId,
      setAnexoDiretriz: setters.setAnexoDiretriz,
      setAnexoDiretrizTemplateId: setters.setAnexoDiretrizTemplateId,
      diretrizOptions: derived.diretrizOptions,
      anexos: state.anexos,
      dragOverAnexoId: state.dragOverAnexoId,
      lastFakePdfAt: state.lastFakePdfAt,
      isGeneratingFakePdf: state.isGeneratingFakePdf,
      isFinalizingPgr: state.isFinalizingPgr,
      heavyGenerationWaitMessage: state.heavyGenerationWaitMessage,
      attachmentsAreLarge,
      attachmentsTotalMb,
      stepStatusById: derived.stepStatusById,
      missingFieldsByStep: derived.missingFieldsByStep,
      missingTargetsByStep: derived.missingTargetsByStep,
      pendingReviewFocus,
      isPreviewModalOpen: state.isPreviewModalOpen,
      setIsPreviewModalOpen: setters.setIsPreviewModalOpen,
      fakePreviewLines,
      handleGeneratePreviewPdf,
      handleGenerateFakePdf,
      handleFinalizePgr,
      handleStartNewVersion,
      handleEditCurrentVersion,
      handleHistoricoChangeField,
      handleResetInicioData,
      handleResetDadosData,
      handleResetDescricaoData,
      handleResetCaracterizacaoData,
      handleResetPlanoData,
      generalActions,
      handleSyncPipefy,
      descricaoInteractions,
    },
    footerProps: {
      stepId: step.id,
      prevStepId: prevStep?.id ?? null,
      nextStepId: nextStep?.id ?? null,
      workflowIsLocked: state.workflow.isLocked,
      onNavigateStep: (stepId: string) => router.push(`/pgr/${params.id}/${stepId}`),
      onAdvance: generalActions.handleAdvance,
      onCreateNextGhe: descricaoInteractions.handleCreateNextGhe,
      onOpenInfoForAdvance: descricaoInteractions.handleOpenInfoForAdvance,
      canOpenInfoModal: derived.canOpenInfoModal,
      remainingCount: derived.remainingCount,
      hasNextExistingGhe: Boolean(derived.nextExistingGhe),
      allGhesDescribed: derived.allGhesDescribed,
    },
  };
}
