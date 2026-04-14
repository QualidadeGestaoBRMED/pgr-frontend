import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileSpreadsheet,
  MinusCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "./searchable-select";
import type { DescricaoStepCtx } from "./renderers/descricao-renderer";
import type { PgrFunction } from "../types";

type DescricaoStepProps = {
  ctx: DescricaoStepCtx;
};

type DescricaoGroup = {
  setor: string;
  items: PgrFunction[];
};

type GheItem = {
  functionId: string;
  funcionarios?: string | number;
};

type GheGroup = {
  id: string;
  name: string;
  items: GheItem[];
};

type RequiredGheInfoField = "processo" | "observacoes" | "ambiente";

const PROGRESSIVE_THRESHOLD = 50;
const PROGRESSIVE_BATCH_SIZE = 50;

function countGroupedItems(groups: DescricaoGroup[]): number {
  return groups.reduce((total, group) => total + group.items.length, 0);
}

function sliceGroupedFunctions(groups: DescricaoGroup[], maxItems: number): DescricaoGroup[] {
  let remaining = Math.max(0, maxItems);
  const sliced: DescricaoGroup[] = [];
  for (const group of groups) {
    if (remaining <= 0) break;
    if (group.items.length <= remaining) {
      sliced.push(group);
      remaining -= group.items.length;
      continue;
    }
    sliced.push({
      ...group,
      items: group.items.slice(0, remaining),
    });
    remaining = 0;
  }
  return sliced;
}

export function DescricaoStep({ ctx }: DescricaoStepProps) {
  const [isManualFunctionModalOpen, setIsManualFunctionModalOpen] = useState(false);
  const [manualSetor, setManualSetor] = useState("");
  const [manualFuncao, setManualFuncao] = useState("");
  const [manualDescricao, setManualDescricao] = useState("");
  const [manualAssignToCurrentGhe, setManualAssignToCurrentGhe] = useState(true);
  const [manualFeedback, setManualFeedback] = useState<null | {
    type: "success" | "error";
    message: string;
  }>(null);
  const [editingFunctionIds, setEditingFunctionIds] = useState<string[]>([]);
  const [editingDrafts, setEditingDrafts] = useState<
    Record<string, { setor: string; funcao: string; descricao: string }>
  >({});
  const [editingFeedback, setEditingFeedback] = useState("");
  const [isEditingGheName, setIsEditingGheName] = useState(false);
  const [editingGheName, setEditingGheName] = useState("");
  const [gheNameFeedback, setGheNameFeedback] = useState("");
  const [pendingRemoveFunction, setPendingRemoveFunction] = useState<null | {
    id: string;
    label: string;
  }>(null);
  const [touchedInfoFields, setTouchedInfoFields] = useState<
    Partial<Record<RequiredGheInfoField, boolean>>
  >({});

  const {
    currentGheName,
    lastGheNotice,
    searchTerm,
    setSearchTerm,
    availableCountLabel,
    remainingCount,
    describedGheCount,
    setIsGheModalOpen,
    setIsGheListView,
    isGheListView,
    importExcelInputRef,
    handleDescricaoExcelChange,
    handleAddManualFunction,
    isImportingExcel,
    excelImportFeedback,
    groupedFunctions,
    selectedLeftIds,
    handleSelectionStart,
    leftListRef,
    getSelectionStyle,
    dragOverZone,
    handleDragOver,
    handleDropToLeft,
    handleDragLeave,
    handleToggleLeftSelection,
    handleDragStartLeft,
    handleAddSelected,
    deleteFunction,
    handleRemoveSelected,
    handleCreateNextGhe,
    handleRenameCurrentGhe,
    handleDeleteCurrentGhe,
    currentItems,
    functionMap,
    selectedRightIds,
    handleDropToRight,
    rightListRef,
    handleToggleRightSelection,
    handleDragStartRight,
    miniInputClass,
    handleFuncionarioChange,
    handleRemoveSingle,
    handleUpdateFunctionDetails,
    isGheModalOpen,
    gheFilterId,
    setGheFilterId,
    gheGroups,
    handleSelectGhe,
    gheSearch,
    setGheSearch,
    inputInlineClass,
    normalizedGheSearch,
    filteredAllFunctions,
    filteredGheGroupsForList,
    truncatePreview,
    functionAssignments,
    assignGheOptions,
    selectBaseClass,
    handleAssignFunction,
    isInfoModalOpen,
    setInfoModalError,
    setIsInfoModalOpen,
    textareaBaseClass,
    currentGhe,
    handleInfoChange,
    infoModalError,
    handleConfirmInfoModal,
    infoModalMode,
  } = ctx;

  const addInlineEdit = (functionIds: string[]) => {
    const validIds = functionIds.filter((id) => functionMap.has(id));
    if (!validIds.length) return;
    setEditingFunctionIds((prev) => Array.from(new Set([...prev, ...validIds])));
    setEditingDrafts((prev) => {
      const next = { ...prev };
      validIds.forEach((id) => {
        if (next[id]) return;
        const data = functionMap.get(id);
        if (!data) return;
        next[id] = {
          setor: data.setor || "",
          funcao: data.funcao || "",
          descricao: data.descricao || "",
        };
      });
      return next;
    });
    setEditingFeedback("");
  };

  const removeInlineEdit = (functionId: string) => {
    setEditingFunctionIds((prev) => prev.filter((id) => id !== functionId));
    setEditingDrafts((prev) => {
      if (!prev[functionId]) return prev;
      const next = { ...prev };
      delete next[functionId];
      return next;
    });
  };

  const startInlineEdit = (functionId: string) => {
    addInlineEdit([functionId]);
  };

  const handleEditSelectedInline = () => {
    if (!selectedRightIds.length) return;
    addInlineEdit(selectedRightIds);
  };

  const handleDraftFieldChange = (
    functionId: string,
    field: "setor" | "funcao" | "descricao",
    value: string
  ) => {
    setEditingDrafts((prev) => ({
      ...prev,
      [functionId]: {
        setor: prev[functionId]?.setor ?? "",
        funcao: prev[functionId]?.funcao ?? "",
        descricao: prev[functionId]?.descricao ?? "",
        [field]: value,
      },
    }));
  };

  const handleSaveInlineEdit = (functionId: string) => {
    const draft = editingDrafts[functionId];
    if (!draft) return;
    const didSave = handleUpdateFunctionDetails({
      id: functionId,
      setor: draft.setor,
      funcao: draft.funcao,
      descricao: draft.descricao,
    });
    if (!didSave) {
      setEditingFeedback("A função não pode ficar vazia.");
      return;
    }
    removeInlineEdit(functionId);
  };

  const handleManualFunctionSubmit = () => {
    try {
      handleAddManualFunction({
        setor: manualSetor,
        funcao: manualFuncao,
        descricao: manualDescricao,
        assignToCurrentGhe: manualAssignToCurrentGhe,
        gheId: currentGhe?.id,
      });
      setManualFeedback({
        type: "success",
        message: manualAssignToCurrentGhe
          ? "Função cadastrada manualmente e associada ao GHE atual."
          : "Função cadastrada manualmente na lista geral.",
      });
      setManualSetor("");
      setManualFuncao("");
      setManualDescricao("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível cadastrar a função manual.";
      setManualFeedback({
        type: "error",
        message,
      });
    }
  };

  const startGheNameInlineEdit = () => {
    setIsEditingGheName(true);
    setEditingGheName(currentGheName);
    setGheNameFeedback("");
  };

  const cancelGheNameInlineEdit = () => {
    setIsEditingGheName(false);
    setEditingGheName("");
    setGheNameFeedback("");
  };

  const saveGheNameInlineEdit = () => {
    const nextName = editingGheName.trim();
    if (!nextName) {
      setGheNameFeedback("O nome do GHE não pode ficar vazio.");
      return;
    }
    const hasDuplicate = gheGroups.some(
      (ghe: GheGroup) =>
        ghe.id !== currentGhe?.id && ghe.name.trim().toLowerCase() === nextName.toLowerCase()
    );
    if (hasDuplicate) {
      setGheNameFeedback("Já existe um GHE com esse nome.");
      return;
    }
    const didSave = handleRenameCurrentGhe(nextName);
    if (!didSave) {
      setGheNameFeedback("Não foi possível atualizar o nome do GHE.");
      return;
    }
    setIsEditingGheName(false);
    setEditingGheName("");
    setGheNameFeedback("");
  };

  const deleteCurrentGhe = () => {
    if (gheGroups.length <= 1) {
      setGheNameFeedback("Não é possível excluir o único GHE.");
      return;
    }
    const confirmed = window.confirm(`Deseja excluir o ${currentGheName}?`);
    if (!confirmed) return;
    const didDelete = handleDeleteCurrentGhe();
    if (!didDelete) {
      setGheNameFeedback("Não foi possível excluir o GHE.");
      return;
    }
    setIsEditingGheName(false);
    setEditingGheName("");
    setGheNameFeedback("");
  };

  const [leftVisibleCount, setLeftVisibleCount] = useState(PROGRESSIVE_BATCH_SIZE);
  const [rightVisibleCount, setRightVisibleCount] = useState(PROGRESSIVE_BATCH_SIZE);
  const [modalGroupsVisibleCount, setModalGroupsVisibleCount] = useState(PROGRESSIVE_BATCH_SIZE);
  const [modalListVisibleCount, setModalListVisibleCount] = useState(PROGRESSIVE_BATCH_SIZE);

  const leftTotalItems = useMemo(
    () => countGroupedItems(groupedFunctions as DescricaoGroup[]),
    [groupedFunctions]
  );
  const shouldPaginateLeft = leftTotalItems > PROGRESSIVE_THRESHOLD;
  const visibleGroupedFunctions = useMemo(
    () =>
      shouldPaginateLeft
        ? sliceGroupedFunctions(groupedFunctions as DescricaoGroup[], leftVisibleCount)
        : (groupedFunctions as DescricaoGroup[]),
    [groupedFunctions, leftVisibleCount, shouldPaginateLeft]
  );
  const visibleLeftItems = useMemo(
    () => countGroupedItems(visibleGroupedFunctions),
    [visibleGroupedFunctions]
  );
  const hiddenLeftItems = Math.max(0, leftTotalItems - visibleLeftItems);

  const shouldPaginateRight = currentItems.length > PROGRESSIVE_THRESHOLD;
  const visibleCurrentItems = useMemo(
    () =>
      shouldPaginateRight
        ? currentItems.slice(0, rightVisibleCount)
        : currentItems,
    [currentItems, rightVisibleCount, shouldPaginateRight]
  );
  const hiddenRightItems = Math.max(0, currentItems.length - visibleCurrentItems.length);

  const shouldPaginateModalGroups = gheGroups.length > PROGRESSIVE_THRESHOLD;
  const visibleModalGroups = useMemo(
    () =>
      shouldPaginateModalGroups
        ? gheGroups.slice(0, modalGroupsVisibleCount)
        : gheGroups,
    [gheGroups, modalGroupsVisibleCount, shouldPaginateModalGroups]
  );
  const hiddenModalGroups = Math.max(0, gheGroups.length - visibleModalGroups.length);

  const shouldPaginateModalList = isGheListView
    ? filteredGheGroupsForList.length > PROGRESSIVE_THRESHOLD
    : filteredAllFunctions.length > PROGRESSIVE_THRESHOLD;
  const visibleModalGheList = useMemo(
    () =>
      isGheListView
        ? filteredGheGroupsForList.slice(0, modalListVisibleCount)
        : filteredGheGroupsForList,
    [filteredGheGroupsForList, isGheListView, modalListVisibleCount]
  );
  const visibleModalFunctionList = useMemo(
    () =>
      !isGheListView
        ? filteredAllFunctions.slice(0, modalListVisibleCount)
        : filteredAllFunctions,
    [filteredAllFunctions, isGheListView, modalListVisibleCount]
  );
  const hiddenModalListItems = Math.max(
    0,
    (isGheListView ? filteredGheGroupsForList.length : filteredAllFunctions.length) -
      (isGheListView ? visibleModalGheList.length : visibleModalFunctionList.length)
  );

  useEffect(() => {
    setLeftVisibleCount(PROGRESSIVE_BATCH_SIZE);
  }, [searchTerm, leftTotalItems]);

  useEffect(() => {
    setRightVisibleCount(PROGRESSIVE_BATCH_SIZE);
  }, [currentGheName, currentItems.length]);

  useEffect(() => {
    if (!editingFunctionIds.length) return;
    const allowedIds = new Set(currentItems.map((item) => item.functionId));
    setEditingFunctionIds((prev) => prev.filter((id) => allowedIds.has(id)));
    setEditingDrafts((prev) => {
      const next: typeof prev = {};
      Object.entries(prev).forEach(([id, draft]) => {
        if (allowedIds.has(id)) next[id] = draft;
      });
      return next;
    });
  }, [currentItems, editingFunctionIds.length]);

  useEffect(() => {
    if (!isGheModalOpen) return;
    setModalGroupsVisibleCount(PROGRESSIVE_BATCH_SIZE);
  }, [isGheModalOpen, gheGroups.length]);

  useEffect(() => {
    if (!isGheModalOpen) return;
    setModalListVisibleCount(PROGRESSIVE_BATCH_SIZE);
  }, [
    isGheModalOpen,
    isGheListView,
    gheSearch,
    gheFilterId,
    filteredAllFunctions.length,
    filteredGheGroupsForList.length,
  ]);

  useEffect(() => {
    if (!isManualFunctionModalOpen) {
      setManualFeedback(null);
    }
  }, [isManualFunctionModalOpen]);

  useEffect(() => {
    if (isEditingGheName) return;
    setEditingGheName(currentGheName);
  }, [currentGheName, isEditingGheName]);

  useEffect(() => {
    if (!isInfoModalOpen) return;
    setTouchedInfoFields({});
  }, [isInfoModalOpen, currentGhe?.id]);

  const infoErrors = useMemo<Record<RequiredGheInfoField, string>>(
    () => ({
      processo: (currentGhe?.info.processo ?? "").trim()
        ? ""
        : "Descrição sucinta do processo produtivo é obrigatória.",
      observacoes: (currentGhe?.info.observacoes ?? "").trim()
        ? ""
        : "Observações do GHE é obrigatório.",
      ambiente: (currentGhe?.info.ambiente ?? "").trim()
        ? ""
        : "Descrição do ambiente do GHE é obrigatória.",
    }),
    [currentGhe?.info.ambiente, currentGhe?.info.observacoes, currentGhe?.info.processo]
  );

  const markInfoTouched = (field: RequiredGheInfoField) => {
    setTouchedInfoFields((prev) => ({ ...prev, [field]: true }));
  };

  const getInfoFieldClassName = (field: RequiredGheInfoField) =>
    touchedInfoFields[field] && infoErrors[field]
      ? `${textareaBaseClass} border-rose-400 focus:ring-rose-500`
      : textareaBaseClass;

  return (
    <>
          <section className="px-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
                Descrição do GHE
              </h1>
              <div className="group relative">
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground"
                  aria-label="Ajuda sobre o fluxo do GHE"
                >
                  ?
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-[260px] -translate-x-1/2 rounded-[10px] bg-popover p-3 text-[12px] text-popover-foreground shadow-[0px_8px_20px_rgba(25,59,79,0.15)] opacity-0 transition group-hover:opacity-100">
                  Dica rápida: Associar as funções ao GHE e,
                  depois, preencher processo, observações e ambiente. Atenção à
                  ordem pois é um processo repetitivo e pode gerar erros.
                </div>
              </div>
            </div>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Descreva o processo produtivo, ambiente e funções do GHE
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[20px] font-semibold text-foreground">
                  {currentGheName}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Você está montando e descrevendo este GHE.
                </p>
              </div>
            </div>
            {lastGheNotice ? (
              <div className="mt-3 rounded-[10px] border border-border/70 bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                {lastGheNotice.from} finalizado. Agora você está no{" "}
                <span className="font-semibold text-foreground">
                  {lastGheNotice.to}
                </span>
                .
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 px-2">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[16px] font-medium text-foreground">
                    Funções do GHE
                  </h2>
                  {isEditingGheName ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editingGheName}
                        onChange={(event) => setEditingGheName(event.target.value)}
                        className={`${inputInlineClass} h-8 w-[180px]`}
                        placeholder="Nome do GHE"
                      />
                      <button
                        type="button"
                        onClick={saveGheNameInlineEdit}
                        className="text-muted-foreground transition hover:text-primary"
                        title="Salvar nome do GHE"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelGheNameInlineEdit}
                        className="text-muted-foreground transition hover:text-primary"
                        title="Cancelar edição do GHE"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                        {currentGheName}
                      </span>
                      <button
                        type="button"
                        onClick={startGheNameInlineEdit}
                        className="text-muted-foreground transition hover:text-primary"
                        title="Editar nome do GHE"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={deleteCurrentGhe}
                        className={`transition ${
                          gheGroups.length > 1
                            ? "text-muted-foreground hover:text-danger"
                            : "text-muted-foreground/40"
                        }`}
                        title={
                          gheGroups.length > 1
                            ? "Excluir GHE"
                            : "Não é possível excluir o único GHE"
                        }
                        disabled={gheGroups.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {currentItems.length} funções associadas
                  {remainingCount
                    ? ` · ${remainingCount} funções restantes`
                    : " · Todas as funções já estão associadas"}
                  {` · ${describedGheCount}/${gheGroups.length} GHEs descritos`}
                </p>
                {gheNameFeedback ? (
                  <p className="mt-1 text-[12px] text-danger">{gheNameFeedback}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsGheModalOpen(true)}
                  className="btn-primary px-4"
                >
                  Ver GHEs
                </button>
                <button
                  type="button"
                  onClick={() => importExcelInputRef.current?.click()}
                  disabled={isImportingExcel}
                  className={isImportingExcel ? "btn-disabled px-4" : "btn-primary px-4"}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {isImportingExcel ? "Importando..." : "Importar do Excel"}
                </button>
                <input
                  ref={importExcelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleDescricaoExcelChange}
                />
              </div>
            </div>
            {excelImportFeedback ? (
              <p
                className={`mt-3 text-[12px] ${
                  excelImportFeedback.type === "error"
                    ? "text-danger"
                    : "text-muted-foreground"
                }`}
              >
                {excelImportFeedback.message}
              </p>
            ) : null}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
              <div
                ref={leftListRef}
                onPointerDown={(event) => handleSelectionStart(event, "left")}
                onDragOver={(event) => handleDragOver(event, "left")}
                onDragLeave={handleDragLeave}
                onDrop={handleDropToLeft}
                className={`relative rounded-[14px] border bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none ${
                  dragOverZone === "left"
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-border/70"
                } select-none`}
              >
                {getSelectionStyle("left") ? (
                  <div
                    className="pointer-events-none absolute z-10 rounded-[8px] border border-primary/40 bg-primary/10"
                    style={getSelectionStyle("left") ?? undefined}
                  />
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">
                      Lista geral de funções
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      Selecione ou arraste para o GHE atual
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-[12px] font-semibold text-foreground/70">
                    {availableCountLabel}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className={`${inputInlineClass} pl-10`}
                      placeholder="Buscar por setor ou função"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  <p className="text-[11px] text-muted-foreground">
                    Arraste uma ou várias funções selecionadas para o GHE.
                  </p>
                  {visibleGroupedFunctions.length ? (
                    visibleGroupedFunctions.map((group: DescricaoGroup) => (
                      <div key={group.setor} className="space-y-3">
                        <h3 className="text-[16px] font-semibold text-foreground">
                          {group.setor}
                        </h3>
                        <div className="space-y-2 text-[13px] text-foreground/80">
                          {group.items.map((funcao: PgrFunction) => (
                            <label
                              key={funcao.id}
                              data-select-item
                              data-left-id={funcao.id}
                              draggable
                              onDragStart={(event) =>
                                handleDragStartLeft(event, funcao.id)
                              }
                              onDragEnd={handleDragLeave}
                              className="flex cursor-grab items-center gap-2 rounded-[8px] px-2 py-1 transition hover:bg-muted/70"
                            >
                              <input
                                type="checkbox"
                                checked={selectedLeftIds.includes(funcao.id)}
                                onChange={() =>
                                  handleToggleLeftSelection(funcao.id)
                                }
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span
                                className="min-w-0 flex-1 break-words"
                                title={`${funcao.funcao} - ${funcao.descricao}`}
                              >
                                {funcao.funcao} - {truncatePreview(funcao.descricao, 90)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[13px] text-muted-foreground">
                      Nenhuma função encontrada.
                    </p>
                  )}
                  {shouldPaginateLeft && hiddenLeftItems > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLeftVisibleCount((prev) => prev + PROGRESSIVE_BATCH_SIZE)
                      }
                      className="btn-outline mt-2 px-4 py-2 text-[12px]"
                    >
                      Carregar mais ({hiddenLeftItems} restantes)
                    </button>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAddSelected}
                    disabled={!selectedLeftIds.length}
                    className={
                      selectedLeftIds.length
                        ? "btn-primary px-4"
                        : "btn-disabled px-4"
                    }
                  >
                    Adicionar selecionadas
                  </button>
                  <button
                    type="button"
                    onClick={handleEditSelectedInline}
                    disabled={!selectedRightIds.length}
                    className={
                      selectedRightIds.length
                        ? "btn-primary px-4"
                        : "btn-disabled px-4"
                    }
                  >
                    Editar selecionadas
                  </button>
                  <button
                    type="button"
                    onClick={deleteFunction}
                    disabled={!selectedLeftIds.length}
                    className={
                      selectedLeftIds.length
                        ? "btn-primary px-4"
                        : "btn-disabled px-4"
                    }
                  >
                    Excluir selecionadas
                  </button>
                </div>

              </div>

              <div className="flex flex-col items-center gap-3 self-center">
                <button
                  type="button"
                  onClick={handleAddSelected}
                  disabled={!selectedLeftIds.length}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    selectedLeftIds.length
                      ? "border-primary text-primary hover:bg-primary/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  disabled={!selectedRightIds.length}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                    selectedRightIds.length
                      ? "border-primary text-primary hover:bg-primary/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

              <div
                ref={rightListRef}
                onPointerDown={(event) => handleSelectionStart(event, "right")}
                onDragOver={(event) => handleDragOver(event, "right")}
                onDragLeave={handleDragLeave}
                onDrop={handleDropToRight}
                className={`relative rounded-[14px] border bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none ${
                  dragOverZone === "right"
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-border/70"
                } select-none`}
              >
                {getSelectionStyle("right") ? (
                  <div
                    className="pointer-events-none absolute z-10 rounded-[8px] border border-primary/40 bg-primary/10"
                    style={getSelectionStyle("right") ?? undefined}
                  />
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">
                      Funções no {currentGheName}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      Arraste para devolver à lista geral
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                      {currentItems.length} associadas
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsManualFunctionModalOpen(true)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 text-primary transition hover:bg-primary/10"
                      title="Adicionar função manualmente"
                      aria-label="Adicionar função manualmente"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto_auto] gap-4 text-[12px] font-semibold text-muted-foreground">
                  <span />
                  <span>Setor</span>
                  <span>Função</span>
                  <span>Descrição de atividades</span>
                  <span>Nº de funcionários</span>
                  <span />
                </div>
                <div className="mt-3 space-y-2">
                  {visibleCurrentItems.length ? (
                    visibleCurrentItems.map((item: GheItem) => {
                      const data = functionMap.get(item.functionId);
                      if (!data) return null;
                      const isEditingRow = editingFunctionIds.includes(item.functionId);
                      const draft = editingDrafts[item.functionId] ?? {
                        setor: data.setor || "",
                        funcao: data.funcao || "",
                        descricao: data.descricao || "",
                      };
                      return (
                      <div
                        key={item.functionId}
                        data-select-item
                        data-right-id={item.functionId}
                        draggable={!isEditingRow}
                        onDragStart={(event) =>
                          handleDragStartRight(event, item.functionId)
                        }
                        onDragEnd={handleDragLeave}
                        className="grid cursor-grab grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto_auto] items-center gap-4 rounded-[10px] border border-border/60 px-3 py-3 text-[13px] text-foreground/80 transition hover:bg-muted/70"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRightIds.includes(item.functionId)}
                          onChange={() =>
                            handleToggleRightSelection(item.functionId)
                          }
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        {isEditingRow ? (
                          <input
                            value={draft.setor}
                            onChange={(event) =>
                              handleDraftFieldChange(
                                item.functionId,
                                "setor",
                                event.target.value
                              )
                            }
                            className={inputInlineClass}
                            placeholder="Setor"
                          />
                        ) : (
                          <span
                            className="min-w-0 truncate font-semibold text-foreground"
                            title={data.setor}
                          >
                            {data.setor}
                          </span>
                        )}
                        {isEditingRow ? (
                          <input
                            value={draft.funcao}
                            onChange={(event) =>
                              handleDraftFieldChange(
                                item.functionId,
                                "funcao",
                                event.target.value
                              )
                            }
                            className={inputInlineClass}
                            placeholder="Função"
                          />
                        ) : (
                          <span
                            className="min-w-0 truncate font-medium text-foreground/90"
                            title={data.funcao}
                          >
                            {data.funcao}
                          </span>
                        )}
                        {isEditingRow ? (
                          <input
                            value={draft.descricao}
                            onChange={(event) =>
                              handleDraftFieldChange(
                                item.functionId,
                                "descricao",
                                event.target.value
                              )
                            }
                            className={inputInlineClass}
                            placeholder="Descrição das atividades"
                          />
                        ) : (
                          <span
                            className="min-w-0 truncate text-muted-foreground"
                            title={data.descricao}
                          >
                            {truncatePreview(data.descricao, 90)}
                          </span>
                        )}
                        <input
                          className={miniInputClass}
                          type="number"
                          min={0}
                          step={1}
                          value={item.funcionarios || "0"}
                          data-funcionarios
                          data-func-id={item.functionId}
                          onChange={(event) =>
                            handleFuncionarioChange(
                              item.functionId,
                              event.target.value
                            )
                          }
                        />
                        <div className="flex items-center gap-2">
                          {isEditingRow ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveInlineEdit(item.functionId)}
                                className="text-muted-foreground transition hover:text-primary"
                                title="Salvar"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeInlineEdit(item.functionId)}
                                className="text-muted-foreground transition hover:text-primary"
                                title="Cancelar"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingRemoveFunction({
                                    id: item.functionId,
                                    label: data.funcao || "Função",
                                  })
                                }
                                className="text-muted-foreground transition hover:text-primary"
                                title="Remover"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => startInlineEdit(item.functionId)}
                                className="text-muted-foreground transition hover:text-primary"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-6 text-center text-[13px] text-muted-foreground">
                      Nenhuma função adicionada ao GHE.
                    </div>
                  )}
                  {shouldPaginateRight && hiddenRightItems > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setRightVisibleCount((prev) => prev + PROGRESSIVE_BATCH_SIZE)
                      }
                      className="btn-outline mt-2 px-4 py-2 text-[12px]"
                    >
                      Carregar mais ({hiddenRightItems} restantes)
                    </button>
                  ) : null}
                  {editingFeedback ? (
                    <p className="text-[12px] text-danger">{editingFeedback}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {pendingRemoveFunction ? (
            <div className="fixed -inset-6 z-50">
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
              <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
                <div className="w-full max-w-md rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
                  <h3 className="text-[18px] font-semibold text-foreground">
                    Confirmar exclusão
                  </h3>
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    Deseja realmente excluir a função{" "}
                    <span className="font-semibold text-foreground">
                      {pendingRemoveFunction.label}
                    </span>
                    ?
                  </p>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setPendingRemoveFunction(null)}
                      className="btn-outline px-4"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveSingle(pendingRemoveFunction.id);
                        setPendingRemoveFunction(null);
                      }}
                      className="btn-primary px-5"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isGheModalOpen ? (
            <div className="fixed -inset-6 z-50">
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
              <div className="relative flex min-h-screen items-center justify-center overflow-y-auto px-4 py-6">
                <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[18px] font-semibold text-foreground">
                        GHEs construídos
                      </h3>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Visualize e edite as funções associadas a cada GHE
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGheModalOpen(false)}
                      className="btn-outline px-3 py-1 text-[12px]"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-6 grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
                    <div className="min-h-0 space-y-4 overflow-auto pr-2">
                      <button
                        type="button"
                        onClick={() => setGheFilterId("all")}
                        className={`w-full rounded-[12px] border px-4 py-4 text-left ${
                          gheFilterId === "all"
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/70 bg-background/40"
                        }`}
                      >
                        <p className="text-[14px] font-semibold text-foreground">
                          Todos os GHEs
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {gheGroups.reduce(
                            (total: number, ghe: GheGroup) => total + ghe.items.length,
                            0
                          )}{" "}
                          funções associadas
                        </p>
                      </button>
                      {visibleModalGroups.map((ghe: GheGroup) => (
                        <div
                          key={ghe.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setGheFilterId(ghe.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setGheFilterId(ghe.id);
                            }
                          }}
                          className={`rounded-[12px] border px-4 py-4 ${
                            gheFilterId === ghe.id
                              ? "border-primary/50 bg-primary/5"
                              : "border-border/70 bg-background/40"
                          } cursor-pointer`}
                        >
                          <div className="w-full text-left">
                            <p className="text-[14px] font-semibold text-foreground">
                              {ghe.name}
                            </p>
                            <p className="text-[12px] text-muted-foreground">
                              {ghe.items.length} funções associadas
                            </p>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectGhe(ghe.id);
                              }}
                              className="btn-outline px-3 py-1 text-[12px]"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      ))}
                      {shouldPaginateModalGroups && hiddenModalGroups > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setModalGroupsVisibleCount(
                              (prev) => prev + PROGRESSIVE_BATCH_SIZE
                            )
                          }
                          className="btn-outline w-full px-3 py-2 text-[12px]"
                        >
                          Carregar mais GHEs ({hiddenModalGroups} restantes)
                        </button>
                      ) : null}
                    </div>

                    <div className="flex min-h-0 min-w-0 flex-col rounded-[12px] border border-border/70 bg-background/40 px-4 py-4">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={gheSearch}
                          onChange={(event) => setGheSearch(event.target.value)}
                          className={`${inputInlineClass} pl-10`}
                          placeholder="Buscar por setor ou função"
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[12px] text-muted-foreground">
                          {gheFilterId === "all"
                            ? "Visualizando todas as funções"
                            : `Filtro: ${gheGroups.find(
                                (ghe: GheGroup) => ghe.id === gheFilterId
                              )?.name ?? "GHE"}`}
                          {normalizedGheSearch
                            ? ` · ${filteredAllFunctions.length} resultados`
                            : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsGheListView((prev: boolean) => !prev)}
                          className="btn-outline px-3 py-1 text-[12px]"
                        >
                          {isGheListView
                            ? "Voltar para edição"
                            : "Visualizar em lista"}
                        </button>
                      </div>
                    {isGheListView ? (
                      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-auto pr-2">
                        {visibleModalGheList.length ? (
                          visibleModalGheList.map((ghe: GheGroup) => (
                          <div
                            key={ghe.id}
                            className="rounded-[10px] border border-border/60 bg-card px-3 py-3"
                          >
                            <p className="text-[13px] font-semibold text-foreground">
                              {ghe.name}
                            </p>
                            {ghe.items.length ? (
                              <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
                                {ghe.items.map((item: GheItem) => {
                                  const data = functionMap.get(item.functionId);
                                  if (!data) return null;
                                  return (
                                    <li key={item.functionId}>
                                      {data.funcao} · {data.setor}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="mt-2 text-[12px] text-muted-foreground">
                                Nenhuma função associada.
                              </p>
                            )}
                          </div>
                          ))
                        ) : (
                          <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-6 text-center text-[12px] text-muted-foreground">
                            Nenhum resultado para o filtro aplicado.
                          </div>
                        )}
                        {shouldPaginateModalList && hiddenModalListItems > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setModalListVisibleCount(
                                (prev) => prev + PROGRESSIVE_BATCH_SIZE
                              )
                            }
                            className="btn-outline px-4 py-2 text-[12px]"
                          >
                            Carregar mais ({hiddenModalListItems} restantes)
                          </button>
                        ) : null}
                      </div>
                    ) : (
                        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto pr-2">
                          {visibleModalFunctionList.map((funcao: PgrFunction) => {
                            const assignedGheId = functionAssignments.get(
                              funcao.id
                            );
                            const assignedGhe = gheGroups.find(
                              (ghe: GheGroup) => ghe.id === assignedGheId
                            );
                            return (
                              <div
                                key={funcao.id}
                                className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-border/60 bg-card px-3 py-3"
                              >
                                <div>
                                  <p className="text-[13px] font-semibold text-foreground">
                                    {funcao.funcao}
                                  </p>
                                  <p className="text-[12px] text-muted-foreground">
                                    {funcao.setor} · {truncatePreview(funcao.descricao, 110)}
                                  </p>
                                  <p className="text-[12px] text-muted-foreground">
                                    {assignedGhe
                                      ? `Atrelado ao ${assignedGhe.name}`
                                      : "Sem GHE"}
                                  </p>
                                </div>
                                <SearchableSelect
                                  value={assignedGheId ?? "none"}
                                  onChange={(value) =>
                                    handleAssignFunction(funcao.id, value)
                                  }
                                  options={assignGheOptions}
                                  buttonClassName={`${selectBaseClass} w-[170px]`}
                                  searchPlaceholder="Filtrar GHE"
                                />
                              </div>
                            );
                          })}
                          {shouldPaginateModalList && hiddenModalListItems > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setModalListVisibleCount(
                                  (prev) => prev + PROGRESSIVE_BATCH_SIZE
                                )
                              }
                              className="btn-outline px-4 py-2 text-[12px]"
                            >
                              Carregar mais ({hiddenModalListItems} restantes)
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isManualFunctionModalOpen ? (
            <div className="fixed -inset-6 z-50">
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
              <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
                <div className="w-full max-w-3xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[18px] font-semibold text-foreground">
                        Cadastro manual de função
                      </h3>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Fallback sem planilha para adicionar função ao fluxo do GHE.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManualFunctionModalOpen(false)}
                      className="btn-outline px-3 py-1 text-[12px]"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <input
                      value={manualSetor}
                      onChange={(event) => setManualSetor(event.target.value)}
                      className={inputInlineClass}
                      placeholder="Setor (obrigatório)"
                      required
                    />
                    <input
                      value={manualFuncao}
                      onChange={(event) => setManualFuncao(event.target.value)}
                      className={inputInlineClass}
                      placeholder="Função (obrigatório)"
                      required
                    />
                    <input
                      value={manualDescricao}
                      onChange={(event) => setManualDescricao(event.target.value)}
                      className={inputInlineClass}
                      placeholder="Descrição da atividade (obrigatório)"
                      required
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={manualAssignToCurrentGhe}
                        onChange={(event) => setManualAssignToCurrentGhe(event.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      Associar automaticamente ao {currentGheName}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setIsManualFunctionModalOpen(false)}
                        className="btn-outline px-4"
                      >
                        Cancelar
                      </button>
                      <button type="button" onClick={handleManualFunctionSubmit} className="btn-primary px-4">
                        Adicionar função manual
                      </button>
                    </div>
                  </div>

                  {manualFeedback ? (
                    <p
                      className={`mt-2 text-[12px] ${
                        manualFeedback.type === "error"
                          ? "text-danger"
                          : "text-muted-foreground"
                      }`}
                    >
                      {manualFeedback.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {isInfoModalOpen ? (
            <div className="fixed -inset-6 z-50">
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
              <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
                <div className="w-full max-w-3xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[18px] font-semibold text-foreground">
                          Informações do Processo
                        </h3>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                          {currentGheName}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Preencha as informações do {currentGheName} que você acabou de montar
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInfoModalError("");
                        setIsInfoModalOpen(false);
                      }}
                      className="btn-outline px-3 py-1 text-[12px]"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="text-[12px] font-medium text-foreground">
                        Descrição Sucinta do Processo Produtivo *
                      </label>
                      <textarea
                        className={getInfoFieldClassName("processo")}
                        value={currentGhe?.info.processo ?? ""}
                        onChange={(event) =>
                          handleInfoChange("processo", event.target.value)
                        }
                        onBlur={() => markInfoTouched("processo")}
                      />
                      {touchedInfoFields.processo && infoErrors.processo ? (
                        <p className="mt-1 text-[12px] text-danger">{infoErrors.processo}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-foreground">
                        Observações do GHE *:
                      </label>
                      <textarea
                        className={getInfoFieldClassName("observacoes")}
                        value={
                          currentGhe?.info.observacoes ?? "-"
                        }
                        onChange={(event) =>
                          handleInfoChange("observacoes", event.target.value)
                        }
                        onBlur={() => markInfoTouched("observacoes")}
                      />
                      {touchedInfoFields.observacoes && infoErrors.observacoes ? (
                        <p className="mt-1 text-[12px] text-danger">{infoErrors.observacoes}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-foreground">
                        Descrição do Ambiente do GHE *:
                      </label>
                      <textarea
                        className={getInfoFieldClassName("ambiente")}
                        value={
                          currentGhe?.info.ambiente ??
                          "A ser evidenciado na fase de reconhecimento"
                        }
                        onChange={(event) =>
                          handleInfoChange("ambiente", event.target.value)
                        }
                        onBlur={() => markInfoTouched("ambiente")}
                      />
                      {touchedInfoFields.ambiente && infoErrors.ambiente ? (
                        <p className="mt-1 text-[12px] text-danger">{infoErrors.ambiente}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    {infoModalError ? (
                      <p className="mr-auto text-[12px] text-danger">{infoModalError}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setInfoModalError("");
                        setIsInfoModalOpen(false);
                      }}
                      className="btn-outline px-4"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmInfoModal}
                      className="btn-primary px-5"
                    >
                      {infoModalMode === "advance"
                        ? "Salvar e avançar"
                        : infoModalMode === "next-existing"
                          ? "Salvar e ir para próximo GHE"
                          : "Salvar e continuar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
    </>
  );
}
