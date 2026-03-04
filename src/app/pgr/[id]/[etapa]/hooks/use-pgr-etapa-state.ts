import { useCallback, useRef, useState } from "react";
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
import type { AnexoItem, GheGroup, PgrFunction, RiskCatalogPayload, RiskGheGroup } from "../types";
import { getRuntimeCachedState } from "../state/runtime-cache";

export type HistoryEntry = {
  gheGroups: GheGroup[];
  currentGheId: string;
  selectedLeftIds: string[];
  selectedRightIds: string[];
  riskGheGroups: RiskGheGroup[];
  currentRiskGheId: string;
};

export function usePgrEtapaState({
  paramsId,
  currentIndex,
}: {
  paramsId: string;
  currentIndex: number;
}) {
  const initialCachedState = getRuntimeCachedState(paramsId);
  const serverSyncedCachedState =
    initialCachedState?.serverSynced === true ? initialCachedState : null;
  const cacheAgeMs =
    typeof serverSyncedCachedState?.syncedAt === "number"
      ? Date.now() - serverSyncedCachedState.syncedAt
      : Number.POSITIVE_INFINITY;
  const shouldHydrateFromApi = !serverSyncedCachedState || cacheAgeMs > 120000;

  const [completedSteps, setCompletedSteps] = useState(
    serverSyncedCachedState?.completedSteps ?? currentIndex
  );
  const [inicioDraft, setInicioDraft] = useState<InicioDraft>(
    serverSyncedCachedState?.inicioDraft ?? initialInicioDraft
  );
  const [dadosCadastrais, setDadosCadastrais] = useState<DadosCadastraisDraft>(
    serverSyncedCachedState?.dadosCadastrais ?? initialDadosCadastrais
  );
  const [cardMeta, setCardMeta] = useState(
    serverSyncedCachedState?.cardMeta ?? {
      pipefyCardId: "",
      cardName: "",
      dueDate: "",
      companyId: null as number | null,
      responsibleId: null as number | null,
    }
  );
  const [historicoData, setHistoricoData] = useState(
    serverSyncedCachedState?.historicoData ?? defaultHistorico
  );
  const [functionsData, setFunctionsData] = useState<PgrFunction[]>(
    serverSyncedCachedState?.functionsData ?? defaultFunctions
  );
  const [isStateLoading, setIsStateLoading] = useState(shouldHydrateFromApi);

  const saveTimerRef = useRef<number | null>(null);
  const lastCompletedSyncRef = useRef<number | null>(null);
  const importExcelInputRef = useRef<HTMLInputElement | null>(null);
  const lastCepLookupRef = useRef<{ empresa: string; contratante: string }>({
    empresa: "",
    contratante: "",
  });

  const [isPipefySyncing, setIsPipefySyncing] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [riskCatalogs, setRiskCatalogs] = useState<RiskCatalogPayload | null>(null);
  const [excelImportFeedback, setExcelImportFeedback] = useState<null | {
    type: "success" | "error";
    message: string;
  }>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isGeneratingFakePdf, setIsGeneratingFakePdf] = useState(false);
  const [lastFakePdfAt, setLastFakePdfAt] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState(
    serverSyncedCachedState?.estabelecimentoSelecionado ?? ""
  );
  const [extraEstabelecimentoFields, setExtraEstabelecimentoFields] = useState<
    Array<{
      id: string;
      title: string;
      value: string;
      scope: "empresa" | "estabelecimento" | "contratante";
    }>
  >(serverSyncedCachedState?.extraEstabelecimentoFields ?? []);
  const [planAction, setPlanAction] = useState({
    nr: serverSyncedCachedState?.planAction.nr ?? "NR-01",
    vigencia: serverSyncedCachedState?.planAction.vigencia ?? "",
  });
  const [isPlanActionModalOpen, setIsPlanActionModalOpen] = useState(false);
  const [planActionScope, setPlanActionScope] = useState<"all" | "ghe" | "risk">("risk");
  const [planActionGheId, setPlanActionGheId] = useState("");
  const [planActionRiskId, setPlanActionRiskId] = useState("");
  const [planActionDescription, setPlanActionDescription] = useState("");
  const [editingMedidasId, setEditingMedidasId] = useState<string | null>(null);
  const [editingMedidasValue, setEditingMedidasValue] = useState("");
  const [planTablePage, setPlanTablePage] = useState(1);
  const planTablePageSize = 8;
  const [anexos, setAnexos] = useState<AnexoItem[]>(
    serverSyncedCachedState?.anexos ?? defaultAnexos
  );
  const [anexoDiretriz, setAnexoDiretriz] = useState(
    serverSyncedCachedState?.anexoDiretriz ?? "Diretriz 1"
  );
  const [draggedAnexoId, setDraggedAnexoId] = useState<string | null>(null);
  const [dragOverAnexoId, setDragOverAnexoId] = useState<string | null>(null);
  const [selectedLeftIds, setSelectedLeftIds] = useState<string[]>([]);
  const [selectedRightIds, setSelectedRightIds] = useState<string[]>([]);
  const [gheGroups, setGheGroups] = useState<GheGroup[]>(
    serverSyncedCachedState?.gheGroups ?? defaultGheGroups
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentGheId, setCurrentGheId] = useState(
    serverSyncedCachedState?.currentGheId ?? "ghe-1"
  );
  const [isGheModalOpen, setIsGheModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalError, setInfoModalError] = useState<string>("");
  const [infoModalMode, setInfoModalMode] = useState<"next" | "next-existing" | "advance">(
    "next"
  );
  const [gheSearch, setGheSearch] = useState("");
  const [gheFilterId, setGheFilterId] = useState<"all" | string>("all");
  const [isGheListView, setIsGheListView] = useState(false);
  const [riskGheGroups, setRiskGheGroups] = useState<RiskGheGroup[]>(
    serverSyncedCachedState?.riskGheGroups ?? defaultRiskGheGroups
  );
  const [currentRiskGheId, setCurrentRiskGheId] = useState(
    serverSyncedCachedState?.currentRiskGheId ?? "ghe-1"
  );
  const [lastGheNotice, setLastGheNotice] = useState<null | { from: string; to: string }>(
    null
  );

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
      lastFakePdfAt,
      searchTerm,
      estabelecimentoSelecionado,
      extraEstabelecimentoFields,
      planAction,
      isPlanActionModalOpen,
      planActionScope,
      planActionGheId,
      planActionRiskId,
      planActionDescription,
      editingMedidasId,
      editingMedidasValue,
      planTablePage,
      planTablePageSize,
      anexos,
      anexoDiretriz,
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
      lastGheNotice,
    },
    setters: {
      setCompletedSteps,
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
      setLastFakePdfAt,
      setSearchTerm,
      setEstabelecimentoSelecionado,
      setExtraEstabelecimentoFields,
      setPlanAction,
      setIsPlanActionModalOpen,
      setPlanActionScope,
      setPlanActionGheId,
      setPlanActionRiskId,
      setPlanActionDescription,
      setEditingMedidasId,
      setEditingMedidasValue,
      setPlanTablePage,
      setAnexos,
      setAnexoDiretriz,
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
