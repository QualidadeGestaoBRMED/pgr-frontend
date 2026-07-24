import { useCallback, useEffect, useRef, useState } from "react";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import {
  defaultAnexos,
  defaultFunctions,
  defaultGheGroups,
  defaultHistorico,
  defaultRiskGheGroups,
  initialDadosCadastrais,
  initialInicioDraft,
} from "../defaults";
import { calculatePlanActionVigencia } from "../utils/vigencia";
import type {
  AnexoItem,
  ExcelImportFeedback,
  GheGroup,
  HistoryEntry,
  PgrDocxTemplateOption,
  PlanGeneralMeasureRow,
  PgrFunction,
  RiskCatalogPayload,
  RiskGheGroup,
} from "../types";
import type { PersistedPgrState } from "../state/runtime-cache";
import { syncLegacyContractorFields } from "../utils/contractors";
import { syncLegacyEstablishmentFields } from "../utils/establishments";
import {
  DEFAULT_PDF_LAYOUT_STATE,
  normalizePdfLayoutState,
} from "@/lib/pgr-pdf-runtime/layout";

export function usePgrEtapaState({
  paramsId,
  currentIndex,
}: {
  paramsId: string;
  currentIndex: number;
}) {
  type Workflow = PersistedPgrState["workflow"];
  const [shouldHydrateFromApi, setShouldHydrateFromApi] = useState<boolean | null>(null);

  const [completedSteps, setCompletedSteps] = useState(currentIndex);
  const [progressPercent, setProgressPercent] = useState(
    Math.round((Math.max(0, currentIndex) / 7) * 100)
  );
  const [inicioDraft, setInicioDraft] = useState<InicioDraft>(initialInicioDraft);
  const [dadosCadastrais, setDadosCadastrais] = useState<DadosCadastraisDraft>(
    syncLegacyContractorFields(
      syncLegacyEstablishmentFields(initialDadosCadastrais, "")
    )
  );
  const [cardMeta, setCardMeta] = useState(
    {
      pipefyCardId: "",
      cardName: "",
      dueDate: "",
      companyId: null as number | null,
      responsibleId: null as number | null,
    }
  );
  const [historicoData, setHistoricoData] = useState(defaultHistorico);
  const [functionsData, setFunctionsData] = useState<PgrFunction[]>(defaultFunctions);
  const [isStateLoading, setIsStateLoading] = useState(true);

  const saveTimerRef = useRef<number | null>(null);
  const lastCompletedSyncRef = useRef<number | null>(null);
  const importExcelInputRef = useRef<HTMLInputElement | null>(null);
  const lastCepLookupRef = useRef<{
    empresa: string;
    estabelecimentoByIndex: Record<string, string>;
    contratanteByIndex: Record<string, string>;
  }>({
    empresa: "",
    estabelecimentoByIndex: {},
    contratanteByIndex: {},
  });

  const [isPipefySyncing, setIsPipefySyncing] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [riskCatalogs, setRiskCatalogs] = useState<RiskCatalogPayload | null>(null);
  const [excelImportFeedback, setExcelImportFeedback] = useState<null | ExcelImportFeedback>(
    null
  );
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isGeneratingFakePdf, setIsGeneratingFakePdf] = useState(false);
  const [isFinalizingPgr, setIsFinalizingPgr] = useState(false);
  // Preenchido enquanto o backend recusa iniciar a geracao porque ja existe
  // outro documento com anexos grandes sendo processado (HEAVY_GENERATION_IN_PROGRESS).
  const [heavyGenerationWaitMessage, setHeavyGenerationWaitMessage] = useState<string | null>(
    null
  );
  const [lastFakePdfAt, setLastFakePdfAt] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState("");
  const [extraEstabelecimentoFields, setExtraEstabelecimentoFields] = useState<
    Array<{
      id: string;
      title: string;
      value: string;
      scope: "empresa" | "estabelecimento" | "contratante" | "quantitativo";
    }>
  >([]);
  const [planAction, setPlanAction] = useState({
    nr: "NR-01",
    vigencia: calculatePlanActionVigencia([]),
  });
  const [removedPlanRiskKeys, setRemovedPlanRiskKeys] = useState<string[]>([]);
  const [planGeneralMeasures, setPlanGeneralMeasures] = useState<PlanGeneralMeasureRow[]>([]);
  const [isPlanActionModalOpen, setIsPlanActionModalOpen] = useState(false);
  const [planActionScope, setPlanActionScope] = useState<"all" | "ghe" | "risk">("risk");
  const [planActionGheId, setPlanActionGheId] = useState("");
  const [planActionRiskId, setPlanActionRiskId] = useState("");
  const [planActionDescription, setPlanActionDescription] = useState("");
  const [persistedOptionsByRowId, setPersistedOptionsByRowId] = useState<Record<string, string[]>>(
    {}
  );
  const [editingMedidasId, setEditingMedidasId] = useState<string | null>(null);
  const [editingMedidasValue, setEditingMedidasValue] = useState("");
  const [planTablePage, setPlanTablePage] = useState(1);
  const planTablePageSize = 8;
  const [anexos, setAnexos] = useState<AnexoItem[]>(defaultAnexos);
  const [anexoDiretriz, setAnexoDiretriz] = useState("Padrão da NR-01");
  const [anexoDiretrizTemplateId, setAnexoDiretrizTemplateId] = useState<number | null>(null);
  const [pgrDocxTemplates, setPgrDocxTemplates] = useState<PgrDocxTemplateOption[]>([]);
  const [draggedAnexoId, setDraggedAnexoId] = useState<string | null>(null);
  const [dragOverAnexoId, setDragOverAnexoId] = useState<string | null>(null);
  const [selectedLeftIds, setSelectedLeftIds] = useState<string[]>([]);
  const [selectedRightIds, setSelectedRightIds] = useState<string[]>([]);
  const [gheGroups, setGheGroups] = useState<GheGroup[]>(defaultGheGroups);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentGheId, setCurrentGheId] = useState("ghe-1");
  const [isGheModalOpen, setIsGheModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalError, setInfoModalError] = useState<string>("");
  const [infoModalMode, setInfoModalMode] = useState<"next" | "next-existing" | "advance">(
    "next"
  );
  const [gheSearch, setGheSearch] = useState("");
  const [gheFilterId, setGheFilterId] = useState<"all" | string>("all");
  const [isGheListView, setIsGheListView] = useState(false);
  const [riskGheGroups, setRiskGheGroups] = useState<RiskGheGroup[]>(defaultRiskGheGroups);
  const [currentRiskGheId, setCurrentRiskGheId] = useState("ghe-1");
  const [workflow, setWorkflow] = useState<Workflow>(
    {
      isLocked: false,
      version: 1,
      statusLabel: null as string | null,
      rejectionReason: null as string | null,
      wasRejected: false,
      rejectionSourcePhaseId: null as string | null,
      editContext: null as "function_inclusion" | null,
      finalization: {
        active: false,
        startedAt: null as string | null,
        startedBy: null as string | null,
        startedById: null as number | null,
      },
      finalizedAt: null as string | null,
      finalizedBy: null as string | null,
      finalizedById: null as number | null,
      currentVersionEditHistory: [],
    }
  );
  const [pdfLayout, setPdfLayout] = useState(() =>
    normalizePdfLayoutState(DEFAULT_PDF_LAYOUT_STATE)
  );
  const [lastGheNotice, setLastGheNotice] = useState<null | { from: string; to: string }>(
    null
  );

  useEffect(() => {
    setShouldHydrateFromApi(true);
  }, [paramsId]);

  const cloneGheGroups = (value: GheGroup[]) => JSON.parse(JSON.stringify(value)) as GheGroup[];
  const cloneRiskGheGroups = (value: RiskGheGroup[]) =>
    JSON.parse(JSON.stringify(value)) as RiskGheGroup[];

  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const entry: HistoryEntry = {
        gheGroups: cloneGheGroups(gheGroups),
        currentGheId,
        selectedLeftIds: [...selectedLeftIds],
        selectedRightIds: [...selectedRightIds],
        riskGheGroups: cloneRiskGheGroups(riskGheGroups),
        currentRiskGheId,
      };
      const next = [...prev, entry];
      return next.length > 30 ? next.slice(next.length - 30) : next;
    });
  }, [
    currentGheId,
    currentRiskGheId,
    gheGroups,
    riskGheGroups,
    selectedLeftIds,
    selectedRightIds,
  ]);

  const inputBaseClass =
    "mt-2 h-[40px] w-full rounded-[8px] border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const inputInlineClass =
    "h-[40px] w-full rounded-[8px] border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const textareaBaseClass =
    "mt-2 min-h-[96px] w-full rounded-[10px] border border-border bg-muted px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const miniInputClass =
    "h-8 w-20 rounded-[8px] border border-border bg-muted px-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const selectBaseClass =
    "h-[40px] w-full appearance-none rounded-[8px] border border-border bg-muted px-3 pr-10 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const selectSmallClass =
    "h-[38px] w-full appearance-none rounded-[8px] border border-border bg-muted px-3 pr-8 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return {
    shouldHydrateFromApi,
    state: {
      completedSteps,
      progressPercent,
      inicioDraft,
      dadosCadastrais,
      cardMeta,
      historicoData,
      functionsData,
      isStateLoading,
      isPipefySyncing,
      isImportingExcel,
      riskCatalogs,
      excelImportFeedback,
      isPreviewModalOpen,
      isGeneratingFakePdf,
      isFinalizingPgr,
      heavyGenerationWaitMessage,
      lastFakePdfAt,
      searchTerm,
      estabelecimentoSelecionado,
      extraEstabelecimentoFields,
      planAction,
      removedPlanRiskKeys,
      planGeneralMeasures,
      isPlanActionModalOpen,
      planActionScope,
      planActionGheId,
      planActionRiskId,
      planActionDescription,
      persistedOptionsByRowId,
      editingMedidasId,
      editingMedidasValue,
      planTablePage,
      planTablePageSize,
      anexos,
      anexoDiretriz,
      anexoDiretrizTemplateId,
      pgrDocxTemplates,
      draggedAnexoId,
      dragOverAnexoId,
      selectedLeftIds,
      selectedRightIds,
      gheGroups,
      history,
      currentGheId,
      isGheModalOpen,
      isInfoModalOpen,
      infoModalError,
      infoModalMode,
      gheSearch,
      gheFilterId,
      isGheListView,
      riskGheGroups,
      currentRiskGheId,
      workflow,
      pdfLayout,
      lastGheNotice,
    },
    setters: {
      setCompletedSteps,
      setProgressPercent,
      setInicioDraft,
      setDadosCadastrais,
      setCardMeta,
      setHistoricoData,
      setFunctionsData,
      setIsStateLoading,
      setIsPipefySyncing,
      setIsImportingExcel,
      setRiskCatalogs,
      setExcelImportFeedback,
      setIsPreviewModalOpen,
      setIsGeneratingFakePdf,
      setIsFinalizingPgr,
      setHeavyGenerationWaitMessage,
      setLastFakePdfAt,
      setSearchTerm,
      setEstabelecimentoSelecionado,
      setExtraEstabelecimentoFields,
      setPlanAction,
      setRemovedPlanRiskKeys,
      setPlanGeneralMeasures,
      setIsPlanActionModalOpen,
      setPlanActionScope,
      setPlanActionGheId,
      setPlanActionRiskId,
      setPlanActionDescription,
      setPersistedOptionsByRowId,
      setEditingMedidasId,
      setEditingMedidasValue,
      setPlanTablePage,
      setAnexos,
      setAnexoDiretriz,
      setAnexoDiretrizTemplateId,
      setPgrDocxTemplates,
      setDraggedAnexoId,
      setDragOverAnexoId,
      setSelectedLeftIds,
      setSelectedRightIds,
      setGheGroups,
      setHistory,
      setCurrentGheId,
      setIsGheModalOpen,
      setIsInfoModalOpen,
      setInfoModalError,
      setInfoModalMode,
      setGheSearch,
      setGheFilterId,
      setIsGheListView,
      setRiskGheGroups,
      setCurrentRiskGheId,
      setWorkflow,
      setPdfLayout,
      setLastGheNotice,
    },
    refs: {
      saveTimerRef,
      lastCompletedSyncRef,
      importExcelInputRef,
      lastCepLookupRef,
    },
    actions: {
      pushHistory,
    },
    ui: {
      inputBaseClass,
      inputInlineClass,
      textareaBaseClass,
      miniInputClass,
      selectBaseClass,
      selectSmallClass,
    },
  };
}
