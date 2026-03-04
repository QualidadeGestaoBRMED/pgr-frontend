import { apiBlobGet, apiDelete, apiPost, apiPostForm } from "@/lib/api";
import { parseDescricaoExcel } from "../utils/descricao-import";

export function createGeneralActions(ctx: any) {
  const {
    params,
    initialDadosCadastrais,
    apiState,
    setters,
    current,
    helpers,
  } = ctx;

  const {
    setInicioDraft,
    setDadosCadastrais,
    setCardMeta,
    setIsPipefySyncing,
    setPlanActionScope,
    setPlanActionGheId,
    setPlanActionRiskId,
    setPlanActionDescription,
    setIsPlanActionModalOpen,
    setRiskGheGroups,
    setEditingMedidasId,
    setEditingMedidasValue,
    setCompletedSteps,
    setExtraEstabelecimentoFields,
    setFunctionsData,
    setGheGroups,
    setCurrentGheId,
    setCurrentRiskGheId,
    setSelectedLeftIds,
    setSelectedRightIds,
    setGheSearch,
    setSearchTerm,
    setGheFilterId,
    setHistory,
    setLastGheNotice,
    setExcelImportFeedback,
    setIsImportingExcel,
    setAnexos,
    setDraggedAnexoId,
    setDragOverAnexoId,
  } = setters;

  const {
    lastCepLookupRef,
    planActionScope,
    riskGheGroups,
    planActionGheId,
    planActionRiskId,
    planActionDescription,
    completedSteps,
    currentIndex,
    nextStep,
    router,
    anexos,
    dragOverAnexoId,
    draggedAnexoId,
  } = current;

  const { handleAdvanceApiSync } = helpers;

  const handleInicioDraftChange = (field: string, value: string) => {
    setInicioDraft((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDadosCadastraisChange = (field: string, value: string) => {
    setDadosCadastrais((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRecalculateByCep = async (
    scope: "empresa" | "contratante",
    cepValue: string
  ) => {
    const cep = cepValue.replace(/\D/g, "");
    if (cep.length !== 8) {
      lastCepLookupRef.current[scope] = "";
      return;
    }
    if (lastCepLookupRef.current[scope] === cep) return;
    lastCepLookupRef.current[scope] = cep;

    try {
      const response = await apiPost<{
        found: boolean;
        data?: {
          cep?: string;
          logradouro?: string;
          localidade?: string;
          uf?: string;
        };
      }>("/api/frontend/lookup/cep", { cep });

      if (!response.found || !response.data) return;
      const payload = response.data;

      setDadosCadastrais((prev: any) => {
        if (scope === "empresa") {
          return {
            ...prev,
            empresaCep: payload.cep || prev.empresaCep,
            empresaEndereco: payload.logradouro || prev.empresaEndereco,
            empresaCidade: payload.localidade || prev.empresaCidade,
            empresaEstado: payload.uf || prev.empresaEstado,
          };
        }

        return {
          ...prev,
          contratanteCep: payload.cep || prev.contratanteCep,
          contratanteEndereco: payload.logradouro || prev.contratanteEndereco,
          contratanteCidade: payload.localidade || prev.contratanteCidade,
          contratanteEstado: payload.uf || prev.contratanteEstado,
        };
      });
    } catch {
      lastCepLookupRef.current[scope] = "";
    }
  };

  const handleLoadPipefyMock = async () => {
    setIsPipefySyncing(true);
    try {
      const response = await apiPost<{
        inicioDraft: any;
        dadosCadastrais: any;
        cardMeta: {
          pipefyCardId: string;
          cardName: string;
          dueDate: string;
          companyId: number | null;
          responsibleId: number | null;
        };
      }>(`/api/frontend/pgr/${params.id}/sync-pipefy`);
      setInicioDraft((prev: any) => ({
        ...prev,
        ...(response.inicioDraft || {}),
      }));
      setDadosCadastrais({
        ...initialDadosCadastrais,
        ...(response.dadosCadastrais || {}),
      });
      if (response.cardMeta) {
        setCardMeta({
          pipefyCardId: response.cardMeta.pipefyCardId || "",
          cardName: response.cardMeta.cardName || "",
          dueDate: response.cardMeta.dueDate || "",
          companyId: response.cardMeta.companyId ?? null,
          responsibleId: response.cardMeta.responsibleId ?? null,
        });
      }
    } finally {
      setIsPipefySyncing(false);
    }
  };

  const handleOpenPlanActionModal = () => {
    const firstGhe = riskGheGroups[0];
    const firstRisk = firstGhe?.risks[0];
    setPlanActionScope(firstRisk ? "risk" : firstGhe ? "ghe" : "all");
    setPlanActionGheId(firstGhe?.id ?? "");
    setPlanActionRiskId(firstRisk?.id ?? "");
    setPlanActionDescription("");
    setIsPlanActionModalOpen(true);
  };

  const handleChangePlanActionScope = (scope: "all" | "ghe" | "risk") => {
    setPlanActionScope(scope);
    if (scope === "all") return;
    const currentGhe =
      riskGheGroups.find((ghe: any) => ghe.id === planActionGheId) ??
      riskGheGroups[0];
    const gheId = currentGhe?.id ?? "";
    setPlanActionGheId(gheId);
    if (scope === "risk") {
      setPlanActionRiskId(currentGhe?.risks[0]?.id ?? "");
    }
  };

  const handlePlanActionGheChange = (value: string) => {
    setPlanActionGheId(value);
    if (planActionScope !== "risk") return;
    const ghe = riskGheGroups.find((item: any) => item.id === value);
    setPlanActionRiskId(ghe?.risks[0]?.id ?? "");
  };

  const handlePlanMedidasChange = (gheId: string, riskId: string, value: string) => {
    setRiskGheGroups((prev: any[]) =>
      prev.map((ghe) => {
        if (ghe.id !== gheId) return ghe;
        return {
          ...ghe,
          risks: ghe.risks.map((risk: any) =>
            risk.id === riskId ? { ...risk, medidasControle: value } : risk
          ),
        };
      })
    );
  };

  const handleEditMedidasStart = (rowId: string, value: string) => {
    setEditingMedidasId(rowId);
    setEditingMedidasValue(value);
  };

  const handleEditMedidasCancel = () => {
    setEditingMedidasId(null);
    setEditingMedidasValue("");
  };

  const handleEditMedidasSave = (
    gheId: string,
    riskId: string,
    groupTargets?: Array<{ gheId: string; riskId: string }>
  ) => {
    const nextValue = ctx.current.editingMedidasValue.trim();
    if (Array.isArray(groupTargets) && groupTargets.length) {
      const targetKeys = new Set(groupTargets.map((target) => `${target.gheId}::${target.riskId}`));
      setRiskGheGroups((prev: any[]) =>
        prev.map((ghe) => ({
          ...ghe,
          risks: ghe.risks.map((risk: any) =>
            targetKeys.has(`${ghe.id}::${risk.id}`)
              ? { ...risk, medidasControle: nextValue }
              : risk
          ),
        }))
      );
    } else {
      handlePlanMedidasChange(gheId, riskId, nextValue);
    }
    setEditingMedidasId(null);
    setEditingMedidasValue("");
  };

  const handleSavePlanActionModal = () => {
    const actionDescription = planActionDescription.trim();
    if (!actionDescription) return;

    const mergeMedidas = (previous: string, nextValue: string) => {
      const currentValue = previous.trim();
      if (!currentValue) return nextValue;
      const existsAlready = currentValue
        .split("\n")
        .map((line) => line.trim())
        .includes(nextValue);
      if (existsAlready) return currentValue;
      return `${currentValue}\n${nextValue}`;
    };

    setRiskGheGroups((prev: any[]) =>
      prev.map((ghe) => {
        const applyForGhe = planActionScope === "all" || ghe.id === planActionGheId;
        if (!applyForGhe) return ghe;

        const risks = ghe.risks.map((risk: any) => {
          const applyForRisk =
            planActionScope !== "risk" || risk.id === planActionRiskId;
          if (!applyForRisk) return risk;

          return {
            ...risk,
            medidasControle: mergeMedidas(risk.medidasControle || "", actionDescription),
          };
        });

        return { ...ghe, risks };
      })
    );

    setPlanActionDescription("");
    setIsPlanActionModalOpen(false);
  };

  const handleAdvance = () => {
    if (ctx.current.stepId === "descricao" && !ctx.current.allGhesDescribed) return;
    const nextCompleted = Math.max(completedSteps, currentIndex + 1);
    setCompletedSteps(nextCompleted);
    handleAdvanceApiSync(nextCompleted);
    if (nextStep) {
      router.push(`/pgr/${params.id}/${nextStep.id}`);
    }
  };

  const handleAddExtraField = (
    scope: "empresa" | "estabelecimento" | "contratante"
  ) => {
    setExtraEstabelecimentoFields((prev: any[]) => [
      ...prev,
      {
        id: `${scope}-field-${Date.now()}-${prev.length + 1}`,
        title: "",
        value: "",
        scope,
      },
    ]);
  };

  const handleExtraEstabelecimentoFieldChange = (
    id: string,
    field: "title" | "value",
    value: string
  ) => {
    setExtraEstabelecimentoFields((prev: any[]) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveExtraField = (id: string) => {
    setExtraEstabelecimentoFields((prev: any[]) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const handleDescricaoExcelChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setExcelImportFeedback(null);
    setIsImportingExcel(true);
    try {
      const imported = await parseDescricaoExcel(file);
      setFunctionsData(imported.functions);
      setGheGroups(imported.gheGroups);
      setCurrentGheId(imported.gheGroups[0]?.id ?? "ghe-1");
      setRiskGheGroups(imported.riskGheGroups);
      setCurrentRiskGheId(imported.riskGheGroups[0]?.id ?? "ghe-1");
      setSelectedLeftIds([]);
      setSelectedRightIds([]);
      setGheSearch("");
      setSearchTerm("");
      setGheFilterId("all");
      setHistory([]);
      setLastGheNotice(null);
      setExcelImportFeedback({
        type: "success",
        message: `Planilha importada: ${imported.functions.length} funções e ${imported.gheGroups.length} GHEs.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível importar essa planilha.";
      setExcelImportFeedback({
        type: "error",
        message,
      });
    } finally {
      setIsImportingExcel(false);
    }
  };

  const maskDate = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const parts = [];
    if (digits.length >= 2) {
      parts.push(digits.slice(0, 2));
    } else if (digits.length > 0) {
      parts.push(digits);
    }
    if (digits.length >= 4) {
      parts.push(digits.slice(2, 4));
    } else if (digits.length > 2) {
      parts.push(digits.slice(2));
    }
    if (digits.length > 4) {
      parts.push(digits.slice(4));
    }
    return parts.join("/");
  };

  const handleAnexoFiles = (anexoId: string, files: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files).filter((file) =>
      file.name.toLowerCase().endsWith(".pdf")
    );
    if (!selectedFiles.length) return;

    void Promise.all(
      selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("anexoId", anexoId);
        formData.append("file", file);

        const response = await apiPostForm<{
          ok: boolean;
          file: {
            id: string;
            name: string;
            originalName: string;
            sizeBytes: number;
            uploadedAt: string;
          };
        }>(`/api/frontend/pgr/${params.id}/attachments/upload`, formData);

        if (!response?.ok || !response.file) return;

        setAnexos((prev: any[]) =>
          prev.map((anexo) =>
            anexo.id === anexoId
              ? { ...anexo, files: [...anexo.files, response.file] }
              : anexo
          )
        );
      })
    ).catch(() => {
      // Mantém a UI estável mesmo com erro de upload.
    });
  };

  const handleAnexoFileRename = (anexoId: string, fileId: string, value: string) => {
    setAnexos((prev: any[]) =>
      prev.map((anexo) =>
        anexo.id === anexoId
          ? {
              ...anexo,
              files: anexo.files.map((file: any) =>
                file.id === fileId ? { ...file, name: value } : file
              ),
            }
          : anexo
      )
    );
  };

  const handleAnexoFileRemove = (anexoId: string, fileId: string) => {
    void apiDelete<{ ok: boolean }>(`/api/frontend/pgr/${params.id}/attachments/${fileId}`)
      .catch(() => ({ ok: false }))
      .finally(() => {
        setAnexos((prev: any[]) =>
          prev.map((anexo) =>
            anexo.id === anexoId
              ? { ...anexo, files: anexo.files.filter((f: any) => f.id !== fileId) }
              : anexo
          )
        );
      });
  };

  const handleAnexoFileDownload = (fileId: string, fileName: string) => {
    void apiBlobGet(`/api/frontend/pgr/${params.id}/attachments/${fileId}/download`)
      .then((blob) => {
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `${fileName || "anexo"}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl);
        }, 200);
      })
      .catch(() => {
        // Falha de download não deve quebrar a navegação da página.
      });
  };

  const handleAddAnexo = () => {
    const nextIndex = anexos.length + 1;
    setAnexos((prev: any[]) => [
      ...prev,
      {
        id: `anexo-${Date.now()}-${nextIndex}`,
        title: `Novo anexo ${nextIndex}`,
        files: [],
      },
    ]);
  };

  const handleMoveAnexo = (anexoId: string, direction: "up" | "down") => {
    setAnexos((prev: any[]) => {
      const index = prev.findIndex((item) => item.id === anexoId);
      if (index === -1) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const handleRenameAnexoTitle = (anexoId: string, value: string) => {
    setAnexos((prev: any[]) =>
      prev.map((anexo) => (anexo.id === anexoId ? { ...anexo, title: value } : anexo))
    );
  };

  const handleAnexoDragStart = (anexoId: string) => {
    setDraggedAnexoId(anexoId);
  };

  const handleAnexoDragOver = (event: React.DragEvent, anexoId: string) => {
    event.preventDefault();
    if (anexoId !== dragOverAnexoId) {
      setDragOverAnexoId(anexoId);
    }
  };

  const handleAnexoDrop = (anexoId: string) => {
    if (!draggedAnexoId || draggedAnexoId === anexoId) {
      setDragOverAnexoId(null);
      return;
    }
    setAnexos((prev: any[]) => {
      const fromIndex = prev.findIndex((item) => item.id === draggedAnexoId);
      const toIndex = prev.findIndex((item) => item.id === anexoId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
    setDragOverAnexoId(null);
  };

  const handleAnexoDragEnd = () => {
    setDraggedAnexoId(null);
    setDragOverAnexoId(null);
  };

  return {
    handleInicioDraftChange,
    handleDadosCadastraisChange,
    handleRecalculateByCep,
    handleLoadPipefyMock,
    handleOpenPlanActionModal,
    handleChangePlanActionScope,
    handlePlanActionGheChange,
    handleEditMedidasStart,
    handleEditMedidasCancel,
    handleEditMedidasSave,
    handleSavePlanActionModal,
    handleAdvance,
    handleAddExtraField,
    handleExtraEstabelecimentoFieldChange,
    handleRemoveExtraField,
    handleDescricaoExcelChange,
    maskDate,
    handleAnexoFiles,
    handleAnexoFileRename,
    handleAnexoFileRemove,
    handleAnexoFileDownload,
    handleAddAnexo,
    handleMoveAnexo,
    handleRenameAnexoTitle,
    handleAnexoDragStart,
    handleAnexoDragOver,
    handleAnexoDrop,
    handleAnexoDragEnd,
  };
}
