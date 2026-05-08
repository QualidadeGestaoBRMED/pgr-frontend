import { useCallback, useEffect, useMemo } from "react";
import { useRouter, notFound } from "next/navigation";
import { apiBlob, apiGet, apiPost, apiPut } from "@/lib/api";
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
import { slugify, truncatePreview } from "../utils/text";
import { buildPgrDocxPayload, buildPgrDocxPayloadFromBackendState } from "../utils/docx-payload";
import { computeWeightedProgressPercent } from "../utils/progress";
import { createGeneralActions } from "./create-general-actions";
import { useDescricaoInteractions } from "./use-descricao-interactions";
import { useHistoryUndo } from "./use-history-undo";
import { usePgrPersistence } from "./use-pgr-persistence";
import { areStringArraysEqual } from "./use-risk-catalog-helpers";
import { usePgrEtapaState } from "./use-pgr-etapa-state";
import { usePgrEtapaDerived } from "./use-pgr-etapa-derived";
import { useCycleTimeTracker } from "./use-cycle-time-tracker";
import { setRuntimeCachedState } from "../state/runtime-cache";
import { DEFAULT_PDF_LAYOUT_STATE, type PdfLayoutState } from "@/lib/pgr-pdf-runtime/layout";

export function usePgrEtapaController({
  params,
}: {
  params: { id: string; etapa: string };
}) {
  const router = useRouter();
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
    removedPlanRiskKeys: state.removedPlanRiskKeys,
    planActionGheId: state.planActionGheId,
    planTablePage: state.planTablePage,
    planTablePageSize: state.planTablePageSize,
    inicioDraft: state.inicioDraft,
    dadosCadastrais: state.dadosCadastrais,
    historicoData: state.historicoData,
    anexos: state.anexos,
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

  usePgrPersistence({
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
      setRemovedPlanRiskKeys: setters.setRemovedPlanRiskKeys,
      setAnexos: setters.setAnexos,
      setAnexoDiretriz: setters.setAnexoDiretriz,
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
      removedPlanRiskKeys: state.removedPlanRiskKeys,
      anexos: state.anexos,
      anexoDiretriz: state.anexoDiretriz,
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

  const cycleTime = useCycleTimeTracker({
    pgrId: params.id,
    stepId: step.id,
    historicoData: state.historicoData,
    isStateLoading: state.isStateLoading,
    setHistoricoData: setters.setHistoricoData,
  });

  const handleAdvanceApiSync = useCallback((nextCompleted: number) => {
    void apiPut(`/api/v1/frontend/pgr/${params.id}/state`, {
      completedSteps: nextCompleted,
      meta: {
        pgrId: params.id,
        progressPercent: weightedProgressPercent,
      },
    }).catch(() => {
      // Sem bloqueio de navegação em caso de falha de rede.
    });
  }, [params.id, weightedProgressPercent]);

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
        removedPlanRiskKeys: state.removedPlanRiskKeys,
        functionsData: state.functionsData,
        planAction: state.planAction,
        anexos: state.anexos,
        anexoDiretriz: state.anexoDiretriz,
        extraEstabelecimentoFields: state.extraEstabelecimentoFields,
        pdfLayout: state.pdfLayout,
      }),
    [
      derived.stepStatusById,
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
      state.planAction,
      state.pdfLayout,
      state.removedPlanRiskKeys,
      state.riskGheGroups,
    ]
  );

  const fakePreviewLines = useMemo(
    () => JSON.stringify(docxPayload, null, 2).split("\n"),
    [docxPayload]
  );

  const handleGenerateFakePdf = useCallback(async () => {
    setters.setIsGeneratingFakePdf(true);
    try {
      const generatedAt = new Date().toLocaleString("pt-BR");
      const statePayload = {
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
        planAction: state.planAction,
        removedPlanRiskKeys: state.removedPlanRiskKeys,
        anexos: state.anexos,
        anexoDiretriz: state.anexoDiretriz,
        gheGroups: state.gheGroups,
        currentGheId: state.currentGheId,
        riskGheGroups: state.riskGheGroups,
        currentRiskGheId: state.currentRiskGheId,
        pdfLayout: state.pdfLayout,
      };

      await apiPut(`/api/v1/frontend/pgr/${params.id}/state`, statePayload).catch(() => {
        // segue com payload local se a persistência imediata falhar
      });

      const backendState = await apiGet<unknown>(`/api/v1/frontend/pgr/${params.id}/state`).catch(
        () => statePayload
      );

      const payloadFromBackend = buildPgrDocxPayloadFromBackendState({
        pgrId: params.id,
        generatedAt,
        totalSteps: pgrSteps.length,
        backendState,
      });
      payloadFromBackend.pdfLayout = state.pdfLayout;

      const blob = await apiBlob(`/api/pgr/generate-pdf`, payloadFromBackend);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileBase =
        slugify(state.inicioDraft.companyName) || `pgr-${slugify(params.id) || "documento"}`;
      link.href = objectUrl;
      link.download = `${fileBase}-pgr.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setters.setLastFakePdfAt(new Date().toLocaleString("pt-BR"));
      const finalizedState = await apiPost<{
        completedSteps: number;
        historico: HistoricoData;
        workflow: PersistedPgrState["workflow"];
        meta?: { progressPercent?: number };
      }>(`/api/v1/frontend/pgr/${params.id}/finalize`);
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
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 200);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar/baixar o PDF agora.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setters.setIsGeneratingFakePdf(false);
    }
  }, [
    params.id,
    setters,
    state.anexoDiretriz,
    state.anexos,
    state.cardMeta,
    state.completedSteps,
    weightedProgressPercent,
    state.currentGheId,
    state.currentRiskGheId,
    state.dadosCadastrais,
    state.estabelecimentoSelecionado,
    state.extraEstabelecimentoFields,
    state.functionsData,
    state.gheGroups,
    state.historicoData,
    state.inicioDraft,
    state.planAction,
    state.pdfLayout,
    state.removedPlanRiskKeys,
    state.riskGheGroups,
  ]);

  const handleGeneratePreviewPdf = useCallback(
    async (layoutOverride?: PdfLayoutState) => {
      const generatedAt = new Date().toLocaleString("pt-BR");
      const effectiveLayout = layoutOverride ?? state.pdfLayout;
      const statePayload = {
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
        planAction: state.planAction,
        removedPlanRiskKeys: state.removedPlanRiskKeys,
        anexos: state.anexos,
        anexoDiretriz: state.anexoDiretriz,
        gheGroups: state.gheGroups,
        currentGheId: state.currentGheId,
        riskGheGroups: state.riskGheGroups,
        currentRiskGheId: state.currentRiskGheId,
        pdfLayout: effectiveLayout,
      };

      await apiPut(`/api/v1/frontend/pgr/${params.id}/state`, statePayload).catch(() => {
        // segue com payload local quando houver falha pontual de rede
      });

      const backendState = await apiGet<unknown>(`/api/v1/frontend/pgr/${params.id}/state`).catch(
        () => statePayload
      );
      const payloadFromBackend = buildPgrDocxPayloadFromBackendState({
        pgrId: params.id,
        generatedAt,
        totalSteps: pgrSteps.length,
        backendState,
      });
      payloadFromBackend.pdfLayout = effectiveLayout;
      const blob = await apiBlob(`/api/pgr/generate-pdf`, payloadFromBackend);
      return window.URL.createObjectURL(blob);
    },
    [
      params.id,
      state.anexoDiretriz,
      state.anexos,
      state.cardMeta,
      state.completedSteps,
      state.currentGheId,
      state.currentRiskGheId,
      state.dadosCadastrais,
      state.estabelecimentoSelecionado,
      state.extraEstabelecimentoFields,
      state.functionsData,
      state.gheGroups,
      state.historicoData,
      state.inicioDraft,
      state.planAction,
      state.pdfLayout,
      state.removedPlanRiskKeys,
      state.riskGheGroups,
      weightedProgressPercent,
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
      }>(`/api/v1/frontend/pgr/${params.id}/state`).catch(() => updatedState);

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

  const handleHistoricoChangeField = useCallback(
    (
      changeId: string,
      field: "company" | "analysis" | "change" | "reason" | "date",
      value: string
    ) => {
      setters.setHistoricoData((prev) => ({
        ...prev,
        changes: prev.changes.map((item) =>
          item.id === changeId ? { ...item, [field]: value } : item
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
    setters.setPlanActionGheId("");
    setters.setPlanActionRiskId("");
  }, [setters, state.workflow.isLocked]);

  const handleResetCaracterizacaoData = useCallback(() => {
    if (state.workflow.isLocked) return;
    setters.setRiskGheGroups(defaultRiskGheGroups);
    setters.setCurrentRiskGheId(defaultRiskGheGroups[0]?.id ?? "ghe-1");
    setters.setHistory([]);
    setters.setRemovedPlanRiskKeys([]);
    setters.setPlanActionGheId("");
    setters.setPlanActionRiskId("");
  }, [setters, state.workflow.isLocked]);

  const handleResetPlanoData = useCallback(() => {
    if (state.workflow.isLocked) return;
    setters.setPlanAction({ nr: "NR-01", vigencia: "" });
    setters.setRemovedPlanRiskKeys([]);
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
        })),
      }))
    );
  }, [setters, state.workflow.isLocked]);

  const handleResetAllData = useCallback(() => {
    if (state.workflow.isLocked) return;

    refs.lastCepLookupRef.current = {
      empresa: "",
      contratanteByIndex: {},
    };

    setters.setCompletedSteps(0);
    setters.setProgressPercent(0);
    setters.setInicioDraft(initialInicioDraft);
    setters.setDadosCadastrais(initialDadosCadastrais);
    setters.setCardMeta({
      pipefyCardId: "",
      cardName: "",
      dueDate: "",
      companyId: null,
      responsibleId: null,
    });
    setters.setHistoricoData(defaultHistorico);
    setters.setFunctionsData(defaultFunctions);
    setters.setExtraEstabelecimentoFields([]);
    setters.setEstabelecimentoSelecionado("");
    setters.setPlanAction({ nr: "NR-01", vigencia: "" });
    setters.setRemovedPlanRiskKeys([]);
    setters.setAnexos(defaultAnexos);
    setters.setAnexoDiretriz("Diretriz 1");
    setters.setGheGroups(defaultGheGroups);
    setters.setCurrentGheId(defaultGheGroups[0]?.id ?? "ghe-1");
    setters.setRiskGheGroups(defaultRiskGheGroups);
    setters.setCurrentRiskGheId(defaultRiskGheGroups[0]?.id ?? "ghe-1");
    setters.setPdfLayout(DEFAULT_PDF_LAYOUT_STATE);
    setters.setSearchTerm("");
    setters.setSelectedLeftIds([]);
    setters.setSelectedRightIds([]);
    setters.setHistory([]);
    setters.setGheSearch("");
    setters.setGheFilterId("all");
    setters.setIsGheListView(false);
    setters.setIsGheModalOpen(false);
    setters.setIsInfoModalOpen(false);
    setters.setInfoModalError("");
    setters.setInfoModalMode("next");
    setters.setPlanActionScope("risk");
    setters.setPlanActionGheId("");
    setters.setPlanActionRiskId("");
    setters.setPlanActionDescription("");
    setters.setIsPlanActionModalOpen(false);
    setters.setEditingMedidasId(null);
    setters.setEditingMedidasValue("");
    setters.setPlanTablePage(1);
    setters.setDraggedAnexoId(null);
    setters.setDragOverAnexoId(null);
    setters.setLastGheNotice(null);
    setters.setExcelImportFeedback(null);
    setters.setIsPreviewModalOpen(false);
    setters.setLastFakePdfAt(null);
  }, [refs.lastCepLookupRef, setters, state.workflow.isLocked]);

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
      riskGheGroups: state.riskGheGroups,
      planActionGheId: state.planActionGheId,
      planActionRiskId: state.planActionRiskId,
      planActionDescription: state.planActionDescription,
      editingMedidasValue: state.editingMedidasValue,
      completedSteps: state.completedSteps,
      currentIndex,
      nextStep,
      router,
      anexos: state.anexos,
      dragOverAnexoId: state.dragOverAnexoId,
      draggedAnexoId: state.draggedAnexoId,
    },
    helpers: {
      handleAdvanceApiSync,
    },
  });

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
    shellProps: {
      pgrId: params.id,
      currentStep: step.id as PgrStepId,
      completedSteps: state.completedSteps,
      progressPercent: state.progressPercent,
      alertSteps: derived.alertSteps,
      stepStatusById: derived.stepStatusById,
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
      infoModalError: state.infoModalError,
      infoModalMode: state.infoModalMode,
      workflow: state.workflow,
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
      getTipoAvaliacaoOptions: derived.getTipoAvaliacaoOptions,
      getUnidadeMedidaOptions: derived.getUnidadeMedidaOptions,
      getIntensidadeOptions: derived.getIntensidadeOptions,
      getIsCalculatedCriteria: derived.getIsCalculatedCriteria,
      getHasQuantitativeCriteria: derived.getHasQuantitativeCriteria,
      getNivelAcaoOptions: derived.getNivelAcaoOptions,
      getSeveridadeOptions: derived.getSeveridadeOptions,
      getMedidasControleOptions: derived.getMedidasControleOptions,
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
      planActionRiskOptions: derived.planActionRiskOptions,
      planActionDescription: state.planActionDescription,
      setPlanActionDescription: setters.setPlanActionDescription,
      anexoDiretriz: state.anexoDiretriz,
      setAnexoDiretriz: setters.setAnexoDiretriz,
      diretrizOptions: derived.diretrizOptions,
      anexos: state.anexos,
      dragOverAnexoId: state.dragOverAnexoId,
      lastFakePdfAt: state.lastFakePdfAt,
      isGeneratingFakePdf: state.isGeneratingFakePdf,
      stepStatusById: derived.stepStatusById,
      missingFieldsByStep: derived.missingFieldsByStep,
      isPreviewModalOpen: state.isPreviewModalOpen,
      setIsPreviewModalOpen: setters.setIsPreviewModalOpen,
      fakePreviewLines,
      handleGeneratePreviewPdf,
      handleGenerateFakePdf,
      handleStartNewVersion,
      handleHistoricoChangeField,
      handleResetInicioData,
      handleResetDadosData,
      handleResetDescricaoData,
      handleResetCaracterizacaoData,
      handleResetPlanoData,
      handleResetAllData,
      generalActions,
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
