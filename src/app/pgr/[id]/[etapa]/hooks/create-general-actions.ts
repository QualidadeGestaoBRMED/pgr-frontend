import { apiBlobGet, apiDelete, apiPost, apiPostForm } from "@/lib/api";
import { parseDescricaoExcel } from "../utils/descricao-import";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type {
  AnexoFile,
  AnexoItem,
  GheRisk,
  HistoryEntry,
  ParsedDescricaoImport,
  PgrFunction,
  RiskGheGroup,
} from "../types";
import type { PersistedPgrState } from "../state/runtime-cache";

type CardMeta = PersistedPgrState["cardMeta"];
type ExtraField = PersistedPgrState["extraEstabelecimentoFields"][number];

function readText(
  source: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function readNullableNumber(
  source: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function normalizeInicioDraftFromPipefy(
  source: Partial<InicioDraft> | Record<string, unknown> | undefined,
  cardMetaSource?: Record<string, unknown>
): Partial<InicioDraft> {
  const raw = (source || {}) as Record<string, unknown>;
  const syncedAtRaw = raw.syncedAt ?? raw.synced_at;
  const syncedAt = typeof syncedAtRaw === "string" ? syncedAtRaw : null;

  return {
    syncedAt,
    pipefyCardId:
      readText(raw, ["pipefyCardId", "pipefy_card_id"]) ||
      readText(cardMetaSource, ["pipefyCardId", "pipefy_card_id"]),
    documentTitle: readText(raw, ["documentTitle", "document_title", "tituloDocumento"]),
    companyName: readText(raw, ["companyName", "company_name", "empresa", "empresaNome"]),
    unitName: readText(raw, ["unitName", "unit_name", "unidade", "estabelecimentoNome"]),
    cnpj: readText(raw, ["cnpj", "companyCnpj", "empresaCnpj"]),
    responsible:
      readText(raw, [
        "responsible",
        "responsavel",
        "owner",
        "ownerName",
        "responsibleName",
        "responsible_name",
        "Responsável pela elaboração do documento (ST)",
        "Responsavel pela elaboracao do documento (ST)",
        "responsavel_pela_elaboracao_do_documento_st",
      ]) ||
      readText(cardMetaSource, ["responsibleName", "responsible_name", "ownerName"]),
    email: readText(raw, ["email", "contactEmail", "responsavelEmail"]),
    notes: readText(raw, ["notes", "observacoes", "observações"]),
  };
}

type GeneralActionsContext = {
  params: { id: string };
  initialDadosCadastrais: DadosCadastraisDraft;
  setters: {
    setInicioDraft: React.Dispatch<React.SetStateAction<InicioDraft>>;
    setDadosCadastrais: React.Dispatch<React.SetStateAction<DadosCadastraisDraft>>;
    setCardMeta: React.Dispatch<React.SetStateAction<CardMeta>>;
    setIsPipefySyncing: React.Dispatch<React.SetStateAction<boolean>>;
    setPlanActionScope: React.Dispatch<React.SetStateAction<"all" | "ghe" | "risk">>;
    setPlanActionGheId: React.Dispatch<React.SetStateAction<string>>;
    setPlanActionRiskId: React.Dispatch<React.SetStateAction<string>>;
    setPlanActionDescription: React.Dispatch<React.SetStateAction<string>>;
    setIsPlanActionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setRiskGheGroups: React.Dispatch<React.SetStateAction<RiskGheGroup[]>>;
    setEditingMedidasId: React.Dispatch<React.SetStateAction<string | null>>;
    setEditingMedidasValue: React.Dispatch<React.SetStateAction<string>>;
    setCompletedSteps: React.Dispatch<React.SetStateAction<number>>;
    setExtraEstabelecimentoFields: React.Dispatch<React.SetStateAction<ExtraField[]>>;
    setFunctionsData: React.Dispatch<React.SetStateAction<PgrFunction[]>>;
    setGheGroups: React.Dispatch<React.SetStateAction<PersistedPgrState["gheGroups"]>>;
    setCurrentGheId: React.Dispatch<React.SetStateAction<string>>;
    setCurrentRiskGheId: React.Dispatch<React.SetStateAction<string>>;
    setSelectedLeftIds: React.Dispatch<React.SetStateAction<string[]>>;
    setSelectedRightIds: React.Dispatch<React.SetStateAction<string[]>>;
    setGheSearch: React.Dispatch<React.SetStateAction<string>>;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    setGheFilterId: React.Dispatch<React.SetStateAction<"all" | string>>;
    setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
    setLastGheNotice: React.Dispatch<React.SetStateAction<{ from: string; to: string } | null>>;
    setExcelImportFeedback: React.Dispatch<
      React.SetStateAction<null | { type: "success" | "error"; message: string }>
    >;
    setIsImportingExcel: React.Dispatch<React.SetStateAction<boolean>>;
    setAnexos: React.Dispatch<React.SetStateAction<AnexoItem[]>>;
    setDraggedAnexoId: React.Dispatch<React.SetStateAction<string | null>>;
    setDragOverAnexoId: React.Dispatch<React.SetStateAction<string | null>>;
  };
  current: {
    lastCepLookupRef: React.MutableRefObject<{ empresa: string; contratante: string }>;
    planActionScope: "all" | "ghe" | "risk";
    riskGheGroups: RiskGheGroup[];
    planActionGheId: string;
    planActionRiskId: string;
    planActionDescription: string;
    completedSteps: number;
    currentIndex: number;
    nextStep: { id: string } | null;
    router: { push: (href: string) => void };
    anexos: AnexoItem[];
    dragOverAnexoId: string | null;
    draggedAnexoId: string | null;
    editingMedidasValue: string;
    stepId: string;
    allGhesDescribed: boolean;
  };
  helpers: {
    handleAdvanceApiSync: (nextCompleted: number) => void;
  };
};

export function createGeneralActions(ctx: GeneralActionsContext) {
  const {
    params,
    initialDadosCadastrais,
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

  const handleInicioDraftChange = (field: keyof InicioDraft, value: string) => {
    setInicioDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDadosCadastraisChange = (
    field: keyof DadosCadastraisDraft,
    value: string
  ) => {
    setDadosCadastrais((prev) => ({
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
      }>("/api/v1/frontend/lookup/cep", { cep });

      if (!response.found || !response.data) return;
      const payload = response.data;

      setDadosCadastrais((prev) => {
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
        inicioDraft: Partial<InicioDraft>;
        dadosCadastrais: Partial<DadosCadastraisDraft>;
        cardMeta: {
          pipefyCardId: string;
          cardName: string;
          dueDate: string;
          companyId: number | null;
          responsibleId: number | null;
        };
      }>(`/api/v1/frontend/pgr/${params.id}/sync-pipefy`);
      const rawInicioDraft = (response?.inicioDraft || {}) as Record<string, unknown>;
      const rawCardMeta = (response?.cardMeta || {}) as Record<string, unknown>;
      const normalizedInicioDraft = normalizeInicioDraftFromPipefy(
        rawInicioDraft,
        rawCardMeta
      );

      setInicioDraft((prev) => ({
        ...prev,
        ...normalizedInicioDraft,
      }));
      setDadosCadastrais({
        ...initialDadosCadastrais,
        ...(response.dadosCadastrais || {}),
      });
      if (response.cardMeta) {
        setCardMeta({
          pipefyCardId:
            readText(rawCardMeta, ["pipefyCardId", "pipefy_card_id"]) || "",
          cardName: readText(rawCardMeta, ["cardName", "card_name", "title"]) || "",
          dueDate: readText(rawCardMeta, ["dueDate", "due_date", "deadline"]) || "",
          companyId: readNullableNumber(rawCardMeta, ["companyId", "company_id"]),
          responsibleId: readNullableNumber(rawCardMeta, [
            "responsibleId",
            "responsible_id",
            "ownerId",
            "owner_id",
          ]),
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
      riskGheGroups.find((ghe) => ghe.id === planActionGheId) ??
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
    const ghe = riskGheGroups.find((item) => item.id === value);
    setPlanActionRiskId(ghe?.risks[0]?.id ?? "");
  };

  const handlePlanMedidasChange = (gheId: string, riskId: string, value: string) => {
    setRiskGheGroups((prev) =>
      prev.map((ghe) => {
        if (ghe.id !== gheId) return ghe;
        return {
          ...ghe,
          risks: ghe.risks.map((risk) =>
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
      setRiskGheGroups((prev) =>
        prev.map((ghe) => ({
          ...ghe,
          risks: ghe.risks.map((risk) =>
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

    setRiskGheGroups((prev) =>
      prev.map((ghe) => {
        const applyForGhe = planActionScope === "all" || ghe.id === planActionGheId;
        if (!applyForGhe) return ghe;

        const risks = ghe.risks.map((risk) => {
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
    setExtraEstabelecimentoFields((prev) => [
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
    setExtraEstabelecimentoFields((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveExtraField = (id: string) => {
    setExtraEstabelecimentoFields((prev) =>
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
      const imported: ParsedDescricaoImport = await parseDescricaoExcel(file);
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
      const rawMessage =
        error instanceof Error
          ? error.message
          : "Não foi possível importar essa planilha.";
      const message = /^arquivo inválido:/i.test(rawMessage)
        ? rawMessage
        : `Arquivo inválido: ${rawMessage}`;
      setExcelImportFeedback({
        type: "error",
        message,
      });
    } finally {
      setIsImportingExcel(false);
    }
  };

  const handleAddManualFunction = (payload: {
    setor: string;
    funcao: string;
    descricao: string;
    assignToCurrentGhe?: boolean;
    gheId?: string;
    funcionarios?: string;
  }) => {
    const setor = payload.setor.trim();
    const funcao = payload.funcao.trim();
    const descricao = payload.descricao.trim() || funcao;
    if (!funcao) {
      throw new Error("Informe ao menos a Função para cadastro manual.");
    }

    let createdFunctionId = "";
    const normalizedKey = `${setor}||${funcao}||${descricao}`.toLowerCase();

    setFunctionsData((prev) => {
      const existing = prev.find(
        (item) =>
          `${(item.setor || "").trim()}||${(item.funcao || "").trim()}||${(
            item.descricao || ""
          ).trim()}`.toLowerCase() === normalizedKey
      );
      if (existing) {
        createdFunctionId = existing.id;
        return prev;
      }

      createdFunctionId = `func-manual-${Date.now()}-${prev.length + 1}`;
      return [
        ...prev,
        {
          id: createdFunctionId,
          setor,
          funcao,
          descricao,
        },
      ];
    });

    if (!payload.assignToCurrentGhe || !payload.gheId || !createdFunctionId) {
      return;
    }

    setGheGroups((prev) =>
      prev.map((ghe) => {
        if (ghe.id !== payload.gheId) return ghe;
        if (ghe.items.some((item) => item.functionId === createdFunctionId)) return ghe;
        return {
          ...ghe,
          items: [
            ...ghe.items,
            {
              functionId: createdFunctionId,
              funcionarios: (payload.funcionarios || "").trim(),
            },
          ],
        };
      })
    );
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
            url?: string;
          };
        }>(`/api/v1/frontend/pgr/${params.id}/attachments/upload`, formData);

        if (!response?.ok || !response.file) return;

        const uploadedFile: AnexoFile = {
          ...response.file,
          name: response.file.name,
        };
        setAnexos((prev) =>
          prev.map((anexo) =>
            anexo.id === anexoId
              ? { ...anexo, files: [...anexo.files, uploadedFile] }
              : anexo
          )
        );
      })
    ).catch(() => {
      // Mantém a UI estável mesmo com erro de upload.
    });
  };

  const handleAnexoFileRename = (anexoId: string, fileId: string, value: string) => {
    setAnexos((prev) =>
      prev.map((anexo) =>
        anexo.id === anexoId
          ? {
              ...anexo,
              files: anexo.files.map((file) =>
                file.id === fileId ? { ...file, name: value } : file
              ),
            }
          : anexo
      )
    );
  };

  const handleAnexoFileRemove = (anexoId: string, fileId: string) => {
    void apiDelete<{ ok: boolean }>(`/api/v1/frontend/pgr/${params.id}/attachments/${fileId}`)
      .catch(() => ({ ok: false }))
      .finally(() => {
        setAnexos((prev) =>
          prev.map((anexo) =>
            anexo.id === anexoId
              ? { ...anexo, files: anexo.files.filter((f) => f.id !== fileId) }
              : anexo
          )
        );
      });
  };

  const handleAnexoFileDownload = (fileId: string, fileName: string) => {
    void apiBlobGet(`/api/v1/frontend/pgr/${params.id}/attachments/${fileId}/download`)
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
    setAnexos((prev) => [
      ...prev,
      {
        id: `anexo-${Date.now()}-${nextIndex}`,
        title: `Novo anexo ${nextIndex}`,
        files: [],
      },
    ]);
  };

  const handleMoveAnexo = (anexoId: string, direction: "up" | "down") => {
    setAnexos((prev) => {
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
    setAnexos((prev) =>
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
    setAnexos((prev) => {
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
    handleAddManualFunction,
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
