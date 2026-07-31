import { apiBlobGet, apiDelete, apiPost, apiPostForm } from "@/lib/api";
import { runInSaveChain } from "../state/state-version";
import {
  DescricaoImportMissingRequiredFieldsError,
  parseDescricaoExcel,
} from "../utils/descricao-import";
import { initialInicioDraft } from "../defaults";
import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import type {
  AnexoFile,
  AnexoItem,
  AnexoOrientation,
  ExcelImportFeedback,
  GheRisk,
  HistoryEntry,
  ParsedDescricaoImport,
  PlanGeneralMeasureRow,
  PlanRiskExtraAction,
  PgrFunction,
  RiskGheGroup,
} from "../types";
import type { PersistedPgrState } from "../state/runtime-cache";
import {
  isValidCnpj,
  maskCep,
  maskCnpj,
  maskCpf,
  maskPhoneBr,
  normalizeEmail,
  normalizeRiskGrade,
} from "../validation/br-field-utils";
import {
  createEmptyContratante,
  isBlankContratante,
  normalizeAdditionalFields,
  createEmptyResponsavelCoordenacaoTecnica,
  normalizeContractors,
  normalizeResponsaveisCoordenacaoTecnica,
  syncLegacyContractorFields,
} from "../utils/contractors";
import {
  createEmptyEstabelecimento,
  normalizeEstablishments,
  syncLegacyEstablishmentFields,
} from "../utils/establishments";
import { completeVigenciaInterval, maskVigenciaInterval } from "../utils/vigencia";
import {
  buildPlanActionGeneralMeasureRow,
  parseExtraPlanActionRiskId,
} from "../utils/plan-actions";
import { mapCnpjLookupToRegistration } from "../utils/cnpj-lookup";

type CardMeta = PersistedPgrState["cardMeta"];
type ExtraField = PersistedPgrState["extraEstabelecimentoFields"][number];
const PLAN_ALL_GHE_ID = "__plan_all_ghes__";

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

const composeViaCepAddress = (logradouro?: string, bairro?: string) => {
  const street = String(logradouro || "").trim();
  const neighborhood = String(bairro || "").trim();
  if (street && neighborhood) return `${street}, ${neighborhood}`;
  return street || "";
};

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
    setHistoricoData: React.Dispatch<
      React.SetStateAction<PersistedPgrState["historicoData"]>
    >;
    setIsPipefySyncing: React.Dispatch<React.SetStateAction<boolean>>;
    setPlanActionScope: React.Dispatch<React.SetStateAction<"all" | "ghe" | "risk">>;
    setPlanActionGheId: React.Dispatch<React.SetStateAction<string>>;
    setPlanActionRiskId: React.Dispatch<React.SetStateAction<string>>;
    setPlanActionDescription: React.Dispatch<React.SetStateAction<string>>;
    setPlanActionPriority: React.Dispatch<React.SetStateAction<string>>;
    setIsPlanActionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setRiskGheGroups: React.Dispatch<React.SetStateAction<RiskGheGroup[]>>;
    setRemovedPlanRiskKeys: React.Dispatch<React.SetStateAction<string[]>>;
    setPlanGeneralMeasures: React.Dispatch<React.SetStateAction<PlanGeneralMeasureRow[]>>;
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
      estabelecimentoByIndex: Record<string, string>;
      contratanteByIndex: Record<string, string>;
    }>;
    functionsData: PgrFunction[];
    gheGroups: PersistedPgrState["gheGroups"];
    planActionScope: "all" | "ghe" | "risk";
    planAction: { nr: string; vigencia: string };
    riskGheGroups: RiskGheGroup[];
    planActionGheId: string;
    planActionRiskId: string;
    planActionDescription: string;
    planActionPriority: string;
    completedSteps: number;
    currentIndex: number;
    nextStep: { id: string } | null;
    router: { push: (href: string) => void };
    historicoData: PersistedPgrState["historicoData"];
    anexos: AnexoItem[];
    dragOverAnexoId: string | null;
    draggedAnexoId: string | null;
    editingMedidasValue: string;
    stepId: string;
    allGhesDescribed: boolean;
  };
  helpers: {
    handleAdvanceApiSync: (nextCompleted: number) => void;
    persistStateNow: () => Promise<void>;
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
    setHistoricoData,
    setIsPipefySyncing,
    setPlanActionScope,
    setPlanActionGheId,
    setPlanActionRiskId,
    setPlanActionDescription,
    setPlanActionPriority,
    setIsPlanActionModalOpen,
    setRiskGheGroups,
    setRemovedPlanRiskKeys,
    setPlanGeneralMeasures,
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
    planAction,
    riskGheGroups,
    planActionGheId,
    planActionRiskId,
    planActionDescription,
    planActionPriority,
    completedSteps,
    currentIndex,
    nextStep,
    router,
    historicoData,
    anexos,
    dragOverAnexoId,
    draggedAnexoId,
  } = current;

  const { handleAdvanceApiSync, persistStateNow } = helpers;
  const availablePlanActionGheGroups = riskGheGroups.filter((ghe) => ghe.risks.length > 0);
  const syncLegacyDados = (dados: DadosCadastraisDraft, estabelecimentoSelecionado = "") =>
    syncLegacyContractorFields(syncLegacyEstablishmentFields(dados, estabelecimentoSelecionado));

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
        case "estabelecimentoCep":
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
        field.startsWith("estabelecimento") &&
        Array.isArray(prev.estabelecimentos) &&
        prev.estabelecimentos.length
      ) {
        const first = prev.estabelecimentos[0];
        const updatedFirst = {
          ...first,
          ...(field === "estabelecimentoNome" ? { nome: normalizedValue } : {}),
          ...(field === "estabelecimentoCnpj" ? { cnpj: normalizedValue } : {}),
          ...(field === "estabelecimentoRazaoSocial" ? { razaoSocial: normalizedValue } : {}),
          ...(field === "estabelecimentoCnae" ? { cnae: normalizedValue } : {}),
          ...(field === "estabelecimentoEndereco" ? { endereco: normalizedValue } : {}),
          ...(field === "estabelecimentoNumero" ? { numero: normalizedValue } : {}),
          ...(field === "estabelecimentoBairro" ? { bairro: normalizedValue } : {}),
          ...(field === "estabelecimentoCep" ? { cep: normalizedValue } : {}),
          ...(field === "estabelecimentoCidade" ? { cidade: normalizedValue } : {}),
          ...(field === "estabelecimentoEstado" ? { estado: normalizedValue } : {}),
          ...(field === "estabelecimentoGrauRisco" ? { grauRisco: normalizedValue } : {}),
          ...(field === "estabelecimentoAtividadePrincipal"
            ? { atividadePrincipal: normalizedValue }
            : {}),
        };
        next.estabelecimentos = [updatedFirst, ...prev.estabelecimentos.slice(1)];
      }
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
          ...(field === "contratanteNumero" ? { numero: normalizedValue } : {}),
          ...(field === "contratanteBairro" ? { bairro: normalizedValue } : {}),
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
      return syncLegacyDados(next);
    });
  };

  const handleRecalculateByCep = async (
    scope: "empresa" | "estabelecimento" | "contratante",
    cepValue: string,
    itemIndex = 0
  ) => {
    const cep = cepValue.replace(/\D/g, "");
    if (cep.length !== 8) {
      if (scope === "empresa") {
        lastCepLookupRef.current.empresa = "";
      } else if (scope === "estabelecimento") {
        lastCepLookupRef.current.estabelecimentoByIndex[String(itemIndex)] = "";
      } else {
        lastCepLookupRef.current.contratanteByIndex[String(itemIndex)] = "";
      }
      return;
    }
    if (scope === "empresa" && lastCepLookupRef.current.empresa === cep) return;
    if (
      scope === "estabelecimento" &&
      lastCepLookupRef.current.estabelecimentoByIndex[String(itemIndex)] === cep
    ) {
      return;
    }
    if (
      scope === "contratante" &&
      lastCepLookupRef.current.contratanteByIndex[String(itemIndex)] === cep
    ) {
      return;
    }

    if (scope === "empresa") {
      lastCepLookupRef.current.empresa = cep;
    } else if (scope === "estabelecimento") {
      lastCepLookupRef.current.estabelecimentoByIndex[String(itemIndex)] = cep;
    } else {
      lastCepLookupRef.current.contratanteByIndex[String(itemIndex)] = cep;
    }

    try {
      const response = await apiPost<{
        found: boolean;
        data?: {
          cep?: string;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        };
      }>("/api/v1/frontend/lookup/cep", { cep });

      if (!response.found || !response.data) return;
      const payload = response.data;
      const viaCepAddress = composeViaCepAddress(payload.logradouro, payload.bairro);

      setDadosCadastrais((prev) => {
        if (scope === "empresa") {
          return {
            ...prev,
            empresaCep: maskCep(payload.cep || prev.empresaCep),
            empresaEndereco: viaCepAddress || prev.empresaEndereco,
            empresaNumero: prev.empresaNumero,
            empresaBairro: payload.bairro || prev.empresaBairro,
            empresaCidade: payload.localidade || prev.empresaCidade,
            empresaEstado: payload.uf || prev.empresaEstado,
          };
        }

        if (scope === "estabelecimento") {
          const establishments = normalizeEstablishments(prev, "");
          const safeIndex = Math.max(0, Math.min(itemIndex, establishments.length - 1));
          const nextEstablishments = establishments.map((establishment, index) =>
            index === safeIndex
              ? {
                  ...establishment,
                  cep: maskCep(payload.cep || establishment.cep),
                  endereco: viaCepAddress || establishment.endereco,
                  numero: establishment.numero,
                  bairro: payload.bairro || establishment.bairro,
                  cidade: payload.localidade || establishment.cidade,
                  estado: payload.uf || establishment.estado,
              }
              : establishment
          );

          return syncLegacyDados(
            {
              ...prev,
              estabelecimentos: nextEstablishments,
            } as DadosCadastraisDraft,
            nextEstablishments[0]?.tipo || ""
          );
        }

        const contractors = normalizeContractors(prev);
        const safeIndex = Math.max(0, Math.min(itemIndex, contractors.length - 1));
        const nextContractors = contractors.map((contractor, index) =>
          index === safeIndex
            ? {
                ...contractor,
                cep: maskCep(payload.cep || contractor.cep),
                endereco: viaCepAddress || contractor.endereco,
                numero: contractor.numero,
                bairro: payload.bairro || contractor.bairro,
                cidade: payload.localidade || contractor.cidade,
                estado: payload.uf || contractor.estado,
              }
            : contractor
        );

        return syncLegacyDados({
          ...prev,
          contratantes: nextContractors,
        });
      });
    } catch {
      if (scope === "empresa") {
        lastCepLookupRef.current.empresa = "";
      } else if (scope === "estabelecimento") {
        lastCepLookupRef.current.estabelecimentoByIndex[String(itemIndex)] = "";
      } else {
        lastCepLookupRef.current.contratanteByIndex[String(itemIndex)] = "";
      }
    }
  };

  const handleRecalculateByCnpj = async (
    scope: "estabelecimento" | "contratante",
    itemIndex: number,
    cnpjValue: string
  ) => {
    const cnpj = cnpjValue.replace(/\D/g, "");
    if (!isValidCnpj(cnpj)) return;

    try {
      const response = await apiPost<{
        found: boolean;
        riskDegree?: string | number | null;
        data?: Record<string, unknown>;
      }>("/api/v1/frontend/lookup/cnpj", { cnpj });
      if (!response.found || !response.data) return;

      const registration = mapCnpjLookupToRegistration(
        response.data,
        response.riskDegree
      );
      setDadosCadastrais((prev) => {
        if (scope === "estabelecimento") {
          const establishments = normalizeEstablishments(prev, "");
          const target = establishments[itemIndex];
          if (!target || target.cnpj.replace(/\D/g, "") !== cnpj) return prev;
          const nextEstablishments = establishments.map((establishment, index) =>
            index === itemIndex
              ? {
                  ...establishment,
                  nome: registration.nomeFantasia || establishment.nome,
                  razaoSocial: registration.razaoSocial || establishment.razaoSocial,
                  cnae: registration.cnae || establishment.cnae,
                  atividadePrincipal:
                    registration.atividadePrincipal || establishment.atividadePrincipal,
                  grauRisco: registration.grauRisco || establishment.grauRisco,
                  endereco: registration.endereco || establishment.endereco,
                  numero: registration.numero || establishment.numero,
                  bairro: registration.bairro || establishment.bairro,
                  cep: registration.cep || establishment.cep,
                  cidade: registration.cidade || establishment.cidade,
                  estado: registration.estado || establishment.estado,
                }
              : establishment
          );
          return syncLegacyDados(
            { ...prev, estabelecimentos: nextEstablishments } as DadosCadastraisDraft,
            nextEstablishments[0]?.tipo || ""
          );
        }

        const contractors = normalizeContractors(prev);
        const target = contractors[itemIndex];
        if (!target || target.cnpj.replace(/\D/g, "") !== cnpj) return prev;
        const nextContractors = contractors.map((contractor, index) =>
          index === itemIndex
            ? {
                ...contractor,
                nomeFantasia: registration.nomeFantasia || contractor.nomeFantasia,
                razaoSocial: registration.razaoSocial || contractor.razaoSocial,
                cnae: registration.cnae || contractor.cnae,
                atividadePrincipal:
                  registration.atividadePrincipal || contractor.atividadePrincipal,
                grauRisco: registration.grauRisco || contractor.grauRisco,
                endereco: registration.endereco || contractor.endereco,
                numero: registration.numero || contractor.numero,
                bairro: registration.bairro || contractor.bairro,
                cep: registration.cep || contractor.cep,
                cidade: registration.cidade || contractor.cidade,
                estado: registration.estado || contractor.estado,
              }
            : contractor
        );
        return syncLegacyDados({ ...prev, contratantes: nextContractors });
      });
    } catch {
      // A consulta não deve impedir o preenchimento manual dos dados cadastrais.
    }
  };

  const handleContractorChange = (
    contractorIndex: number,
    field: Exclude<keyof DadosCadastraisDraft["contratantes"][number], "id" | "camposAdicionais">,
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
      return syncLegacyDados({
        ...prev,
        contratantes: nextContractors,
      });
    });
  };

  const handleAddContractorExtraField = (contractorIndex: number) => {
    setDadosCadastrais((prev) => {
      const contractors = normalizeContractors(prev);
      const safeIndex = Math.max(0, Math.min(contractorIndex, contractors.length - 1));
      const nextContractors = contractors.map((contractor, index) =>
        index === safeIndex
          ? {
              ...contractor,
              camposAdicionais: [
                ...normalizeAdditionalFields(contractor.camposAdicionais),
                {
                  id: `contratante-field-${Date.now()}-${index + 1}`,
                  title: "",
                  value: "",
                },
              ],
            }
          : contractor
      );
      return syncLegacyDados({
        ...prev,
        contratantes: nextContractors,
      });
    });
  };

  const handleContractorExtraFieldChange = (
    contractorIndex: number,
    fieldId: string,
    field: "title" | "value",
    value: string
  ) => {
    setDadosCadastrais((prev) => {
      const contractors = normalizeContractors(prev);
      const safeIndex = Math.max(0, Math.min(contractorIndex, contractors.length - 1));
      const nextContractors = contractors.map((contractor, index) =>
        index === safeIndex
          ? {
              ...contractor,
              camposAdicionais: normalizeAdditionalFields(contractor.camposAdicionais).map(
                (item) => (item.id === fieldId ? { ...item, [field]: value } : item)
              ),
            }
          : contractor
      );
      return syncLegacyDados({
        ...prev,
        contratantes: nextContractors,
      });
    });
  };

  const handleRemoveContractorExtraField = (
    contractorIndex: number,
    fieldId: string
  ) => {
    setDadosCadastrais((prev) => {
      const contractors = normalizeContractors(prev);
      const safeIndex = Math.max(0, Math.min(contractorIndex, contractors.length - 1));
      const nextContractors = contractors.map((contractor, index) =>
        index === safeIndex
          ? {
              ...contractor,
              camposAdicionais: normalizeAdditionalFields(contractor.camposAdicionais).filter(
                (item) => item.id !== fieldId
              ),
            }
          : contractor
      );
      return syncLegacyDados({
        ...prev,
        contratantes: nextContractors,
      });
    });
  };

  const handleAddContractor = () => {
    setDadosCadastrais((prev) => {
      const contractors = normalizeContractors(prev);
      const lastContractor = contractors[contractors.length - 1];
      if (lastContractor && isBlankContratante(lastContractor)) {
        if (typeof window !== "undefined") {
          window.alert(
            "Preencha os dados da contratante atual antes de adicionar uma nova."
          );
        }
        return prev;
      }
      return syncLegacyDados({
        ...prev,
        contratantes: [...contractors, createEmptyContratante()],
      });
    });
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
      return syncLegacyDados({ ...prev, contratantes: next });
    });
  };

  const handleRemoveContractor = (contractorIndex: number) => {
    setDadosCadastrais((prev) => {
      const contractors = normalizeContractors(prev);
      const next = contractors.filter((_, index) => index !== contractorIndex);
      if (!next.length) {
        return syncLegacyDados({
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
      return syncLegacyDados({ ...prev, contratantes: next });
    });
  };

  const handleEstablishmentChange = (
    establishmentIndex: number,
    field: Exclude<keyof DadosCadastraisDraft["estabelecimentos"][number], "id">,
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
      const establishments = normalizeEstablishments(prev, "");
      const safeIndex = Math.max(0, Math.min(establishmentIndex, establishments.length - 1));
      const nextEstablishments = establishments.map((establishment, index) =>
        index === safeIndex ? { ...establishment, [field]: normalizedValue } : establishment
      );
      return syncLegacyDados(
        {
          ...prev,
          estabelecimentos: nextEstablishments,
        } as DadosCadastraisDraft,
        nextEstablishments[0]?.tipo || ""
      );
    });
  };

  const handleAddEstablishment = () => {
    setDadosCadastrais((prev) => {
      const establishments = normalizeEstablishments(prev, "");
      return syncLegacyDados(
        {
          ...prev,
          estabelecimentos: [...establishments, createEmptyEstabelecimento()],
        } as DadosCadastraisDraft,
        establishments[0]?.tipo || ""
      );
    });
  };

  const handleDuplicateEstablishment = (establishmentIndex: number) => {
    setDadosCadastrais((prev) => {
      const establishments = normalizeEstablishments(prev, "");
      const source = establishments[establishmentIndex];
      if (!source) return prev;
      const duplicated = {
        ...source,
        id: createEmptyEstabelecimento().id,
      };
      const next = [...establishments];
      next.splice(establishmentIndex + 1, 0, duplicated);
      return syncLegacyDados(
        {
          ...prev,
          estabelecimentos: next,
        } as DadosCadastraisDraft,
        next[0]?.tipo || ""
      );
    });
  };

  const handleRemoveEstablishment = (establishmentIndex: number) => {
    setDadosCadastrais((prev) => {
      const establishments = normalizeEstablishments(prev, "");
      const next = establishments.filter((_, index) => index !== establishmentIndex);
      const ensured = next.length ? next : [createEmptyEstabelecimento()];
      return syncLegacyDados(
        {
          ...prev,
          estabelecimentos: ensured,
        } as DadosCadastraisDraft,
        ensured[0]?.tipo || ""
      );
    });
  };

  const handleAddEstablishmentExtraField = (establishmentIndex: number) => {
    setDadosCadastrais((prev) => {
      const establishments = normalizeEstablishments(prev, "");
      const safeIndex = Math.max(0, Math.min(establishmentIndex, establishments.length - 1));
      const nextEstablishments = establishments.map((establishment, index) =>
        index === safeIndex
          ? {
              ...establishment,
              camposAdicionais: [
                ...normalizeAdditionalFields(establishment.camposAdicionais),
                {
                  id: `estabelecimento-field-${Date.now()}-${index + 1}`,
                  title: "",
                  value: "",
                },
              ],
            }
          : establishment
      );
      return syncLegacyDados(
        {
          ...prev,
          estabelecimentos: nextEstablishments,
        } as DadosCadastraisDraft,
        nextEstablishments[0]?.tipo || ""
      );
    });
  };

  const handleEstablishmentExtraFieldChange = (
    establishmentIndex: number,
    fieldId: string,
    field: "title" | "value",
    value: string
  ) => {
    setDadosCadastrais((prev) => {
      const establishments = normalizeEstablishments(prev, "");
      const safeIndex = Math.max(0, Math.min(establishmentIndex, establishments.length - 1));
      const nextEstablishments = establishments.map((establishment, index) =>
        index === safeIndex
          ? {
              ...establishment,
              camposAdicionais: normalizeAdditionalFields(establishment.camposAdicionais).map(
                (item) => (item.id === fieldId ? { ...item, [field]: value } : item)
              ),
            }
          : establishment
      );
      return syncLegacyDados(
        {
          ...prev,
          estabelecimentos: nextEstablishments,
        } as DadosCadastraisDraft,
        nextEstablishments[0]?.tipo || ""
      );
    });
  };

  const handleRemoveEstablishmentExtraField = (
    establishmentIndex: number,
    fieldId: string
  ) => {
    setDadosCadastrais((prev) => {
      const establishments = normalizeEstablishments(prev, "");
      const safeIndex = Math.max(0, Math.min(establishmentIndex, establishments.length - 1));
      const nextEstablishments = establishments.map((establishment, index) =>
        index === safeIndex
          ? {
              ...establishment,
              camposAdicionais: normalizeAdditionalFields(establishment.camposAdicionais).filter(
                (item) => item.id !== fieldId
              ),
            }
          : establishment
      );
      return syncLegacyDados(
        {
          ...prev,
          estabelecimentos: nextEstablishments,
        } as DadosCadastraisDraft,
        nextEstablishments[0]?.tipo || ""
      );
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
      return syncLegacyDados({
        ...prev,
        responsaveisCoordenacaoTecnica: nextCoordinators,
      });
    });
  };

  const handleAddTechnicalCoordinator = () => {
    setDadosCadastrais((prev) => {
      const coordinators = normalizeResponsaveisCoordenacaoTecnica(prev);
      if (coordinators.length >= 1) {
        return prev;
      }
      return syncLegacyDados({
        ...prev,
        responsaveisCoordenacaoTecnica: [createEmptyResponsavelCoordenacaoTecnica()],
      });
    });
  };

  const handleRemoveTechnicalCoordinator = (coordinatorIndex: number) => {
    setDadosCadastrais((prev) => {
      const coordinators = normalizeResponsaveisCoordenacaoTecnica(prev);
      const next = coordinators.filter((_, index) => index !== coordinatorIndex);
      return syncLegacyDados({
        ...prev,
        responsaveisCoordenacaoTecnica: next,
      });
    });
  };

  const handleLoadPipefyMock = async () => {
    setIsPipefySyncing(true);
    try {
      const response = await runInSaveChain(params.id, () =>
        apiPost<{
          inicioDraft: Partial<InicioDraft>;
          dadosCadastrais: Partial<DadosCadastraisDraft>;
          cardMeta: {
            pipefyCardId: string;
            cardName: string;
            dueDate: string;
            companyId: number | null;
            responsibleId: number | null;
          };
          updatedAt?: string;
        }>(`/api/v1/frontend/pgr/${params.id}/sync-pipefy`)
      );
      const rawInicioDraft = (response?.inicioDraft || {}) as Record<string, unknown>;
      const rawCardMeta = (response?.cardMeta || {}) as Record<string, unknown>;
      const normalizedInicioDraft = normalizeInicioDraftFromPipefy(
        rawInicioDraft,
        rawCardMeta
      );

      setInicioDraft({
        ...initialInicioDraft,
        ...normalizedInicioDraft,
        syncedAt: normalizedInicioDraft.syncedAt ?? null,
      });
      const responseDados = (response.dadosCadastrais || {}) as Partial<DadosCadastraisDraft>;
      const fallbackCompany =
        String(responseDados.empresaNome || "").trim() ||
        String(responseDados.empresaRazaoSocial || "").trim() ||
        String(normalizedInicioDraft.companyName || "").trim() ||
        String(rawInicioDraft.companyName || "").trim();
      const mergedDados = syncLegacyDados({
        ...initialDadosCadastrais,
        ...responseDados,
        empresaRazaoSocial:
          String(responseDados.empresaRazaoSocial || "").trim() || fallbackCompany,
        empresaNome: String(responseDados.empresaNome || "").trim() || fallbackCompany,
      });

      setDadosCadastrais(mergedDados);
      if (fallbackCompany) {
        setHistoricoData((prev) => ({
          ...prev,
          changes: prev.changes.map((row) => {
            const currentCompany = String(row.company || "").trim();
            const isPlaceholder =
              !currentCompany ||
              currentCompany.toLowerCase() === "empresa não informada";
            return isPlaceholder ? { ...row, company: fallbackCompany } : row;
          }),
        }));
      }
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
    const firstGhe = availablePlanActionGheGroups[0];
    const firstRisk = firstGhe?.risks[0];
    setPlanActionScope(firstRisk ? "risk" : firstGhe ? "ghe" : "all");
    setPlanActionGheId(firstGhe?.id ?? "");
    setPlanActionRiskId(firstRisk?.id ?? "");
    setPlanActionDescription("");
    setPlanActionPriority("Média");
    setIsPlanActionModalOpen(true);
  };

  const handleChangePlanActionScope = (scope: "all" | "ghe" | "risk") => {
    setPlanActionScope(scope);
    if (scope === "all") return;
    const currentGhe =
      availablePlanActionGheGroups.find((ghe) => ghe.id === planActionGheId) ??
      availablePlanActionGheGroups[0];
    const gheId = currentGhe?.id ?? "";
    setPlanActionGheId(gheId);
    if (scope === "risk") {
      setPlanActionRiskId(currentGhe?.risks[0]?.id ?? "");
    }
  };

  const handlePlanActionGheChange = (value: string) => {
    setPlanActionGheId(value);
    if (planActionScope !== "risk") return;
    const ghe = availablePlanActionGheGroups.find((item) => item.id === value);
    setPlanActionRiskId(ghe?.risks[0]?.id ?? "");
  };

  // Aplica um valor de campo do plano de ação a um risco, sabendo distinguir
  // a linha "nativa" do risco (riskId puro) de uma linha de ação extra
  // (riskId composto, ver buildExtraPlanActionRiskId/parseExtraPlanActionRiskId)
  // -- nesse segundo caso o valor vai pro item correspondente dentro de
  // risk.extraPlanActions, não pro campo direto do risco.
  const applyPlanFieldToRisk = (
    risk: GheRisk,
    targetRiskId: string,
    field:
      | "medidasPrevencaoPlano"
      | "tipoMedida"
      | "prazoAcao"
      | "disableAutoPrazoAcao"
      | "responsavelAcao"
      | "acompanhamento"
      | "afericaoResultado",
    value: string | boolean
  ): GheRisk => {
    const extraRef = parseExtraPlanActionRiskId(targetRiskId);
    if (extraRef) {
      if (risk.id !== extraRef.riskId) return risk;
      const targetField = field === "medidasPrevencaoPlano" ? "descricao" : field;
      return {
        ...risk,
        extraPlanActions: (risk.extraPlanActions || []).map((action) =>
          action.id === extraRef.actionId
            ? { ...action, [targetField]: value }
            : action
        ),
      };
    }
    return risk.id === targetRiskId ? { ...risk, [field]: value } : risk;
  };

  const handlePlanRiskFieldChange = (
    gheId: string,
    riskId: string,
    field:
      | "medidasPrevencaoPlano"
      | "tipoMedida"
      | "prazoAcao"
      | "disableAutoPrazoAcao"
      | "responsavelAcao"
      | "acompanhamento"
      | "afericaoResultado",
    value: string | boolean,
    groupTargets?: Array<{ gheId: string; riskId: string }>
  ) => {
    if (gheId === PLAN_ALL_GHE_ID) {
      const targetField =
        field === "medidasPrevencaoPlano" ? "descricao" : field;
      setPlanGeneralMeasures((prev) => {
        return prev.map((item) =>
          item.id === riskId ? { ...item, [targetField]: value } : item
        );
      });
      return;
    }

    if (Array.isArray(groupTargets) && groupTargets.length) {
      setRiskGheGroups((prev) =>
        prev.map((ghe) => {
          const relevantTargets = groupTargets.filter(
            (target) => target.gheId === ghe.id
          );
          if (!relevantTargets.length) return ghe;
          return {
            ...ghe,
            risks: ghe.risks.map((risk) =>
              relevantTargets.reduce(
                (acc, target) =>
                  applyPlanFieldToRisk(acc, target.riskId, field, value),
                risk
              )
            ),
          };
        })
      );
      return;
    }

    setRiskGheGroups((prev) => {
      return prev.map((ghe) => {
        if (ghe.id !== gheId) return ghe;
        return {
          ...ghe,
          risks: ghe.risks.map((risk) =>
            applyPlanFieldToRisk(risk, riskId, field, value)
          ),
        };
      });
    });
  };

  const handlePlanMedidasChange = (
    gheId: string,
    riskId: string,
    value: string,
    groupTargets?: Array<{ gheId: string; riskId: string }>
  ) => {
    handlePlanRiskFieldChange(
      gheId,
      riskId,
      "medidasPrevencaoPlano",
      value,
      groupTargets
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
    if (gheId === PLAN_ALL_GHE_ID) {
      setPlanGeneralMeasures((prev) => prev.filter((item) => item.id !== riskId));
      setEditingMedidasId(null);
      setEditingMedidasValue("");
      return;
    }

    const targets = Array.isArray(groupTargets) && groupTargets.length
      ? groupTargets
      : [{ gheId, riskId }];
    const extraTargets = targets.filter((target) =>
      parseExtraPlanActionRiskId(target.riskId)
    );
    const nativeTargets = targets.filter(
      (target) => !parseExtraPlanActionRiskId(target.riskId)
    );

    if (extraTargets.length) {
      setRiskGheGroups((prev) =>
        prev.map((ghe) => {
          const relevantTargets = extraTargets.filter(
            (target) => target.gheId === ghe.id
          );
          if (!relevantTargets.length) return ghe;
          return {
            ...ghe,
            risks: ghe.risks.map((risk) => {
              const excludedActionIds = new Set(
                relevantTargets
                  .map((target) => parseExtraPlanActionRiskId(target.riskId))
                  .filter((ref) => ref?.riskId === risk.id)
                  .map((ref) => ref!.actionId)
              );
              if (!excludedActionIds.size) return risk;
              return {
                ...risk,
                extraPlanActions: (risk.extraPlanActions || []).filter(
                  (action) => !excludedActionIds.has(action.id)
                ),
              };
            }),
          };
        })
      );
    }

    if (nativeTargets.length) {
      const keysToExclude = nativeTargets.map(
        (target) => `${target.gheId}::${target.riskId}`
      );
      setRemovedPlanRiskKeys((prev) => Array.from(new Set([...prev, ...keysToExclude])));
    }

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
        ? availablePlanActionGheGroups.map((ghe) => ghe.id)
        : [planActionGheId];
    const selectedGheIds = new Set(
      (Array.isArray(gheIds) && gheIds.length ? gheIds : fallbackGheIds).filter(Boolean)
    );
    if (planActionScope === "risk" && selectedRiskIds.size === 0) return;
    if ((planActionScope === "risk" || planActionScope === "ghe") && selectedGheIds.size === 0) {
      return;
    }

    if (planActionScope === "all" || planActionScope === "ghe") {
      const row = buildPlanActionGeneralMeasureRow({
        description: actionDescription,
        nr: planAction.nr || "",
        gheIds: Array.from(selectedGheIds),
        availableGheGroups: availablePlanActionGheGroups,
        idSeed: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        prioridade: planActionPriority,
      });
      if (!row) return;

      setPlanGeneralMeasures((prev) => {
        return [...prev, row];
      });
      setPlanActionDescription("");
      setPlanActionPriority("Média");
      setIsPlanActionModalOpen(false);
      return;
    }

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

    const touchedKeys = new Set<string>();
    setRiskGheGroups((prev) =>
      prev.map((ghe) => {
        const applyForGhe =
          planActionScope === "risk" && selectedGheIds.has(ghe.id);
        if (!applyForGhe) return ghe;

        const risks = ghe.risks.map((risk) => {
          const applyForRisk = (() => {
            if (planActionScope !== "risk") return true;
            if (selectedRiskIds.has(risk.id)) return true;
            return selectedRiskContentKeys.has(getRiskContentKey(risk));
          })();
          if (!applyForRisk) return risk;
          touchedKeys.add(`${ghe.id}::${risk.id}`);

          // "medidasControle" é um campo distinto (controles já em prática,
          // vem da caracterização do risco) -- não conta como o risco já
          // "ter uma ação" no plano. Usar ele aqui fazia até a primeira ação
          // de um risco (que devia só preencher a linha nativa) cair sempre
          // no ramo de ação extra, porque medidasControle é obrigatório e
          // quase nunca vem vazio.
          const existingMeasure = (risk.medidasPrevencaoPlano || "").trim();
          // Risco sem nenhuma ação ainda: essa é a primeira, preenche a
          // linha nativa dele (comportamento já existente, sem duplicar).
          if (!existingMeasure) {
            return { ...risk, medidasPrevencaoPlano: actionDescription };
          }

          // Já existe ação nesse risco: a nova precisa ser uma linha
          // independente no plano, não emendada na medida existente.
          const alreadyExists =
            existingMeasure
              .split("\n")
              .map((line) => line.trim())
              .includes(actionDescription) ||
            (risk.extraPlanActions || []).some(
              (action) => action.descricao.trim() === actionDescription
            );
          if (alreadyExists) return risk;

          const newAction: PlanRiskExtraAction = {
            id: `plan-risk-action-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            descricao: actionDescription,
          };
          return {
            ...risk,
            extraPlanActions: [...(risk.extraPlanActions || []), newAction],
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

  const handleCreateNrPlanRows = (nr: string, actions: string[]) => {
    const normalizedNr = String(nr || "").trim();
    const normalizedActions = Array.from(
      new Set(
        actions
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    );
    if (!normalizedNr) return;

    const toKey = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    const nowSeed = Date.now();

    setPlanGeneralMeasures((prev) => {
      const preservedRows = prev.filter(
        (row) => !String(row.id || "").startsWith("nr-general-")
      );
      const existingKeys = new Set(
        preservedRows.map((row) =>
          [toKey(row.descricao || ""), toKey(row.nr || "")].join("||")
        )
      );

      const createdRows: PlanGeneralMeasureRow[] = [];
      normalizedActions.forEach((descricao, index) => {
        const key = [toKey(descricao), toKey(normalizedNr)].join("||");
        if (existingKeys.has(key)) return;
        existingKeys.add(key);
        createdRows.push({
          id: `nr-general-${normalizedNr.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${nowSeed}-${index + 1}`,
          nr: normalizedNr,
          descricao,
          tipoMedida: "",
          prazoAcao: "",
          responsavelAcao: "",
          acompanhamento: "",
          afericaoResultado: "",
        });
      });

      return [...preservedRows, ...createdRows];
    });
  };

  const handleAdvance = async () => {
    if (ctx.current.stepId === "descricao" && !ctx.current.allGhesDescribed) return;
    try {
      await persistStateNow();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados antes de avançar.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      return;
    }
    const nextCompleted = Math.max(completedSteps, currentIndex + 1);
    setCompletedSteps(nextCompleted);
    handleAdvanceApiSync(nextCompleted);
    if (nextStep) {
      router.push(`/pgr/${params.id}/${nextStep.id}`);
    }
  };

  const handleAddExtraField = (
    scope: "empresa" | "estabelecimento" | "quantitativo"
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

  const importDescricaoExcel = async (
    event: React.ChangeEvent<HTMLInputElement>,
    options: {
      countMode: "quantitativo" | "line";
      importLabel: string;
    }
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setExcelImportFeedback(null);
    setIsImportingExcel(true);
    try {
      const imported: ParsedDescricaoImport = await parseDescricaoExcel(file, {
        countMode: options.countMode,
      });

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
            ? `${options.importLabel}: ${importedUniqueFunctions.length} funções adicionadas à lista geral${
                skippedExistingCount || skippedDuplicatedInFileCount
                  ? ` (${skippedExistingCount} já existentes e ${skippedDuplicatedInFileCount} duplicadas no arquivo foram ignoradas)`
                  : ""
              }.${gheImportSummary}`
            : `Nenhuma função nova foi adicionada. As funções da ${options.importLabel.toLowerCase()} já existem na lista geral.${gheImportSummary}`,
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

  const handleDescricaoExcelChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await importDescricaoExcel(event, {
      countMode: "quantitativo",
      importLabel: "Planilha importada",
    });
  };

  const handleDescricaoExcelAtivosChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await importDescricaoExcel(event, {
      countMode: "line",
      importLabel: "Planilha de ativos importada",
    });
  };

  const handleAddManualFunction = (payload: {
    setor: string;
    funcao: string;
    descricao: string;
    assignToCurrentGhe?: boolean;
    gheId?: string;
    funcionarios?: string;
    quantitativo?: string;
  }) => {
    const setor = payload.setor.trim();
    const funcao = payload.funcao.trim();
    const descricao = payload.descricao.trim();
    const quantitativo = (payload.quantitativo ?? "").trim();

    if (!setor || !funcao || !descricao) {
      throw new Error("Setor, Função e Descrição da Função são obrigatórios!");
    }
    if (quantitativo && !/^\d+$/.test(quantitativo)) {
      throw new Error("Quantitativo deve ser um número inteiro maior ou igual a zero.");
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
          quantitativo,
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
              funcionarios: (payload.funcionarios || "").trim() || quantitativo,
            },
          ],
        };
      })
    );
  };

  const maskDate = maskVigenciaInterval;
  const completeVigencia = completeVigenciaInterval;

  const toDateInputValue = (value: string) => {
    const safe = String(value || "").trim();
    if (!safe) return "";
    const isoMatch = safe.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, yyyy, mm, dd] = isoMatch;
      return `${yyyy}-${mm}-${dd}`;
    }
    const match = safe.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return "";
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  };

  const toDateBrValue = (value: string) => {
    const iso = toDateInputValue(value);
    if (!iso) return "";
    const [yyyy, mm, dd] = iso.split("-");
    if (!yyyy || !mm || !dd) return "";
    return `${dd}/${mm}/${yyyy}`;
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

        // Roteia o upload pela MESMA fila dos saves: serializa com o autosave
        // (senão o upload comita em paralelo a um autosave em voo → 409 falso)
        // e já atualiza o token do lock otimista a partir do updatedAt.
        const response = await runInSaveChain(params.id, () =>
          apiPostForm<{
            ok: boolean;
            updatedAt?: string;
            file: {
              id: string;
              name: string;
              date?: string;
              originalName: string;
              sizeBytes: number;
              uploadedAt: string;
              url?: string;
            };
          }>(`/api/v1/frontend/pgr/${params.id}/attachments/upload`, formData)
        );

        if (!response?.ok || !response.file) return;

        const uploadedFile: AnexoFile = {
          ...response.file,
          name: response.file.name,
          orientation: "auto",
          date:
            toDateBrValue(response.file.date || "") ||
            toDateBrValue(response.file.uploadedAt || "") ||
            "",
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

  const handleAnexoFileDateChange = (anexoId: string, fileId: string, value: string) => {
    const normalizedDate = value ? toDateBrValue(value) : "";
    setAnexos((prev) =>
      prev.map((anexo) =>
        anexo.id === anexoId
          ? {
              ...anexo,
              files: anexo.files.map((file) =>
                file.id === fileId ? { ...file, date: normalizedDate } : file
              ),
            }
          : anexo
      )
    );
  };

  const handleAnexoFileRemove = (anexoId: string, fileId: string) => {
    // Pela fila dos saves (serializa com autosave + atualiza token).
    void runInSaveChain(params.id, () =>
      apiDelete<{ ok: boolean; updatedAt?: string }>(
        `/api/v1/frontend/pgr/${params.id}/attachments/${fileId}`
      )
    )
      .catch(() => {})
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

  const handleAnexoFileOrientationChange = (
    anexoId: string,
    fileId: string,
    value: AnexoOrientation
  ) => {
    setAnexos((prev) =>
      prev.map((anexo) =>
        anexo.id === anexoId
          ? {
              ...anexo,
              files: anexo.files.map((file) =>
                file.id === fileId ? { ...file, orientation: value } : file
              ),
            }
          : anexo
      )
    );
  };

  const handleRemoveAnexo = (anexoId: string) => {
    if (anexoId === "anexo-art") return;
    setAnexos((prev) => {
      const target = prev.find((anexo) => anexo.id === anexoId);
      if (target?.files?.length) {
        target.files.forEach((file) => {
          void runInSaveChain(params.id, () =>
            apiDelete<{ ok: boolean; updatedAt?: string }>(
              `/api/v1/frontend/pgr/${params.id}/attachments/${file.id}`
            )
          ).catch(() => {});
        });
      }
      return prev.filter((anexo) => anexo.id !== anexoId);
    });
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
    handleRecalculateByCnpj,
    handleEstablishmentChange,
    handleAddEstablishment,
    handleDuplicateEstablishment,
    handleRemoveEstablishment,
    handleAddEstablishmentExtraField,
    handleEstablishmentExtraFieldChange,
    handleRemoveEstablishmentExtraField,
    handleContractorChange,
    handleAddContractorExtraField,
    handleContractorExtraFieldChange,
    handleRemoveContractorExtraField,
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
    handlePlanRiskFieldChange,
    handlePlanMedidasChange,
    handleEditMedidasStart,
    handleEditMedidasCancel,
    handleEditMedidasSave,
    handleDeleteMedidas,
    handleSavePlanActionModal,
    handleCreateNrPlanRows,
    handleAdvance,
    handleAddExtraField,
    handleExtraEstabelecimentoFieldChange,
    handleRemoveExtraField,
    handleDescricaoExcelChange,
    handleDescricaoExcelAtivosChange,
    handleAddManualFunction,
    maskDate,
    completeVigencia,
    handleAnexoFiles,
    handleAnexoFileRename,
    handleAnexoFileDateChange,
    handleAnexoFileRemove,
    handleAnexoFileDownload,
    handleAddAnexo,
    handleRemoveAnexo,
    handleMoveAnexo,
    handleAnexoFileOrientationChange,
    handleRenameAnexoTitle,
    handleAnexoDragStart,
    handleAnexoDragOver,
    handleAnexoDrop,
    handleAnexoDragEnd,
  };
}
