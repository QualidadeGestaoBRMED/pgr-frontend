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
import { getRuntimeCachedState, setRuntimeCachedState } from "../state/runtime-cache";
import {
  putPgrState,
  setKnownUpdatedAt,
  setConflictHandler,
  setSaveErrorHandler,
  setSaveActivityHandler,
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
// Upload dos arquivos gerados + presign + PUT no S3 + mutations GraphQL
// (xlsx, pdf e, quando aplicável, checkbox), cada uma com leitura de confirmacao. Bem mais leve
// que a geracao do PDF/DOCX (sem renderizacao), mas ainda assim ajustar este
// valor se o backend mudar o job_timeout do worker do Celery.
const PIPEFY_ATTACH_POLL_TIMEOUT_MS = 180000;
const PIPEFY_ATTACH_WAIT_MESSAGE =
  "Enviando arquivos para o Pipefy e confirmando os anexos...";

class FinalizationCancelledError extends Error {
  constructor() {
    super("Finalização cancelada.");
    this.name = "FinalizationCancelledError";
  }
}

type ExternalJobStartResponse = {
  job_id?: string;
  jobId?: string;
  id?: string;
  docxDownloadUrl?: string;
  docx_download_url?: string;
};

type PipefyAttachJobStartResponse = {
  job_id?: string;
  status: string;
  skipped?: boolean;
};

type PreviousPgrResponse = {
  available: boolean;
  sourcePgrId?: string | null;
  companyName?: string | null;
  finalizedAt?: string | null;
  finalizedBy?: string | null;
  sourceVersion?: number | null;
  attachmentsCount?: number;
  reason?: string | null;
};

const PREVIOUS_PGR_UNAVAILABLE_REASON_MESSAGES: Record<string, string> = {
  destination_locked:
    "Este PGR já está finalizado e bloqueado para edição — inicie uma nova versão antes de importar.",
  destination_has_content:
    "Este PGR já tem conteúdo preenchido (além de Início/Dados Cadastrais) — a importação não sobrescreve dados existentes.",
  no_company:
    "Não foi possível identificar a empresa deste card ainda. Clique em \"Sincronizar\" e tente novamente.",
  no_previous: "Nenhum PGR anterior finalizado encontrado para esta empresa.",
  function_inclusion:
    "A importação do PGR anterior não está disponível durante a inclusão de função.",
};

function describePreviousPgrUnavailableReason(response: PreviousPgrResponse | null | undefined): string {
  const key = String(response?.reason || "").trim();
  if (key === "previous_not_finalized") {
    const companyName = String(response?.companyName || "").trim();
    const companySuffix = companyName ? ` (${companyName})` : "";
    return (
      `Foi encontrado um PGR anterior${companySuffix} desta empresa, mas ele ainda não foi ` +
      "finalizado. Peça para um administrador finalizar o card antigo antes de importar."
    );
  }
  return (
    PREVIOUS_PGR_UNAVAILABLE_REASON_MESSAGES[key] ||
    PREVIOUS_PGR_UNAVAILABLE_REASON_MESSAGES.no_previous
  );
}

function formatIsoDateToBr(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("pt-BR");
}

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
  onHeavyWaitChange?: (message: string | null) => void,
  isCancelled?: () => boolean
) {
  const startedAt = Date.now();
  for (;;) {
    if (isCancelled?.()) throw new FinalizationCancelledError();
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
      if (isCancelled?.()) throw new FinalizationCancelledError();
    }
  }
}

async function startExternalExportJob(
  pgrId: string,
  kind: ExternalExportKind,
  onHeavyWaitChange?: (message: string | null) => void,
  isCancelled?: () => boolean
): Promise<string> {
  const data = await startExternalExportJobWithResponse(
    pgrId,
    kind,
    onHeavyWaitChange,
    isCancelled
  );
  const jobId = extractJobId(data);
  if (!jobId) {
    throw new Error(`API não retornou job_id para ${kind.toUpperCase()}.`);
  }
  return jobId;
}

async function waitForExternalExportCompletion(
  pgrId: string,
  kind: ExternalExportKind,
  jobId: string,
  isCancelled?: () => boolean
): Promise<ExternalJobStatusResponse> {
  const startedAt = Date.now();
  let pollIntervalMs = PGR_EXPORT_POLL_MIN_INTERVAL_MS;
  while (Date.now() - startedAt <= PGR_EXPORT_POLL_TIMEOUT_MS) {
    if (isCancelled?.()) throw new FinalizationCancelledError();
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
    if (isCancelled?.()) throw new FinalizationCancelledError();
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
}): Promise<string | null> {
  const formData = new FormData();
  formData.append("pdf_file", args.pdfBlob, args.pdfFilename);
  formData.append("xlsx_file", args.xlsxBlob, args.xlsxFilename);
  formData.append("organizationId", PIPEFY_ORGANIZATION_ID);
  formData.append("checkboxFieldLabel", PIPEFY_CHECKBOX_FIELD_LABEL);

  const response = await apiPostForm<PipefyAttachJobStartResponse>(
    `/api/v1/frontend/pgr/${args.pgrId}/pipefy/attach-files-and-mark/start`,
    formData
  );
  if (response?.skipped) {
    // Card fora das fases de Segurança do Trabalho monitoradas -- não é
    // erro, só não há anexo a fazer; a finalização segue sem aviso.
    return null;
  }
  const jobId = extractJobId(response);
  if (!jobId) {
    throw new Error("API não retornou job_id para o anexo no Pipefy.");
  }
  return jobId;
}

async function waitForPipefyAttachJobCompletion(
  pgrId: string,
  jobId: string,
  isCancelled?: () => boolean
): Promise<void> {
  const startedAt = Date.now();
  let pollIntervalMs = PIPEFY_ATTACH_POLL_MIN_INTERVAL_MS;
  while (Date.now() - startedAt <= PIPEFY_ATTACH_POLL_TIMEOUT_MS) {
    if (isCancelled?.()) throw new FinalizationCancelledError();
    const data = await apiGet<PipefyAttachJobStatusResponse>(
      `/api/v1/frontend/pgr/${pgrId}/pipefy/attach-files-and-mark/${jobId}`
    );
    const status = extractJobStatus(data);
    if (status === "succeeded") return;
    if (status === "cancelled") throw new FinalizationCancelledError();
    if (status === "failed") {
      throw new Error(extractJobError(data) || "Falha ao anexar arquivos no Pipefy.");
    }

    await sleep(pollIntervalMs);
    if (isCancelled?.()) throw new FinalizationCancelledError();
    pollIntervalMs = Math.min(
      PIPEFY_ATTACH_POLL_MAX_INTERVAL_MS,
      pollIntervalMs + PIPEFY_ATTACH_POLL_MIN_INTERVAL_MS
    );
  }

  throw new Error("Tempo limite excedido ao confirmar anexos no Pipefy.");
}

export function usePgrEtapaController({
  params,
  onNavigateStep,
}: {
  params: { id: string; etapa: string };
  onNavigateStep?: (stepId: string) => void;
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

  const navigateToStep = useCallback(
    (stepId: string) => {
      if (onNavigateStep) {
        onNavigateStep(stepId);
        return;
      }
      router.push(`/pgr/${params.id}/${stepId}`, { scroll: false });
    },
    [onNavigateStep, params.id, router]
  );

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
  // Qualquer erro de save que não seja 409 (rede, payload grande, 500) —
  // antes era engolido em silêncio pelo autosave; isso já causou perda real
  // de horas de edição em produção (usuário achando que estava salvando).
  const [saveError, setSaveError] = useState(false);
  const [isSaveQueueActive, setIsSaveQueueActive] = useState(false);
  const retrySaveAfterConflictRef = useRef<() => void>(() => {});
  const [isCancellingFinalization, setIsCancellingFinalization] = useState(false);
  const finalizationAttemptRef = useRef(0);
  useEffect(() => {
    // Ao abrir a etapa, sempre retoma as gravações: NUNCA deixar o save preso
    // em pausa silenciosa de uma navegação/sessão anterior (causava perda de
    // dados — o autosave parava de enviar request sem o usuário perceber).
    resumeSaving();
    setConflictHandler(() => setSaveConflict(true));
    setSaveErrorHandler(setSaveError);
    setSaveActivityHandler(setIsSaveQueueActive);
    return () => {
      setConflictHandler(null);
      setSaveErrorHandler(null);
      setSaveActivityHandler(null);
    };
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
    retrySaveAfterConflictRef.current();
  }, [params.id]);

  // PGR anterior finalizado da mesma empresa disponível para importação.
  // Preenchido após o auto-sync com o Pipefy. Não há opção de recusar: uma
  // vez importado, o destino passa a ter conteúdo próprio e a detecção não
  // oferece de novo (guarda destination_has_content no backend).
  const [previousImport, setPreviousImport] = useState<{
    sourcePgrId: string;
    companyName: string;
    finalizedAt: string;
    attachmentsCount: number;
  } | null>(null);
  const [isImportingPrevious, setIsImportingPrevious] = useState(false);
  const [previousImportError, setPreviousImportError] = useState<string | null>(
    null
  );
  const [isCheckingPreviousPgr, setIsCheckingPreviousPgr] = useState(false);
  const [previousPgrCheckNotice, setPreviousPgrCheckNotice] = useState<string | null>(
    null
  );
  const [lastFunctionInclusion, setLastFunctionInclusion] = useState<{
    funcao: string;
    resolvedBy: string;
    resolvedAt: string;
  } | null>(null);

  // Solicitações de inclusão de função pendentes da empresa deste PGR,
  // mostradas em modo consulta pelo botão flutuante — ver
  // FunctionInclusionRequestsModal. A resolução em si (marcar como
  // incluída) só acontece na Home, nunca aqui dentro do editor.
  const [functionInclusionRequests, setFunctionInclusionRequests] = useState<
    Array<{
      notificationId: string;
      requestNumber: string;
      prazoSeguranca: string;
      dataSolicitacao: string;
    }>
  >([]);
  const [functionInclusionDialogOpen, setFunctionInclusionDialogOpen] = useState(false);
  // Empresa a resolver após finalizar um PGR via PIPEFY_PUBLISH (anexo +
  // movimentação de fase) com inclusão de função pendente -- ver o aviso
  // em finalizeDocument, mais abaixo.
  const [
    functionInclusionFinalizedNoticeCompanyId,
    setFunctionInclusionFinalizedNoticeCompanyId,
  ] = useState<number | null>(null);

  const loadFunctionInclusionRequestsForCompany = useCallback(async () => {
    const companyId = state.cardMeta.companyId;
    if (companyId == null) return;
    try {
      const payload = await apiGet<{
        notifications: Array<{
          id?: string;
          source?: string;
          companyId?: number | null;
          requestNumber?: string | number | null;
          prazoSeguranca?: string | number | null;
          dataSolicitacao?: string | number | null;
        }>;
      }>("/api/v1/frontend/notifications/function-inclusion");
      const requests = (payload.notifications || [])
        .filter(
          (item) =>
            item.source === "function_inclusion_process" && item.companyId === companyId
        )
        .map((item) => ({
          notificationId: String(item.id || "").trim(),
          requestNumber: String(item.requestNumber ?? "").trim(),
          prazoSeguranca: String(item.prazoSeguranca ?? "").trim(),
          dataSolicitacao: String(item.dataSolicitacao ?? "").trim(),
        }))
        .filter((request) => request.notificationId);
      setFunctionInclusionRequests(requests);
    } catch {
      setFunctionInclusionRequests([]);
    }
  }, [state.cardMeta.companyId]);

  const handleOpenFunctionInclusionViewer = useCallback(async () => {
    await loadFunctionInclusionRequestsForCompany();
    setFunctionInclusionDialogOpen(true);
  }, [loadFunctionInclusionRequestsForCompany]);

  const { persistLatestStateNow, cancelPendingPersist, hasPendingPersist } = usePgrPersistence({
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
      setFunctionInclusionPending: setters.setFunctionInclusionPending,
      setFunctionInclusionElaboration: setters.setFunctionInclusionElaboration,
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
      functionInclusionElaboration: state.functionInclusionElaboration,
      isStateLoading: state.isStateLoading,
    },
    refs: {
      saveTimerRef: refs.saveTimerRef,
      lastCompletedSyncRef: refs.lastCompletedSyncRef,
    },
    getRuntimeCachedStateFn: getRuntimeCachedState,
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

  const handleAdvanceApiSync = useCallback(async (nextCompleted: number) => {
    if (state.functionInclusionElaboration.readOnly) return;
    try {
      const result = await putPgrState(params.id, {
        completedSteps: nextCompleted,
        meta: {
          pgrId: params.id,
          progressPercent: weightedProgressPercent,
        },
      });
      if (result === null) return;
      const cachedState = getRuntimeCachedState(params.id);
      if (cachedState) {
        setRuntimeCachedState(params.id, {
          ...cachedState,
          completedSteps: nextCompleted,
          progressPercent: weightedProgressPercent,
        });
      }
    } catch {
      // Sem bloqueio de navegação em caso de falha de rede.
      // Conflito (409) já é tratado pelo funil putPgrState.
    }
  }, [
    params.id,
    state.functionInclusionElaboration.readOnly,
    weightedProgressPercent,
  ]);

  const cycleTime = useCycleTimeTracker({
    pgrId: params.id,
    stepId: step.id,
    historicoData: state.historicoData,
    isStateLoading:
      state.isStateLoading || state.functionInclusionElaboration.readOnly,
    isLocked:
      state.workflow.isLocked || Boolean(state.workflow.finalization?.active),
  });

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
  retrySaveAfterConflictRef.current = () => {
    // Após um 409, o estado do servidor pode ter qualquer combinação de
    // campos da outra pessoa. Reenvia o snapshot completo local para cumprir
    // a escolha explícita de sobrescrever, sem calcular delta contra uma
    // baseline que deixou de ser válida.
    void putPgrState(params.id, buildStatePayload()).catch(() => {
      // O handler global mantém o aviso de alterações não salvas visível.
    });
  };

  const rejectionReasonFromQuery = useMemo(
    () => String(searchParams?.get("rejectionReason") || "").trim(),
    [searchParams]
  );

  const isFunctionInclusionEntry = useMemo(
    () => searchParams?.get("functionInclusion") === "1",
    [searchParams]
  );
  const isFunctionInclusionContext =
    isFunctionInclusionEntry || state.workflow.editContext === "function_inclusion";

  useEffect(() => {
    if (!isFunctionInclusionContext) return;
    setPreviousImport(null);
    setPreviousImportError(null);
    setPreviousPgrCheckNotice(null);
  }, [isFunctionInclusionContext]);

  const pendingReviewFocus = useMemo(
    () => parsePendingReviewFocus(searchParams),
    [searchParams]
  );

  const accessibleStepIds = useMemo(
    () =>
      pgrSteps
        .slice(0, Math.min(pgrSteps.length, state.completedSteps + 1))
        .map((step) => step.id),
    [state.completedSteps]
  );

  useEffect(() => {
    if (state.isStateLoading) return;
    if (state.functionInclusionElaboration.readOnly) return;
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
    state.functionInclusionElaboration.readOnly,
    state.isStateLoading,
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
        stepStatusById: derived.displayStepStatusById,
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
      derived.displayStepStatusById,
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
    const attempt = finalizationAttemptRef.current + 1;
    finalizationAttemptRef.current = attempt;
    const assertAttemptActive = () => {
      if (finalizationAttemptRef.current !== attempt) {
        throw new FinalizationCancelledError();
      }
    };
    setters.setIsFinalizingPgr(true);
    try {
      await persistStateNow();
      assertAttemptActive();

      const startedState = await apiPost<{
        workflow: PersistedPgrState["workflow"];
        finalizationMode: "LOCK_ONLY" | "PIPEFY_PUBLISH";
        updatedAt?: string;
      }>(`/api/v1/frontend/pgr/${params.id}/finalization/start`);
      setKnownUpdatedAt(params.id, startedState.updatedAt);
      cancelPendingPersist();
      setters.setWorkflow(startedState.workflow);
      assertAttemptActive();

      const finalizeDocument = async () => {
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
        if (
          (isFunctionInclusionContext || state.functionInclusionPending) &&
          state.cardMeta.companyId != null
        ) {
          // Duas situações legítimas disparam isto: (1) PGR já finalizado
          // antes, reaberto especificamente pra tratar uma inclusão de função
          // pendente (isFunctionInclusionContext, quando confiável), e (2) PGR
          // ainda em elaboração cuja empresa tem inclusão pendente — nesse
          // caso a própria tela já avisa que a inclusão "deve ser tratada
          // durante esta elaboração" (ver FunctionInclusionBanner), então
          // finalizar pela primeira vez também deve dar este aviso.
          // isFunctionInclusionContext só é confiável quando o usuário chegou
          // aqui via "Ver PGR desta empresa" (?functionInclusion=1) ou é um
          // delegado sem acesso global — um dono/admin finalizando direto,
          // sem passar por aquele fluxo, nunca setaria esse contexto. Por
          // isso o gatilho real é functionInclusionPending: reflete se a
          // empresa deste PGR tem inclusão de função pendente agora, o mesmo
          // sinal que já mostra o banner e o botão flutuante, independente
          // de como o usuário navegou até aqui.
          if (startedState.finalizationMode === "LOCK_ONLY") {
            // Reabertura pontual de um card já DONE, sem anexo/movimentação
            // no Pipefy — a solicitação já deveria estar concluída no Portal
            // de Serviços, então redireciona direto pro Home, que abre o
            // modal de resolução sozinho ao detectar o parâmetro.
            router.push(
              `/home?resolveFunctionInclusionCompanyId=${state.cardMeta.companyId}`
            );
          } else {
            // PIPEFY_PUBLISH: anexo e movimentação de fase ainda vão rolar no
            // Pipefy, e o Portal de Serviços provavelmente ainda não deu
            // baixa nessa solicitação — navegar sozinho pro Home aqui seria
            // prematuro. Só avisa; o técnico decide quando ir.
            setFunctionInclusionFinalizedNoticeCompanyId(state.cardMeta.companyId);
          }
        }
      };

      if (startedState.finalizationMode === "LOCK_ONLY") {
        await finalizeDocument();
        return;
      }

      const fileBase = buildPgrExportFileBase({
        companyName: state.inicioDraft.companyName,
        historico: state.historicoData,
        fallbackPgrId: params.id,
      });

      const [pdfStartResponse, xlsxJobId] = await Promise.all([
        startExternalExportJobWithResponse(
          params.id,
          "pdf",
          setters.setHeavyGenerationWaitMessage,
          () => finalizationAttemptRef.current !== attempt
        ),
        startExternalExportJob(
          params.id,
          "xlsx",
          undefined,
          () => finalizationAttemptRef.current !== attempt
        ),
      ]);
      const pdfJobId = extractJobId(pdfStartResponse);
      if (!pdfJobId) {
        throw new Error("API não retornou job_id para PDF.");
      }
      assertAttemptActive();

      await Promise.all([
        waitForExternalExportCompletion(
          params.id,
          "pdf",
          pdfJobId,
          () => finalizationAttemptRef.current !== attempt
        ),
        waitForExternalExportCompletion(
          params.id,
          "xlsx",
          xlsxJobId,
          () => finalizationAttemptRef.current !== attempt
        ),
      ]);
      assertAttemptActive();

      const [pdfBlob, xlsxBlob] = await Promise.all([
        downloadExternalExport(params.id, "pdf", pdfJobId),
        downloadExternalExport(params.id, "xlsx", xlsxJobId),
      ]);
      assertAttemptActive();

      const pipefyAttachJobId = await startPipefyAttachJob({
        pgrId: params.id,
        pdfBlob,
        xlsxBlob,
        pdfFilename: fileBase + ".pdf",
        xlsxFilename: fileBase + ".xlsx",
      });
      if (pipefyAttachJobId) {
        setters.setHeavyGenerationWaitMessage(PIPEFY_ATTACH_WAIT_MESSAGE);
        try {
          await waitForPipefyAttachJobCompletion(
            params.id,
            pipefyAttachJobId,
            () => finalizationAttemptRef.current !== attempt
          );
        } finally {
          setters.setHeavyGenerationWaitMessage(null);
        }
        assertAttemptActive();
      }

      await finalizeDocument();
    } catch (error) {
      if (error instanceof FinalizationCancelledError) return;
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar o PGR agora.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      if (finalizationAttemptRef.current === attempt) {
        setters.setIsFinalizingPgr(false);
      }
    }
  }, [
    persistStateNow,
    cancelPendingPersist,
    params.id,
    setters,
    state.historicoData,
    state.inicioDraft,
    state.cardMeta.companyId,
    state.functionInclusionPending,
    isFunctionInclusionContext,
    router,
  ]);

  const handleCancelFinalization = useCallback(async () => {
    finalizationAttemptRef.current += 1;
    setIsCancellingFinalization(true);
    setters.setHeavyGenerationWaitMessage(null);
    try {
      const restoredState = await apiPost<{
        workflow: PersistedPgrState["workflow"];
        updatedAt?: string;
      }>(`/api/v1/frontend/pgr/${params.id}/finalization/cancel`);
      setKnownUpdatedAt(params.id, restoredState.updatedAt);
      setters.setWorkflow(restoredState.workflow);
      setters.setIsFinalizingPgr(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar a finalização agora.";
      if (typeof window !== "undefined") window.alert(message);
    } finally {
      setIsCancellingFinalization(false);
    }
  }, [params.id, setters]);

  const handleGenerateFakePdf = useCallback(async () => {
    setters.setIsGeneratingFakePdf(true);
    try {
      // A versão finalizada já está persistida e não pode ser salva novamente.
      // Tentar persistir aqui recebe 409 e impede o download dos artefatos.
      if (!state.workflow.isLocked) {
        await persistStateNow();
      }
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
    state.workflow.isLocked,
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

  const createNewVersion = useCallback(async (rejectionReason?: string) => {
    try {
      const updatedState = await apiPost<{
        updatedAt?: string;
      }>(`/api/v1/frontend/pgr/${params.id}/new-version`, {
        rejectionReason: String(rejectionReason || "").trim() || undefined,
        editContext: isFunctionInclusionEntry
          ? "function_inclusion"
          : undefined,
      });

      setKnownUpdatedAt(params.id, updatedState.updatedAt);
      cancelPendingPersist();
      window.location.assign(
        "/pgr/" +
          params.id +
          "/inicio" +
          (isFunctionInclusionEntry ? "?functionInclusion=1" : "")
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar uma nova versão agora.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    }
  }, [cancelPendingPersist, isFunctionInclusionEntry, params.id]);

  const handleImportPrevious = useCallback(async () => {
    if (isFunctionInclusionContext || !previousImport || isImportingPrevious) return;
    setIsImportingPrevious(true);
    setPreviousImportError(null);
    try {
      // Não deixar um autosave em voo brigar com o import server-side.
      cancelPendingPersist();
      await apiPost(`/api/v1/frontend/pgr/${params.id}/import-previous`, {
        sourcePgrId: previousImport.sourcePgrId,
      });
      window.location.assign(`/pgr/${params.id}/inicio`);
    } catch (error) {
      setIsImportingPrevious(false);
      setPreviousImportError(
        error instanceof ApiError && error.message
          ? error.message
          : "Não foi possível importar os dados agora. Tente novamente."
      );
    }
  }, [
    cancelPendingPersist,
    isFunctionInclusionContext,
    isImportingPrevious,
    params.id,
    previousImport,
  ]);

  const handleCheckPreviousPgr = useCallback(async () => {
    if (isFunctionInclusionContext || isCheckingPreviousPgr) return;
    setIsCheckingPreviousPgr(true);
    setPreviousPgrCheckNotice(null);
    try {
      const previous = await apiGet<PreviousPgrResponse>(
        `/api/v1/frontend/pgr/${params.id}/previous-pgr`
      );
      if (previous?.available && previous.sourcePgrId) {
        setPreviousImport({
          sourcePgrId: previous.sourcePgrId,
          companyName: String(previous.companyName || "").trim(),
          finalizedAt: formatIsoDateToBr(previous.finalizedAt),
          attachmentsCount: Math.max(0, Number(previous.attachmentsCount) || 0),
        });
      } else {
        setPreviousPgrCheckNotice(describePreviousPgrUnavailableReason(previous));
      }
    } catch (error) {
      setPreviousPgrCheckNotice(
        error instanceof ApiError && error.message
          ? error.message
          : "Não foi possível verificar agora. Tente novamente."
      );
    } finally {
      setIsCheckingPreviousPgr(false);
    }
  }, [isCheckingPreviousPgr, isFunctionInclusionContext, params.id]);

  const handleStartNewVersion = useCallback(
    () => createNewVersion(),
    [createNewVersion]
  );

  const handleEditCurrentVersion = useCallback(
    (reason: string) => {
      void createNewVersion(reason);
    },
    [createNewVersion]
  );

  // Reabre a versão finalizada atual para correção pontual, SEM incrementar
  // workflow.version nem criar uma nova linha no histórico (ao contrário de
  // createNewVersion/handleStartNewVersion). Só se aplica a documentos
  // finalizados sem rejeição pendente — o backend rejeita com 409 se o
  // documento estiver rejeitado, que segue o fluxo dedicado que bumpa a
  // versão (handleEditCurrentVersion acima).
  const handleEditCurrentFinalizedVersion = useCallback(async () => {
    try {
      const updatedState = await apiPost<{ updatedAt?: string }>(
        "/api/v1/frontend/pgr/" +
          params.id +
          "/edit-current-version" +
          (isFunctionInclusionEntry ? "?editContext=function_inclusion" : "")
      );
      setKnownUpdatedAt(params.id, updatedState.updatedAt);
      cancelPendingPersist();
      window.location.assign(`/pgr/${params.id}/inicio`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível destravar a versão atual agora.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    }
  }, [cancelPendingPersist, isFunctionInclusionEntry, params.id]);

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

  // Endpoint dedicado (não o autosave genérico): o quadro de Histórico
  // continua acessível com o documento travado (isLocked), estado em que o
  // autosave é desligado e o PUT genérico de state seria rejeitado com 409
  // — sem essa rota, a exclusão só existia em memória e voltava ao trocar
  // de etapa.
  const handleHistoricoDeleteRow = useCallback(
    async (changeId: string) => {
      try {
        const updatedState = await apiPost<{
          historico: HistoricoData;
          updatedAt?: string;
        }>(`/api/v1/frontend/pgr/${params.id}/historico/delete-row`, {
          changeId,
        });
        setKnownUpdatedAt(params.id, updatedState.updatedAt);
        setters.setHistoricoData(updatedState.historico);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível excluir essa linha do histórico agora.";
        if (typeof window !== "undefined") {
          window.alert(message);
        }
      }
    },
    [params.id, setters]
  );

  // Também dedicado (não autosave genérico): permite somar um registro de
  // alteração já finalizado enquanto o documento está destravado/em edição,
  // sem depender de "Editar nova versão" (que só reabre um documento já
  // travado) — cobre o caso de duas demandas externas com datas de
  // solicitação distintas na mesma sessão de edição.
  const handleAddHistoricoRow = useCallback(async () => {
    try {
      const updatedState = await apiPost<{
        historico: HistoricoData;
        updatedAt?: string;
      }>(`/api/v1/frontend/pgr/${params.id}/historico/add-row`, {});
      setKnownUpdatedAt(params.id, updatedState.updatedAt);
      setters.setHistoricoData(updatedState.historico);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar um novo registro de alteração agora.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    }
  }, [params.id, setters]);

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
    // Este dado só é exibido no step Início. O controller é compartilhado por
    // todas as rotas do wizard, então sem este guard cada troca de etapa fazia
    // uma consulta redundante ao Card e às notificações da empresa.
    if (step.id !== "inicio") {
      setLastFunctionInclusion(null);
      return;
    }
    let active = true;
    apiGet<{
      found: boolean;
      funcao?: string;
      resolvedBy?: string;
      resolvedAt?: string;
    }>(`/api/v1/frontend/pgr/${params.id}/function-inclusion/last-resolved`)
      .then((result) => {
        if (!active) return;
        setLastFunctionInclusion(
          result.found
            ? {
                funcao: result.funcao || "",
                resolvedBy: result.resolvedBy || "",
                resolvedAt: result.resolvedAt || "",
              }
            : null
        );
      })
      .catch(() => {
        if (active) setLastFunctionInclusion(null);
      });
    return () => {
      active = false;
    };
  }, [params.id, step.id]);

  useEffect(() => {
    if (state.isStateLoading) return;
    if (state.functionInclusionElaboration.readOnly) return;
    // "revisao" não conta como unidade de completedSteps (ver progress.ts):
    // é um gate pós-100%, não um passo do progresso — por isso fica de fora
    // da contagem contígua aqui.
    const orderedSteps = pgrSteps
      .map((item) => item.id)
      .filter((stepId) => stepId !== "revisao");
    let contiguousDone = 0;
    for (const stepId of orderedSteps) {
      if (!derived.stepStatusById[stepId]) break;
      contiguousDone += 1;
    }
    if (contiguousDone > state.completedSteps) {
      setters.setCompletedSteps(contiguousDone);
      void handleAdvanceApiSync(contiguousDone);
    }
  }, [
    derived.stepStatusById,
    handleAdvanceApiSync,
    setters,
    state.completedSteps,
    state.functionInclusionElaboration.readOnly,
    state.isStateLoading,
  ]);

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
      setPlanActionPriority: setters.setPlanActionPriority,
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
      planActionPriority: state.planActionPriority,
      editingMedidasValue: state.editingMedidasValue,
      completedSteps: state.completedSteps,
      currentIndex,
      nextStep,
      navigateToStep,
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
  const hasRequiredInitialSyncFields =
    Boolean(String(state.inicioDraft.companyName || "").trim()) &&
    Boolean(String(state.inicioDraft.cnpj || "").trim()) &&
    Boolean(String(state.inicioDraft.responsible || "").trim());

  useEffect(() => {
    if (isFunctionInclusionContext) return;
    if (state.functionInclusionElaboration.readOnly) return;
    if (state.isStateLoading) return;
    if (state.isPipefySyncing) return;
    if (state.inicioDraft.syncedAt && hasRequiredInitialSyncFields) return;
    if (autoPipefySyncCardRef.current === params.id) return;

    autoPipefySyncCardRef.current = params.id;
    void generalActions
      .handleLoadPipefyMock()
      .then(async () => {
        // Card novo recém-sincronizado: o servidor decide se existe um PGR
        // anterior finalizado da mesma empresa disponível para importação.
        const previous = await apiGet<PreviousPgrResponse>(
          `/api/v1/frontend/pgr/${params.id}/previous-pgr`
        );
        if (previous?.available && previous.sourcePgrId) {
          setPreviousImport({
            sourcePgrId: previous.sourcePgrId,
            companyName: String(previous.companyName || "").trim(),
            finalizedAt: formatIsoDateToBr(previous.finalizedAt),
            attachmentsCount: Math.max(0, Number(previous.attachmentsCount) || 0),
          });
        } else if (previous?.reason === "previous_not_finalized") {
          setPreviousPgrCheckNotice(describePreviousPgrUnavailableReason(previous));
        }
      })
      .catch(() => {
        // Mantém silencioso: usuário pode continuar preenchendo manualmente.
      });
  }, [
    generalActions,
    hasRequiredInitialSyncFields,
    isFunctionInclusionContext,
    params.id,
    state.functionInclusionElaboration.readOnly,
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
    saveError,
    saveStatus: {
      isReady: !state.isStateLoading,
      isSaving: hasPendingPersist || isSaveQueueActive,
      hasUnsavedChanges:
        hasPendingPersist || isSaveQueueActive || saveError || saveConflict,
    },
    previousImportDialog: {
      open: previousImport !== null && !isFunctionInclusionContext,
      companyName: previousImport?.companyName ?? "",
      finalizedAt: previousImport?.finalizedAt ?? "",
      attachmentsCount: previousImport?.attachmentsCount ?? 0,
      importing: isImportingPrevious,
      error: previousImportError,
      onImport: () => {
        void handleImportPrevious();
      },
    },
    finalizationLock: {
      active: Boolean(state.workflow.finalization?.active),
      startedAt: state.workflow.finalization?.startedAt ?? null,
      startedBy: state.workflow.finalization?.startedBy ?? null,
      isCancelling: isCancellingFinalization,
      onCancel: handleCancelFinalization,
    },
    functionInclusionRequestsDialog: {
      open: functionInclusionDialogOpen,
      mode: "view" as const,
      companyLabel: state.inicioDraft.companyName || "",
      requests: functionInclusionRequests,
      onClose: () => setFunctionInclusionDialogOpen(false),
    },
    functionInclusionFinalizedNotice: {
      open: functionInclusionFinalizedNoticeCompanyId != null,
      onClose: () => setFunctionInclusionFinalizedNoticeCompanyId(null),
      onGoToHome: () => {
        const companyId = functionInclusionFinalizedNoticeCompanyId;
        setFunctionInclusionFinalizedNoticeCompanyId(null);
        if (companyId != null) {
          router.push(`/home?resolveFunctionInclusionCompanyId=${companyId}`);
        }
      },
    },
    functionInclusionPendingButton: {
      visible: Boolean(state.functionInclusionPending),
      onOpen: () => void handleOpenFunctionInclusionViewer(),
    },
    shellProps: {
      pgrId: params.id,
      currentStep: step.id as PgrStepId,
      completedSteps: state.completedSteps,
      progressPercent: state.progressPercent,
      alertSteps: derived.alertSteps,
      stepStatusById: derived.displayStepStatusById,
      accessibleStepIds,
      onNavigateStep: (stepId: PgrStepId) =>
        navigateToStep(stepId),
      cycleTimeMs: cycleTime.cycleTotalMs,
      cycleSessionStartedAtMs: cycleTime.activeSessionStartedAtMs,
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
      setGheGroups: setters.setGheGroups,
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
      functionInclusionPending: state.functionInclusionPending,
      functionInclusionElaboration: state.functionInclusionElaboration,
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
      planActionPriority: state.planActionPriority,
      setPlanActionPriority: setters.setPlanActionPriority,
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
      stepStatusById: derived.displayStepStatusById,
      isAnexosEmpty: derived.isAnexosEmpty,
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
      handleEditCurrentFinalizedVersion,
      handleHistoricoChangeField,
      handleHistoricoDeleteRow,
      handleAddHistoricoRow,
      handleResetInicioData,
      handleResetDadosData,
      handleResetDescricaoData,
      handleResetCaracterizacaoData,
      handleResetPlanoData,
      generalActions,
      handleSyncPipefy,
      handleCheckPreviousPgr,
      canImportPreviousPgr: !isFunctionInclusionContext,
      isCheckingPreviousPgr,
      previousPgrCheckNotice,
      lastFunctionInclusion,
      descricaoInteractions,
    },
    footerProps: {
      stepId: step.id,
      prevStepId: prevStep?.id ?? null,
      nextStepId: nextStep?.id ?? null,
      workflowIsLocked: state.workflow.isLocked,
      onNavigateStep: navigateToStep,
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
