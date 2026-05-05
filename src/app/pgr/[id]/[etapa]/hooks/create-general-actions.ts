import { apiBlobGet, apiDelete, apiPost, apiPostForm } from "@/lib/api";
import {
  DescricaoImportMissingRequiredFieldsError,
  parseDescricaoExcel,
} from "../utils/descricao-import";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type {
  AnexoFile,
  AnexoItem,
  ExcelImportFeedback,
  GheRisk,
  HistoryEntry,
  ParsedDescricaoImport,
  PgrFunction,
  RiskGheGroup,
} from "../types";
import type { PersistedPgrState } from "../state/runtime-cache";
import {
  maskCep,
  maskCnpj,
  maskCpf,
  maskPhoneBr,
  normalizeEmail,
  normalizeRiskGrade,
} from "../validation/br-field-utils";
import {
  createEmptyContratante,
  createEmptyResponsavelCoordenacaoTecnica,
  normalizeContractors,
  normalizeResponsaveisCoordenacaoTecnica,
  syncLegacyContractorFields,
} from "../utils/contractors";

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
    setRemovedPlanRiskKeys: React.Dispatch<React.SetStateAction<string[]>>;
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
      React.SetStateAction<null | ExcelImportFeedback>
    >;
    setIsImportingExcel: React.Dispatch<React.SetStateAction<boolean>>;
    setAnexos: React.Dispatch<React.SetStateAction<AnexoItem[]>>;
    setDraggedAnexoId: React.Dispatch<React.SetStateAction<string | null>>;
    setDragOverAnexoId: React.Dispatch<React.SetStateAction<string | null>>;
  };
  current: {
    lastCepLookupRef: React.MutableRefObject<{
      empresa: string;
      contratanteByIndex: Record<string, string>;
    }>;
    functionsData: PgrFunction[];
    gheGroups: PersistedPgrState["gheGroups"];
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
    setRemovedPlanRiskKeys,
    setEditingMedidasId,
    setEditingMedidasValue,
    setCompletedSteps,
    setExtraEstabelecimentoFields,
    setFunctionsData,
    setGheGroups,
    setExcelImportFeedback,
    setIsImportingExcel,
    setAnexos,
    setDraggedAnexoId,
    setDragOverAnexoId,
  } = setters;

  const {
    lastCepLookupRef,
    functionsData,
    gheGroups,
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
    const normalizedValue =
      field === "cnpj"
        ? maskCnpj(value)
        : field === "email"
          ? normalizeEmail(value)
          : value;
    setInicioDraft((prev) => ({
      ...prev,
      [field]: normalizedValue,
    }));
  };

  const handleDadosCadastraisChange = (
    field: keyof DadosCadastraisDraft,
    value: string
  ) => {
    const normalizedValue = (() => {
      switch (field) {
        case "empresaCnpj":
        case "estabelecimentoCnpj":
        case "contratanteCnpj":
          return maskCnpj(value);
        case "responsavelPgrCpf":
          return maskCpf(value);
        case "responsavelPgrTelefone":
          return maskPhoneBr(value);
        case "empresaCep":
        case "contratanteCep":
          return maskCep(value);
        case "responsavelPgrEmail":
          return normalizeEmail(value);
        case "empresaGrauRisco":
        case "estabelecimentoGrauRisco":
        case "contratanteGrauRisco":
          return normalizeRiskGrade(value);
        default:
          return value;
      }
    })();

    setDadosCadastrais((prev) => {
      const next = { ...prev, [field]: normalizedValue };
      if (
        field.startsWith("contratante") &&
        Array.isArray(prev.contratantes) &&
        prev.contratantes.length
      ) {
        const first = prev.contratantes[0];
        const updatedFirst = {
          ...first,
          ...(field === "contratanteNomeFantasia" ? { nomeFantasia: normalizedValue } : {}),
          ...(field === "contratanteRazaoSocial" ? { razaoSocial: normalizedValue } : {}),
          ...(field === "contratanteCnpj" ? { cnpj: normalizedValue } : {}),
          ...(field === "contratanteCnae" ? { cnae: normalizedValue } : {}),
          ...(field === "contratanteEndereco" ? { endereco: normalizedValue } : {}),
          ...(field === "contratanteCep" ? { cep: normalizedValue } : {}),
          ...(field === "contratanteCidade" ? { cidade: normalizedValue } : {}),
          ...(field === "contratanteEstado" ? { estado: normalizedValue } : {}),
          ...(field === "contratanteGrauRisco" ? { grauRisco: normalizedValue } : {}),
          ...(field === "contratanteAtividadePrincipal"
            ? { atividadePrincipal: normalizedValue }
            : {}),
        };
        next.contratantes = [updatedFirst, ...prev.contratantes.slice(1)];
      }
      return syncLegacyContractorFields(next);
    });
  };

  const handleRecalculateByCep = async (
    scope: "empresa" | "contratante",
    cepValue: string,
    contractorIndex = 0
  ) => {
    const cep = cepValue.replace(/\D/g, "");
    if (cep.length !== 8) {
      if (scope === "empresa") {
        lastCepLookupRef.current.empresa = "";
      } else {
        lastCepLookupRef.current.contratanteByIndex[String(contractorIndex)] = "";
      }
      return;
    }
    if (scope === "empresa" && lastCepLookupRef.current.empresa === cep) return;
    if (
      scope === "contratante" &&
      lastCepLookupRef.current.contratanteByIndex[String(contractorIndex)] === cep
    ) {
      return;
    }

    if (scope === "empresa") {
      lastCepLookupRef.current.empresa = cep;
    } else {
      lastCepLookupRef.current.contratanteByIndex[String(contractorIndex)] = cep;
    }

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
            empresaCep: maskCep(payload.cep || prev.empresaCep),
            empresaEndereco: payload.logradouro || prev.empresaEndereco,
            empresaCidade: payload.localidade || prev.empresaCidade,
            empresaEstado: payload.uf || prev.empresaEstado,
          };
        }

        const contractors = normalizeContractors(prev);
        const safeIndex = Math.max(0, Math.min(contractorIndex, contractors.length - 1));
        const nextContractors = contractors.map((contractor, index) =>
          index === safeIndex
            ? {
                ...contractor,
                cep: maskCep(payload.cep || contractor.cep),
                endereco: payload.logradouro || contractor.endereco,
                cidade: payload.localidade || contractor.cidade,
                estado: payload.uf || contractor.estado,
              }
            : contractor
        );

        return syncLegacyContractorFields({
          ...prev,
          contratantes: nextContractors,
        });
      });
    } catch {
      if (scope === "empresa") {
        lastCepLookupRef.current.empresa = "";
      } else {
        lastCepLookupRef.current.contratanteByIndex[String(contractorIndex)] = "";
      }
    }
  };

  const handleContractorChange = (
    contractorIndex: number,
    field: keyof Omit<
      DadosCadastraisDraft["contratantes"][number],
      "id"
    >,
    value: string
  ) => {
    const normalizedValue = (() => {
      switch (field) {
        case "cnpj":
          return maskCnpj(value);
        case "cep":
          return maskCep(value);
        case "grauRisco":
          return normalizeRiskGrade(value);
        default:
          return value;
      }
    })();

    setDadosCadastrais((prev) => {
      const contractors = normalizeContractors(prev);
      const safeIndex = Math.max(0, Math.min(contractorIndex, contractors.length - 1));
      const nextContractors = contractors.map((contractor, index) =>
        index === safeIndex ? { ...contractor, [field]: normalizedValue } : contractor
      );
      return syncLegacyContractorFields({
        ...prev,
        contratantes: nextContractors,
      });
    });
  };

  const handleAddContractor = () => {
    setDadosCadastrais((prev) =>
      syncLegacyContractorFields({
        ...prev,
        contratantes: [...normalizeContractors(prev), createEmptyContratante()],
      })
    );
  };

  const handleDuplicateContractor = (contractorIndex: number) => {
    setDadosCadastrais((prev) => {
      const contractors = normalizeContractors(prev);
      const source = contractors[contractorIndex];
      if (!source) return prev;
      const duplicated = {
        ...source,
        id: createEmptyContratante().id,
      };
      const next = [...contractors];
      next.splice(contractorIndex + 1, 0, duplicated);
      return syncLegacyContractorFields({ ...prev, contratantes: next });
    });
  };

  const handleRemoveContractor = (contractorIndex: number) => {
    setDadosCadastrais((prev) => {
      const contractors = normalizeContractors(prev);
      const next = contractors.filter((_, index) => index !== contractorIndex);
      if (!next.length) {
        return syncLegacyContractorFields({
          ...prev,
          contratantes: [],
          contratanteNomeFantasia: "",
          contratanteRazaoSocial: "",
          contratanteCnpj: "",
          contratanteCnae: "",
          contratanteEndereco: "",
          contratanteCep: "",
          contratanteCidade: "",
          contratanteEstado: "",
          contratanteGrauRisco: "",
          contratanteAtividadePrincipal: "",
        });
      }
      return syncLegacyContractorFields({ ...prev, contratantes: next });
    });
  };

  const handleTechnicalCoordinatorChange = (
    coordinatorIndex: number,
    field: keyof Omit<
      DadosCadastraisDraft["responsaveisCoordenacaoTecnica"][number],
      "id"
    >,
    value: string
  ) => {
    const normalizedValue = (() => {
      switch (field) {
        case "cpf":
          return maskCpf(value);
        case "telefone":
          return maskPhoneBr(value);
        case "email":
          return normalizeEmail(value);
        default:
          return value;
      }
    })();

    setDadosCadastrais((prev) => {
      const coordinators = normalizeResponsaveisCoordenacaoTecnica(prev);
      const safeIndex = Math.max(0, Math.min(coordinatorIndex, coordinators.length - 1));
      const nextCoordinators = coordinators.map((coordinator, index) =>
        index === safeIndex ? { ...coordinator, [field]: normalizedValue } : coordinator
      );
      return syncLegacyContractorFields({
        ...prev,
        responsaveisCoordenacaoTecnica: nextCoordinators,
      });
    });
  };

  const handleAddTechnicalCoordinator = () => {
    setDadosCadastrais((prev) =>
      syncLegacyContractorFields({
        ...prev,
        responsaveisCoordenacaoTecnica: [
          ...normalizeResponsaveisCoordenacaoTecnica(prev),
          createEmptyResponsavelCoordenacaoTecnica(),
        ],
      })
    );
  };

  const handleRemoveTechnicalCoordinator = (coordinatorIndex: number) => {
    setDadosCadastrais((prev) => {
      const coordinators = normalizeResponsaveisCoordenacaoTecnica(prev);
      const next = coordinators.filter((_, index) => index !== coordinatorIndex);
      return syncLegacyContractorFields({
        ...prev,
        responsaveisCoordenacaoTecnica: next,
      });
    });
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
      setDadosCadastrais(
        syncLegacyContractorFields({
          ...initialDadosCadastrais,
          ...(response.dadosCadastrais || {}),
        })
      );
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

  const handlePlanMedidasChange = (
    gheId: string,
    riskId: string,
    value: string,
    groupTargets?: Array<{ gheId: string; riskId: string }>
  ) => {
    if (Array.isArray(groupTargets) && groupTargets.length) {
      const targetKeys = new Set(
        groupTargets.map((target) => `${target.gheId}::${target.riskId}`)
      );
      setRiskGheGroups((prev) =>
        prev.map((ghe) => ({
          ...ghe,
          risks: ghe.risks.map((risk) =>
            targetKeys.has(`${ghe.id}::${risk.id}`)
              ? { ...risk, medidasControle: value }
              : risk
          ),
        }))
      );
      return;
    }

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
    handlePlanMedidasChange(gheId, riskId, nextValue, groupTargets);
    setEditingMedidasId(null);
    setEditingMedidasValue("");
  };

  const handleDeleteMedidas = (
    gheId: string,
    riskId: string,
    groupTargets?: Array<{ gheId: string; riskId: string }>
  ) => {
    const keysToExclude = Array.isArray(groupTargets) && groupTargets.length
      ? groupTargets.map((target) => `${target.gheId}::${target.riskId}`)
      : [`${gheId}::${riskId}`];
    setRemovedPlanRiskKeys((prev) => Array.from(new Set([...prev, ...keysToExclude])));
    setEditingMedidasId(null);
    setEditingMedidasValue("");
  };

  const handleSavePlanActionModal = (options?: { riskIds?: string[]; gheIds?: string[] }) => {
    const actionDescription = planActionDescription.trim();
    if (!actionDescription) return;
    const riskIds = options?.riskIds;
    const gheIds = options?.gheIds;
    const selectedRiskIds = new Set(
      (Array.isArray(riskIds) && riskIds.length ? riskIds : [planActionRiskId]).filter(Boolean)
    );
    const fallbackGheIds =
      planActionScope === "all"
        ? riskGheGroups.map((ghe) => ghe.id)
        : [planActionGheId];
    const selectedGheIds = new Set(
      (Array.isArray(gheIds) && gheIds.length ? gheIds : fallbackGheIds).filter(Boolean)
    );
    if (planActionScope === "risk" && selectedRiskIds.size === 0) return;
    if (planActionScope === "risk" && selectedGheIds.size === 0) return;

    const getRiskContentKey = (risk: GheRisk) =>
      [risk.descricaoAgente, risk.classificacao]
        .map((value) => String(value || "").trim().toLowerCase())
        .join("||");
    const selectedRiskContentKeys = new Set<string>();
    if (planActionScope === "risk") {
      riskGheGroups.forEach((ghe) => {
        ghe.risks.forEach((risk) => {
          if (!selectedRiskIds.has(risk.id)) return;
          selectedRiskContentKeys.add(getRiskContentKey(risk));
        });
      });
    }

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

    const touchedKeys = new Set<string>();
    setRiskGheGroups((prev) =>
      prev.map((ghe) => {
        const applyForGhe =
          (planActionScope === "all" && selectedGheIds.has(ghe.id)) ||
          (planActionScope === "ghe" && ghe.id === planActionGheId) ||
          (planActionScope === "risk" && selectedGheIds.has(ghe.id));
        if (!applyForGhe) return ghe;

        const risks = ghe.risks.map((risk) => {
          const applyForRisk = (() => {
            if (planActionScope !== "risk") return true;
            if (selectedRiskIds.has(risk.id)) return true;
            return selectedRiskContentKeys.has(getRiskContentKey(risk));
          })();
          if (!applyForRisk) return risk;
          touchedKeys.add(`${ghe.id}::${risk.id}`);

          return {
            ...risk,
            medidasControle: mergeMedidas(risk.medidasControle || "", actionDescription),
          };
        });

        return { ...ghe, risks };
      })
    );

    if (touchedKeys.size > 0) {
      setRemovedPlanRiskKeys((prev) =>
        prev.filter((key) => !touchedKeys.has(key))
      );
    }

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

      const normalizeFunctionKey = (setor: string, funcao: string) =>
        `${setor.trim().toLowerCase()}||${funcao.trim().toLowerCase()}`;
      const normalizeGheName = (name: string) => name.trim().toLowerCase();
      const parseNonNegativeInteger = (value: string | number | null | undefined) => {
        const parsed = Number.parseInt(String(value ?? "").replace(/[^\d-]/g, ""), 10);
        return Number.isFinite(parsed) && !Number.isNaN(parsed) ? Math.max(0, parsed) : 0;
      };

      const existingFunctionIdByKey = new Map<string, string>();
      functionsData.forEach((item) => {
        const key = normalizeFunctionKey(item.setor || "", item.funcao || "");
        if (!existingFunctionIdByKey.has(key)) {
          existingFunctionIdByKey.set(key, item.id);
        }
      });
      const existingIds = new Set(functionsData.map((item) => item.id));
      const importSeenKeys = new Map<string, string>();
      const importedFunctionIdToFinalId = new Map<string, string>();
      const importedQuantitativoByFinalFunctionId = new Map<string, number>();
      const importedUniqueFunctions: PgrFunction[] = [];
      let skippedExistingCount = 0;
      let skippedDuplicatedInFileCount = 0;
      const importBatchSeed = Date.now();
      const incrementImportedQuantitativo = (functionId: string, value: number) => {
        if (!functionId || value <= 0) return;
        importedQuantitativoByFinalFunctionId.set(
          functionId,
          (importedQuantitativoByFinalFunctionId.get(functionId) ?? 0) + value
        );
      };

      imported.functions.forEach((item, index) => {
        const setor = String(item.setor || "").trim();
        const funcao = String(item.funcao || "").trim();
        const descricao = String(item.descricao || "").trim() || funcao;
        const importedQuantitativo = parseNonNegativeInteger(item.quantitativo);
        const key = normalizeFunctionKey(setor, funcao);
        const existingFunctionId = existingFunctionIdByKey.get(key);

        if (existingFunctionId) {
          importedFunctionIdToFinalId.set(item.id, existingFunctionId);
          incrementImportedQuantitativo(existingFunctionId, importedQuantitativo);
          skippedExistingCount += 1;
          return;
        }

        const seenFunctionId = importSeenKeys.get(key);
        if (seenFunctionId) {
          importedFunctionIdToFinalId.set(item.id, seenFunctionId);
          incrementImportedQuantitativo(seenFunctionId, importedQuantitativo);
          skippedDuplicatedInFileCount += 1;
          return;
        }

        let idCandidate = `func-import-${importBatchSeed}-${index + 1}`;
        let idRetry = 1;
        while (existingIds.has(idCandidate)) {
          idRetry += 1;
          idCandidate = `func-import-${importBatchSeed}-${index + 1}-${idRetry}`;
        }
        existingIds.add(idCandidate);
        importSeenKeys.set(key, idCandidate);
        existingFunctionIdByKey.set(key, idCandidate);
        importedFunctionIdToFinalId.set(item.id, idCandidate);
        incrementImportedQuantitativo(idCandidate, importedQuantitativo);

        importedUniqueFunctions.push({
          id: idCandidate,
          setor,
          funcao,
          descricao,
          quantitativo: "0",
        });
      });

      const importedUniqueFunctionsWithQuantitativo = importedUniqueFunctions.map((item) => ({
        ...item,
        quantitativo: String(importedQuantitativoByFinalFunctionId.get(item.id) ?? 0),
      }));

      if (importedUniqueFunctionsWithQuantitativo.length || importedQuantitativoByFinalFunctionId.size) {
        setFunctionsData((prev) => {
          const updatedExisting = prev.map((item) => {
            const importedQuantitativo = importedQuantitativoByFinalFunctionId.get(item.id);
            if (!importedQuantitativo) return item;
            const currentQuantitativo = parseNonNegativeInteger(item.quantitativo);
            return {
              ...item,
              quantitativo: String(currentQuantitativo + importedQuantitativo),
            };
          });
          return importedUniqueFunctionsWithQuantitativo.length
            ? [...updatedExisting, ...importedUniqueFunctionsWithQuantitativo]
            : updatedExisting;
        });
      }

      const importedAssignmentsByGhe = new Map<string, {
        name: string;
        totalByFunctionId: Map<string, number>;
      }>();
      imported.gheGroups.forEach((ghe) => {
        const gheName = String(ghe.name || "").trim();
        if (!gheName) return;
        const normalizedName = normalizeGheName(gheName);
        const existing =
          importedAssignmentsByGhe.get(normalizedName) ??
          {
            name: gheName,
            totalByFunctionId: new Map<string, number>(),
          };

        ghe.items.forEach((item) => {
          const mappedFunctionId = importedFunctionIdToFinalId.get(item.functionId);
          if (!mappedFunctionId) return;
          const current = existing.totalByFunctionId.get(mappedFunctionId) ?? 0;
          const next = current + parseNonNegativeInteger(item.funcionarios);
          existing.totalByFunctionId.set(mappedFunctionId, next);
        });

        importedAssignmentsByGhe.set(normalizedName, existing);
      });

      let gheAssignmentsUpdatedCount = 0;
      let createdGheCount = 0;
      if (importedAssignmentsByGhe.size > 0) {
        const existingGheIdSet = new Set<string>([
          ...gheGroups.map((item) => item.id),
          ...riskGheGroups.map((item) => item.id),
        ]);
        const createImportedGheId = () => {
          let counter = 1;
          let candidate = `ghe-import-${importBatchSeed}-${counter}`;
          while (existingGheIdSet.has(candidate)) {
            counter += 1;
            candidate = `ghe-import-${importBatchSeed}-${counter}`;
          }
          existingGheIdSet.add(candidate);
          return candidate;
        };

        const gheIndexByName = new Map<string, number>();
        const nextGheGroups = gheGroups.map((group, index) => {
          gheIndexByName.set(normalizeGheName(group.name), index);
          return {
            ...group,
            items: group.items.map((item) => ({ ...item })),
          };
        });
        const newRiskGhes: RiskGheGroup[] = [];

        importedAssignmentsByGhe.forEach((assignment, normalizedGheName) => {
          const targetIndex = gheIndexByName.get(normalizedGheName);
          const parsedItems = Array.from(assignment.totalByFunctionId.entries()).map(
            ([functionId, count]) => ({
              functionId,
              funcionarios: String(count),
            })
          );

          if (targetIndex === undefined) {
            if (!parsedItems.length) return;
            const newGheId = createImportedGheId();
            nextGheGroups.push({
              id: newGheId,
              name: assignment.name,
              info: {
                processo: "",
                observacoes: "-",
                ambiente: "A ser evidenciado na fase de reconhecimento",
              },
              items: parsedItems,
            });
            gheIndexByName.set(normalizedGheName, nextGheGroups.length - 1);
            newRiskGhes.push({
              id: newGheId,
              name: assignment.name,
              risks: [],
            });
            gheAssignmentsUpdatedCount += parsedItems.length;
            createdGheCount += 1;
            return;
          }

          const currentItems = nextGheGroups[targetIndex].items;
          const itemIndexByFunctionId = new Map<string, number>();
          currentItems.forEach((item, itemIndex) => {
            itemIndexByFunctionId.set(item.functionId, itemIndex);
          });

          parsedItems.forEach((item) => {
            const existingItemIndex = itemIndexByFunctionId.get(item.functionId);
            if (existingItemIndex === undefined) {
              currentItems.push(item);
              itemIndexByFunctionId.set(item.functionId, currentItems.length - 1);
              gheAssignmentsUpdatedCount += 1;
              return;
            }

            const currentCount = parseNonNegativeInteger(
              currentItems[existingItemIndex].funcionarios
            );
            const importedCount = parseNonNegativeInteger(item.funcionarios);
            currentItems[existingItemIndex] = {
              ...currentItems[existingItemIndex],
              funcionarios: String(currentCount + importedCount),
            };
            gheAssignmentsUpdatedCount += 1;
          });
        });

        if (gheAssignmentsUpdatedCount > 0 || createdGheCount > 0) {
          setGheGroups(nextGheGroups);
        }
        if (newRiskGhes.length) {
          setRiskGheGroups((prev) => [...prev, ...newRiskGhes]);
        }
      }

      const gheImportSummary =
        gheAssignmentsUpdatedCount > 0 || createdGheCount > 0
          ? ` ${gheAssignmentsUpdatedCount} vínculo(s) de função/GHE atualizado(s)${
              createdGheCount ? ` e ${createdGheCount} GHE(s) criado(s)` : ""
            }.`
          : "";

      setExcelImportFeedback({
        type: "success",
        message:
          importedUniqueFunctions.length > 0
            ? `Planilha importada: ${importedUniqueFunctions.length} funções adicionadas à lista geral${
                skippedExistingCount || skippedDuplicatedInFileCount
                  ? ` (${skippedExistingCount} já existentes e ${skippedDuplicatedInFileCount} duplicadas no arquivo foram ignoradas)`
                  : ""
              }.${gheImportSummary}`
            : `Nenhuma função nova foi adicionada. As funções da planilha já existem na lista geral.${gheImportSummary}`,
      });
    } catch (error) {
      if (error instanceof DescricaoImportMissingRequiredFieldsError) {
        setExcelImportFeedback({
          type: "error",
          message: "Arquivo inválido: há linhas com campos obrigatórios ausentes.",
          missingRequiredFieldRows: error.missingRequiredFieldRows,
        });
        return;
      }

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
    const descricao = payload.descricao.trim();

    if (!setor || !funcao || !descricao) {
      throw new Error("Setor, Função e Descrição da Atividade são obrigatórios!");
    }

    let createdFunctionId = "";
    let hasDuplicate = false;
    const normalizedSetorFuncao = `${setor}||${funcao}`.toLowerCase();

    setFunctionsData((prev) => {
      hasDuplicate = prev.some(
        (item) =>
          `${(item.setor || "").trim()}||${(item.funcao || "").trim()}`.toLowerCase() ===
          normalizedSetorFuncao
      );
      if (hasDuplicate) return prev;

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
    if (hasDuplicate) {
      throw new Error("Já existe uma função com este setor e função.");
    }

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
    const allowed = [".pdf", ".png", ".jpeg", ".jpg"];
    const selectedFiles = Array.from(files).filter((file) =>
      allowed.some((ext) => file.name.toLowerCase().endsWith(ext))
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
        link.download = fileName || "anexo";
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
    handleContractorChange,
    handleAddContractor,
    handleDuplicateContractor,
    handleRemoveContractor,
    handleTechnicalCoordinatorChange,
    handleAddTechnicalCoordinator,
    handleRemoveTechnicalCoordinator,
    handleLoadPipefyMock,
    handleOpenPlanActionModal,
    handleChangePlanActionScope,
    handlePlanActionGheChange,
    handlePlanMedidasChange,
    handleEditMedidasStart,
    handleEditMedidasCancel,
    handleEditMedidasSave,
    handleDeleteMedidas,
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
