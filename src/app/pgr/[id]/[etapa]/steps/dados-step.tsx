import { useEffect, useMemo, useState } from "react";
import type {
  ContratanteDraft,
  DadosCadastraisDraft,
  ResponsavelCoordenacaoTecnicaDraft,
} from "./types";
import {
  isValidCnpj,
  isValidCpf,
  isValidEmail,
  isValidPhoneBr,
  isValidRiskGrade,
} from "../validation/br-field-utils";

type SearchableSelectOption = {
  label: string;
  value: string;
};

type PendingDeleteAction =
  | { type: "contractor"; index: number }
  | { type: "technical-coordinator"; index: number };

type ResponsibleCoordinationCatalogItem = {
  id: number;
  name: string;
  jobRole: string;
  phone: string;
  email: string;
  cpf: string;
};

type SearchableSelectComponentProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  buttonClassName: string;
  placeholder?: string;
  searchPlaceholder?: string;
  menuClassName?: string;
  disabled?: boolean;
};

type DadosStepProps = {
  inputBaseClass: string;
  selectBaseClass: string;
  dadosCadastrais: DadosCadastraisDraft;
  estabelecimentoSelecionado: string;
  estabelecimentoOptions: string[];
  SearchableSelect: (props: SearchableSelectComponentProps) => JSX.Element;
  extraFields: Array<{
    id: string;
    title: string;
    value: string;
    scope: "empresa" | "estabelecimento" | "contratante";
  }>;
  onDadosChange: (field: keyof DadosCadastraisDraft, value: string) => void;
  onCepBlur: (scope: "empresa", value: string) => void;
  contractors: ContratanteDraft[];
  onContractorChange: (
    contractorIndex: number,
    field: keyof Omit<ContratanteDraft, "id">,
    value: string
  ) => void;
  onContractorCepBlur: (contractorIndex: number, value: string) => void;
  onAddContractor: () => void;
  onDuplicateContractor: (contractorIndex: number) => void;
  onRemoveContractor: (contractorIndex: number) => void;
  technicalCoordinators: ResponsavelCoordenacaoTecnicaDraft[];
  onTechnicalCoordinatorChange: (
    coordinatorIndex: number,
    field: keyof Omit<ResponsavelCoordenacaoTecnicaDraft, "id">,
    value: string
  ) => void;
  onAddTechnicalCoordinator: () => void;
  onRemoveTechnicalCoordinator: (coordinatorIndex: number) => void;
  onSelectEstabelecimento: (value: string) => void;
  onExtraFieldChange: (
    id: string,
    field: "title" | "value",
    value: string
  ) => void;
  onRemoveExtraField: (id: string) => void;
  onAddExtraField: (scope: "empresa" | "estabelecimento" | "contratante") => void;
  onClearData: () => void;
};

export function DadosStep({
  inputBaseClass,
  selectBaseClass,
  dadosCadastrais,
  estabelecimentoSelecionado,
  estabelecimentoOptions,
  SearchableSelect,
  extraFields,
  onDadosChange,
  onCepBlur,
  contractors,
  onContractorChange,
  onContractorCepBlur,
  onAddContractor,
  onDuplicateContractor,
  onRemoveContractor,
  technicalCoordinators,
  onTechnicalCoordinatorChange,
  onAddTechnicalCoordinator,
  onRemoveTechnicalCoordinator,
  onSelectEstabelecimento,
  onExtraFieldChange,
  onRemoveExtraField,
  onAddExtraField,
  onClearData,
}: DadosStepProps) {
  type RequiredDadosField =
    | "empresaRazaoSocial"
    | "empresaCnpj"
    | "empresaCnae"
    | "empresaEndereco"
    | "empresaCidade"
    | "empresaEstado"
    | "empresaGrauRisco"
    | "estabelecimentoCnpj"
    | "estabelecimentoGrauRisco"
    | "responsavelPgrNome"
    | "responsavelPgrFuncao"
    | "responsavelPgrTelefone"
    | "responsavelPgrEmail"
    | "responsavelPgrCpf";

  type RequiredContratanteField =
    | "nomeFantasia"
    | "razaoSocial"
    | "cnpj"
    | "cnae"
    | "endereco"
    | "cep"
    | "cidade"
    | "estado"
    | "grauRisco"
    | "atividadePrincipal";

  type RequiredResponsavelTecnicoField =
    | "nome"
    | "funcao"
    | "telefone"
    | "email"
    | "cpf";

  const [, setTouchedFields] = useState<Partial<Record<RequiredDadosField, boolean>>>(
    {}
  );
  const [, setTouchedContractorFields] = useState<
    Record<string, Partial<Record<RequiredContratanteField, boolean>>>
  >({});
  const [, setTouchedTechnicalCoordinatorFields] = useState<
    Record<string, Partial<Record<RequiredResponsavelTecnicoField, boolean>>>
  >({});
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] =
    useState<PendingDeleteAction | null>(null);
  const [responsibleCoordinationCatalog, setResponsibleCoordinationCatalog] = useState<
    ResponsibleCoordinationCatalogItem[]
  >([]);

  const errors = useMemo<Record<RequiredDadosField, string>>(
    () => ({
      empresaRazaoSocial: dadosCadastrais.empresaRazaoSocial.trim()
        ? ""
        : "Razão Social é obrigatória.",
      empresaCnpj: !dadosCadastrais.empresaCnpj.trim()
        ? "CNPJ da empresa é obrigatório."
        : isValidCnpj(dadosCadastrais.empresaCnpj)
          ? ""
          : "CNPJ da empresa inválido.",
      empresaCnae: dadosCadastrais.empresaCnae.trim() ? "" : "CNAE da empresa é obrigatório.",
      empresaEndereco: dadosCadastrais.empresaEndereco.trim()
        ? ""
        : "Endereço da empresa é obrigatório.",
      empresaCidade: dadosCadastrais.empresaCidade.trim()
        ? ""
        : "Cidade da empresa é obrigatória.",
      empresaEstado: dadosCadastrais.empresaEstado.trim()
        ? ""
        : "Estado da empresa é obrigatório.",
      empresaGrauRisco: !dadosCadastrais.empresaGrauRisco.trim()
        ? "Grau de risco da empresa é obrigatório."
        : isValidRiskGrade(dadosCadastrais.empresaGrauRisco)
          ? ""
          : "Grau de risco da empresa deve ser entre 1 e 4.",
      estabelecimentoCnpj: !dadosCadastrais.estabelecimentoCnpj.trim()
        ? "CNPJ do estabelecimento é obrigatório."
        : isValidCnpj(dadosCadastrais.estabelecimentoCnpj)
          ? ""
          : "CNPJ do estabelecimento inválido.",
      estabelecimentoGrauRisco: !dadosCadastrais.estabelecimentoGrauRisco.trim()
        ? "Grau de risco do estabelecimento é obrigatório."
        : isValidRiskGrade(dadosCadastrais.estabelecimentoGrauRisco)
          ? ""
          : "Grau de risco do estabelecimento deve ser entre 1 e 4.",
      responsavelPgrNome: dadosCadastrais.responsavelPgrNome.trim()
        ? ""
        : "Nome do responsável é obrigatório.",
      responsavelPgrFuncao: dadosCadastrais.responsavelPgrFuncao.trim()
        ? ""
        : "Função do responsável é obrigatória.",
      responsavelPgrTelefone: !dadosCadastrais.responsavelPgrTelefone.trim()
        ? "Telefone do responsável é obrigatório."
        : isValidPhoneBr(dadosCadastrais.responsavelPgrTelefone)
          ? ""
          : "Telefone do responsável inválido.",
      responsavelPgrEmail: !dadosCadastrais.responsavelPgrEmail.trim()
        ? "E-mail do responsável é obrigatório."
        : isValidEmail(dadosCadastrais.responsavelPgrEmail)
          ? ""
          : "E-mail do responsável inválido.",
      responsavelPgrCpf: !dadosCadastrais.responsavelPgrCpf.trim()
        ? "CPF do responsável é obrigatório."
        : isValidCpf(dadosCadastrais.responsavelPgrCpf)
          ? ""
          : "CPF do responsável inválido.",
    }),
    [dadosCadastrais]
  );

  const contractorErrorsById = useMemo<
    Record<string, Record<RequiredContratanteField, string>>
  >(() => {
    const map: Record<string, Record<RequiredContratanteField, string>> = {};
    contractors.forEach((contractor, contractorIndex) => {
      const contractorKey = String(contractor.id || `contractor-${contractorIndex}`);
      map[contractorKey] = {
        nomeFantasia: contractor.nomeFantasia.trim()
          ? ""
          : "Nome fantasia da contratante é obrigatório.",
        razaoSocial: contractor.razaoSocial.trim()
          ? ""
          : "Razão social da contratante é obrigatória.",
        cnpj: !contractor.cnpj.trim()
          ? "CNPJ da contratante é obrigatório."
          : isValidCnpj(contractor.cnpj)
            ? ""
            : "CNPJ da contratante inválido.",
        cnae: contractor.cnae.trim() ? "" : "CNAE da contratante é obrigatório.",
        endereco: contractor.endereco.trim()
          ? ""
          : "Endereço da contratante é obrigatório.",
        cep: contractor.cep.trim() ? "" : "CEP da contratante é obrigatório.",
        cidade: contractor.cidade.trim() ? "" : "Cidade da contratante é obrigatória.",
        estado: contractor.estado.trim() ? "" : "Estado da contratante é obrigatório.",
        grauRisco: !contractor.grauRisco.trim()
          ? "Grau de risco da contratante é obrigatório."
          : isValidRiskGrade(contractor.grauRisco)
            ? ""
            : "Grau de risco da contratante deve ser entre 1 e 4.",
        atividadePrincipal: contractor.atividadePrincipal.trim()
          ? ""
          : "Atividade principal da contratante é obrigatória.",
      };
    });
    return map;
  }, [contractors]);

  useEffect(() => {
    let isMounted = true;

    const loadResponsibleCoordinationCatalog = async () => {
      try {
        const response = await fetch("/api/catalogs/responsible-coordination", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          responsibleCoordinations?: Array<Partial<ResponsibleCoordinationCatalogItem>>;
        };
        const rows = Array.isArray(payload.responsibleCoordinations)
          ? payload.responsibleCoordinations
          : [];
        if (!isMounted) return;
        setResponsibleCoordinationCatalog(
          rows
            .map((item) => ({
              id: Number(item.id || 0),
              name: String(item.name || "").trim(),
              jobRole: String(item.jobRole || "").trim(),
              phone: String(item.phone || "").trim(),
              email: String(item.email || "").trim(),
              cpf: String(item.cpf || "").trim(),
            }))
            .filter((item) => item.id > 0 && item.name)
        );
      } catch {
        // Mantém fallback local quando o catálogo não puder ser carregado.
      }
    };

    void loadResponsibleCoordinationCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const technicalCoordinatorProfiles = useMemo<
    Array<
      Pick<
        ResponsavelCoordenacaoTecnicaDraft,
        "nome" | "funcao" | "telefone" | "email" | "cpf"
      >
    >
  >(() => {
    if (responsibleCoordinationCatalog.length > 0) {
      return responsibleCoordinationCatalog.map((item) => ({
        nome: item.name,
        funcao: item.jobRole,
        telefone: item.phone,
        email: item.email,
        cpf: item.cpf,
      }));
    }

    const profiles = new Map<
      string,
      Pick<
        ResponsavelCoordenacaoTecnicaDraft,
        "nome" | "funcao" | "telefone" | "email" | "cpf"
      >
    >();

    const addProfile = (
      profile: Pick<
        ResponsavelCoordenacaoTecnicaDraft,
        "nome" | "funcao" | "telefone" | "email" | "cpf"
      >
    ) => {
      const key = profile.nome.trim().toLowerCase();
      if (!key || profiles.has(key)) return;
      profiles.set(key, profile);
    };

    if (dadosCadastrais.responsavelPgrNome.trim()) {
      addProfile({
        nome: dadosCadastrais.responsavelPgrNome,
        funcao: dadosCadastrais.responsavelPgrFuncao,
        telefone: dadosCadastrais.responsavelPgrTelefone,
        email: dadosCadastrais.responsavelPgrEmail,
        cpf: dadosCadastrais.responsavelPgrCpf,
      });
    }

    technicalCoordinators.forEach((coordinator) => {
      addProfile({
        nome: coordinator.nome,
        funcao: coordinator.funcao,
        telefone: coordinator.telefone,
        email: coordinator.email,
        cpf: coordinator.cpf,
      });
    });

    return Array.from(profiles.values());
  }, [
    responsibleCoordinationCatalog,
    dadosCadastrais.responsavelPgrCpf,
    dadosCadastrais.responsavelPgrEmail,
    dadosCadastrais.responsavelPgrFuncao,
    dadosCadastrais.responsavelPgrNome,
    dadosCadastrais.responsavelPgrTelefone,
    technicalCoordinators,
  ]);

  const technicalCoordinatorNameOptions = useMemo(
    () =>
      technicalCoordinatorProfiles.map((profile) => ({
        label: profile.nome,
        value: profile.nome,
      })),
    [technicalCoordinatorProfiles]
  );

  const technicalCoordinatorErrorsById = useMemo<
    Record<string, Record<RequiredResponsavelTecnicoField, string>>
  >(() => {
    const map: Record<string, Record<RequiredResponsavelTecnicoField, string>> = {};
    technicalCoordinators.forEach((coordinator, coordinatorIndex) => {
      const coordinatorKey = String(
        coordinator.id || `technical-coordinator-${coordinatorIndex}`
      );
      map[coordinatorKey] = {
        nome: coordinator.nome.trim() ? "" : "Nome é obrigatório.",
        funcao: coordinator.funcao.trim() ? "" : "Função é obrigatória.",
        telefone: !coordinator.telefone.trim()
          ? "Telefone é obrigatório."
          : isValidPhoneBr(coordinator.telefone)
            ? ""
            : "Telefone inválido.",
        email: !coordinator.email.trim()
          ? "E-mail é obrigatório."
          : isValidEmail(coordinator.email)
            ? ""
            : "E-mail inválido.",
        cpf: !coordinator.cpf.trim()
          ? "CPF é obrigatório."
          : isValidCpf(coordinator.cpf)
            ? ""
            : "CPF inválido.",
      };
    });
    return map;
  }, [technicalCoordinators]);

  const markTouched = (field: RequiredDadosField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const markContractorTouched = (
    contractorKey: string,
    field: RequiredContratanteField
  ) => {
    setTouchedContractorFields((prev) => ({
      ...prev,
      [contractorKey]: {
        ...(prev[contractorKey] || {}),
        [field]: true,
      },
    }));
  };

  const markTechnicalCoordinatorTouched = (
    coordinatorKey: string,
    field: RequiredResponsavelTecnicoField
  ) => {
    setTouchedTechnicalCoordinatorFields((prev) => ({
      ...prev,
      [coordinatorKey]: {
        ...(prev[coordinatorKey] || {}),
        [field]: true,
      },
    }));
  };

  const getFieldClassName = (field: RequiredDadosField) =>
    errors[field]
      ? `${inputBaseClass} border-rose-400 focus:ring-rose-500`
      : inputBaseClass;

  const getDisabledFieldClassName = (className: string) =>
    `${className} cursor-not-allowed opacity-70`;

  const handleTechnicalCoordinatorNameSelect = (
    coordinatorIndex: number,
    selectedName: string
  ) => {
    const selectedProfile = technicalCoordinatorProfiles.find(
      (profile) => profile.nome === selectedName
    );

    onTechnicalCoordinatorChange(coordinatorIndex, "nome", selectedName);
    onTechnicalCoordinatorChange(
      coordinatorIndex,
      "funcao",
      selectedProfile?.funcao || ""
    );
    onTechnicalCoordinatorChange(
      coordinatorIndex,
      "telefone",
      selectedProfile?.telefone || ""
    );
    onTechnicalCoordinatorChange(
      coordinatorIndex,
      "email",
      selectedProfile?.email || ""
    );
    onTechnicalCoordinatorChange(
      coordinatorIndex,
      "cpf",
      selectedProfile?.cpf || ""
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteAction) return;
    if (pendingDeleteAction.type === "contractor") {
      onRemoveContractor(pendingDeleteAction.index);
    } else {
      onRemoveTechnicalCoordinator(pendingDeleteAction.index);
    }
    setPendingDeleteAction(null);
  };

  const getContractorFieldClassName = (
    contractorKey: string,
    field: RequiredContratanteField
  ) =>
    contractorErrorsById[contractorKey]?.[field]
      ? `${inputBaseClass} border-rose-400 focus:ring-rose-500`
      : inputBaseClass;

  const getTechnicalCoordinatorFieldClassName = (
    coordinatorKey: string,
    field: RequiredResponsavelTecnicoField
  ) =>
    technicalCoordinatorErrorsById[coordinatorKey]?.[field]
      ? `${inputBaseClass} border-rose-400 focus:ring-rose-500`
      : inputBaseClass;

  const empresaExtraFields = extraFields.filter((field) => field.scope === "empresa");
  const estabelecimentoExtraFields = extraFields.filter(
    (field) => field.scope === "estabelecimento"
  );
  const contratanteExtraFields = extraFields.filter(
    (field) => field.scope === "contratante"
  );

  const renderExtraFields = (
    fields: Array<{ id: string; title: string; value: string }>
  ) => {
    if (!fields.length) return null;
    return (
      <div className="mt-6 space-y-4">
        <p className="text-[12px] font-semibold text-foreground">Campos adicionais</p>
        {fields.map((field, index) => (
          <div key={field.id}>
            <div className="flex items-center justify-between gap-3">
              <label className="text-[12px] font-medium text-foreground">
                Campo adicional {index + 1}
              </label>
              <button
                type="button"
                onClick={() => onRemoveExtraField(field.id)}
                className="btn-outline px-3 py-1 text-[12px] text-danger hover:bg-danger/10"
              >
                Excluir
              </button>
            </div>
            <div className="mt-2 space-y-3">
              <input
                className={inputBaseClass}
                value={field.title}
                onChange={(event) =>
                  onExtraFieldChange(field.id, "title", event.target.value)
                }
                placeholder="Título do campo"
              />
              <input
                className={inputBaseClass}
                value={field.value}
                onChange={(event) =>
                  onExtraFieldChange(field.id, "value", event.target.value)
                }
                placeholder="Valor"
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleCepInputChange = (
    scope: "empresa",
    value: string,
    field: "empresaCep"
  ) => {
    onDadosChange(field, value);
    if (value.replace(/\D/g, "").length === 8) {
      onCepBlur(scope, value);
    }
  };

  return (
    <>
      <section className="px-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Dados cadastrais
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Preencha os dados da empresa, estabelecimento e contratante
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="btn-outline border-rose-300 px-4 text-rose-600 hover:bg-rose-50"
          >
            Limpar dados da etapa
          </button>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <h2 className="text-[16px] font-medium text-foreground">
          Identificação da Empresa:
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1.2fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Razão Social *:
            </label>
            <input
              className={getFieldClassName("empresaRazaoSocial")}
              value={dadosCadastrais.empresaRazaoSocial}
              onChange={(event) =>
                onDadosChange("empresaRazaoSocial", event.target.value)
              }
              onBlur={() => markTouched("empresaRazaoSocial")}
            />
            {errors.empresaRazaoSocial ? (
              <p className="mt-1 text-[12px] text-danger">{errors.empresaRazaoSocial}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Grupo:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaGrupo}
              onChange={(event) =>
                onDadosChange("empresaGrupo", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              CNPJ *:
            </label>
            <input
              className={getFieldClassName("empresaCnpj")}
              value={dadosCadastrais.empresaCnpj}
              onChange={(event) =>
                onDadosChange("empresaCnpj", event.target.value)
              }
              onBlur={() => markTouched("empresaCnpj")}
            />
            {errors.empresaCnpj ? (
              <p className="mt-1 text-[12px] text-danger">{errors.empresaCnpj}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Empresa:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaNome}
              onChange={(event) =>
                onDadosChange("empresaNome", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              CNAE *:
            </label>
            <input
              className={getFieldClassName("empresaCnae")}
              value={dadosCadastrais.empresaCnae}
              onChange={(event) =>
                onDadosChange("empresaCnae", event.target.value)
              }
              onBlur={() => markTouched("empresaCnae")}
            />
            {errors.empresaCnae ? (
              <p className="mt-1 text-[12px] text-danger">{errors.empresaCnae}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Endereço *
            </label>
            <input
              className={getFieldClassName("empresaEndereco")}
              value={dadosCadastrais.empresaEndereco}
              onChange={(event) =>
                onDadosChange("empresaEndereco", event.target.value)
              }
              onBlur={() => markTouched("empresaEndereco")}
            />
            {errors.empresaEndereco ? (
              <p className="mt-1 text-[12px] text-danger">{errors.empresaEndereco}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CEP:</label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaCep}
              onChange={(event) =>
                handleCepInputChange("empresa", event.target.value, "empresaCep")
              }
              onBlur={(event) => onCepBlur("empresa", event.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Cidade *:
            </label>
            <input
              className={getFieldClassName("empresaCidade")}
              value={dadosCadastrais.empresaCidade}
              onChange={(event) =>
                onDadosChange("empresaCidade", event.target.value)
              }
              onBlur={() => markTouched("empresaCidade")}
            />
            {errors.empresaCidade ? (
              <p className="mt-1 text-[12px] text-danger">{errors.empresaCidade}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Estado *:
            </label>
            <input
              className={getFieldClassName("empresaEstado")}
              value={dadosCadastrais.empresaEstado}
              onChange={(event) =>
                onDadosChange("empresaEstado", event.target.value)
              }
              onBlur={() => markTouched("empresaEstado")}
            />
            {errors.empresaEstado ? (
              <p className="mt-1 text-[12px] text-danger">{errors.empresaEstado}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Grau de Risco *:
            </label>
            <input
              className={getFieldClassName("empresaGrauRisco")}
              value={dadosCadastrais.empresaGrauRisco}
              onChange={(event) =>
                onDadosChange("empresaGrauRisco", event.target.value)
              }
              onBlur={() => markTouched("empresaGrauRisco")}
            />
            {errors.empresaGrauRisco ? (
              <p className="mt-1 text-[12px] text-danger">{errors.empresaGrauRisco}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Descrição de Atividade Principal:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaAtividadePrincipal}
              onChange={(event) =>
                onDadosChange("empresaAtividadePrincipal", event.target.value)
              }
            />
          </div>
        </div>

        {renderExtraFields(empresaExtraFields)}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onAddExtraField("empresa")}
            className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
          >
            Adicionar Campo
          </button>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <h2 className="text-[16px] font-medium text-foreground">
          Identificação da Estabelecimento:
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1.2fr_1fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Nome do Estabelecimento:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoNome}
              onChange={(event) =>
                onDadosChange("estabelecimentoNome", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CNPJ *:</label>
            <input
              className={getFieldClassName("estabelecimentoCnpj")}
              value={dadosCadastrais.estabelecimentoCnpj}
              onChange={(event) =>
                onDadosChange("estabelecimentoCnpj", event.target.value)
              }
              onBlur={() => markTouched("estabelecimentoCnpj")}
            />
            {errors.estabelecimentoCnpj ? (
              <p className="mt-1 text-[12px] text-danger">{errors.estabelecimentoCnpj}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Estabelecimento:
            </label>
            <div className="mt-2">
              <SearchableSelect
                value={estabelecimentoSelecionado}
                onChange={onSelectEstabelecimento}
                options={estabelecimentoOptions.map((option) => ({
                  label: option,
                  value: option,
                }))}
                buttonClassName={selectBaseClass}
                placeholder="Selecione"
                searchPlaceholder="Filtrar estabelecimento"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Razão Social:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoRazaoSocial}
              onChange={(event) =>
                onDadosChange("estabelecimentoRazaoSocial", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              CNAE:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoCnae}
              onChange={(event) =>
                onDadosChange("estabelecimentoCnae", event.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Grau de Risco *:
            </label>
            <input
              className={getFieldClassName("estabelecimentoGrauRisco")}
              value={dadosCadastrais.estabelecimentoGrauRisco}
              onChange={(event) =>
                onDadosChange("estabelecimentoGrauRisco", event.target.value)
              }
              onBlur={() => markTouched("estabelecimentoGrauRisco")}
            />
            {errors.estabelecimentoGrauRisco ? (
              <p className="mt-1 text-[12px] text-danger">
                {errors.estabelecimentoGrauRisco}
              </p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Descrição de Atividade Principal:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoAtividadePrincipal}
              onChange={(event) =>
                onDadosChange(
                  "estabelecimentoAtividadePrincipal",
                  event.target.value
                )
              }
            />
          </div>
        </div>

        {renderExtraFields(estabelecimentoExtraFields)}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onAddExtraField("estabelecimento")}
            className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
          >
            Adicionar Campo
          </button>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-[16px] font-medium text-foreground">
            Identificação da Contratante:
          </h2>
          <button
            type="button"
            onClick={onAddContractor}
            className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
          >
            Adicionar contratante
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {contractors.map((contractor, contractorIndex) => {
            const contractorKey = String(contractor.id || `contractor-${contractorIndex}`);
            return (
            <div
              key={contractor.id}
              className="rounded-[12px] border border-border/60 bg-background/40 px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-foreground">
                  Contratante {contractorIndex + 1}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDuplicateContractor(contractorIndex)}
                    className="btn-outline px-3 py-1 text-[12px]"
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDeleteAction({
                        type: "contractor",
                        index: contractorIndex,
                      })
                    }
                    className="btn-outline px-3 py-1 text-[12px] text-danger hover:bg-danger/10"
                    disabled={contractors.length <= 0}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1.6fr_1.1fr_1fr]">
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    Nome Fantasia *:
                  </label>
                  <input
                    className={getContractorFieldClassName(
                      contractorKey,
                      "nomeFantasia"
                    )}
                    value={contractor.nomeFantasia}
                    onChange={(event) =>
                      onContractorChange(
                        contractorIndex,
                        "nomeFantasia",
                        event.target.value
                      )
                    }
                    onBlur={() => markContractorTouched(contractorKey, "nomeFantasia")}
                  />
                  {contractorErrorsById[contractorKey]?.nomeFantasia ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].nomeFantasia}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    Razão social *:
                  </label>
                  <input
                    className={getContractorFieldClassName(contractorKey, "razaoSocial")}
                    value={contractor.razaoSocial}
                    onChange={(event) =>
                      onContractorChange(
                        contractorIndex,
                        "razaoSocial",
                        event.target.value
                      )
                    }
                    onBlur={() => markContractorTouched(contractorKey, "razaoSocial")}
                  />
                  {contractorErrorsById[contractorKey]?.razaoSocial ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].razaoSocial}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    CNPJ *:
                  </label>
                  <input
                    className={getContractorFieldClassName(contractorKey, "cnpj")}
                    value={contractor.cnpj}
                    onChange={(event) =>
                      onContractorChange(contractorIndex, "cnpj", event.target.value)
                    }
                    onBlur={() => markContractorTouched(contractorKey, "cnpj")}
                  />
                  {contractorErrorsById[contractorKey]?.cnpj ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].cnpj}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    CNAE *:
                  </label>
                  <input
                    className={getContractorFieldClassName(contractorKey, "cnae")}
                    value={contractor.cnae}
                    onChange={(event) =>
                      onContractorChange(contractorIndex, "cnae", event.target.value)
                    }
                    onBlur={() => markContractorTouched(contractorKey, "cnae")}
                  />
                  {contractorErrorsById[contractorKey]?.cnae ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].cnae}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    Endereço *
                  </label>
                  <input
                    className={getContractorFieldClassName(contractorKey, "endereco")}
                    value={contractor.endereco}
                    onChange={(event) =>
                      onContractorChange(
                        contractorIndex,
                        "endereco",
                        event.target.value
                      )
                    }
                    onBlur={() => markContractorTouched(contractorKey, "endereco")}
                  />
                  {contractorErrorsById[contractorKey]?.endereco ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].endereco}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    CEP *:
                  </label>
                  <input
                    className={getContractorFieldClassName(contractorKey, "cep")}
                    value={contractor.cep}
                    onChange={(event) =>
                      onContractorChange(contractorIndex, "cep", event.target.value)
                    }
                    onBlur={(event) =>
                      (markContractorTouched(contractorKey, "cep"),
                      onContractorCepBlur(contractorIndex, event.target.value)
                      )
                    }
                  />
                  {contractorErrorsById[contractorKey]?.cep ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].cep}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    Cidade *:
                  </label>
                  <input
                    className={getContractorFieldClassName(contractorKey, "cidade")}
                    value={contractor.cidade}
                    onChange={(event) =>
                      onContractorChange(
                        contractorIndex,
                        "cidade",
                        event.target.value
                      )
                    }
                    onBlur={() => markContractorTouched(contractorKey, "cidade")}
                  />
                  {contractorErrorsById[contractorKey]?.cidade ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].cidade}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    Estado *:
                  </label>
                  <input
                    className={getContractorFieldClassName(contractorKey, "estado")}
                    value={contractor.estado}
                    onChange={(event) =>
                      onContractorChange(
                        contractorIndex,
                        "estado",
                        event.target.value
                      )
                    }
                    onBlur={() => markContractorTouched(contractorKey, "estado")}
                  />
                  {contractorErrorsById[contractorKey]?.estado ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].estado}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    Grau de Risco *:
                  </label>
                  <input
                    className={getContractorFieldClassName(contractorKey, "grauRisco")}
                    value={contractor.grauRisco}
                    onChange={(event) =>
                      onContractorChange(
                        contractorIndex,
                        "grauRisco",
                        event.target.value
                      )
                    }
                    onBlur={() => markContractorTouched(contractorKey, "grauRisco")}
                  />
                  {contractorErrorsById[contractorKey]?.grauRisco ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].grauRisco}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    Descrição de Atividade Principal *:
                  </label>
                  <input
                    className={getContractorFieldClassName(
                      contractorKey,
                      "atividadePrincipal"
                    )}
                    value={contractor.atividadePrincipal}
                    onChange={(event) =>
                      onContractorChange(
                        contractorIndex,
                        "atividadePrincipal",
                        event.target.value
                      )
                    }
                    onBlur={() =>
                      markContractorTouched(contractorKey, "atividadePrincipal")
                    }
                  />
                  {contractorErrorsById[contractorKey]?.atividadePrincipal ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {contractorErrorsById[contractorKey].atividadePrincipal}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {renderExtraFields(contratanteExtraFields)}

        {contractors.length > 0 ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => onAddExtraField("contratante")}
              className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
            >
              Adicionar Campo
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <h2 className="text-[16px] font-medium text-foreground">
          Responsável pelo PGR na Organização:
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.6fr_1.2fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Nome *:
            </label>
            <input
              className={getFieldClassName("responsavelPgrNome")}
              value={dadosCadastrais.responsavelPgrNome}
              onChange={(event) =>
                onDadosChange("responsavelPgrNome", event.target.value)
              }
              onBlur={() => markTouched("responsavelPgrNome")}
            />
            {errors.responsavelPgrNome ? (
              <p className="mt-1 text-[12px] text-danger">{errors.responsavelPgrNome}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Função *:
            </label>
            <input
              className={getFieldClassName("responsavelPgrFuncao")}
              value={dadosCadastrais.responsavelPgrFuncao}
              onChange={(event) =>
                onDadosChange("responsavelPgrFuncao", event.target.value)
              }
              onBlur={() => markTouched("responsavelPgrFuncao")}
            />
            {errors.responsavelPgrFuncao ? (
              <p className="mt-1 text-[12px] text-danger">{errors.responsavelPgrFuncao}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_0.9fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Telefone *:
            </label>
            <input
              className={getFieldClassName("responsavelPgrTelefone")}
              value={dadosCadastrais.responsavelPgrTelefone}
              onChange={(event) =>
                onDadosChange("responsavelPgrTelefone", event.target.value)
              }
              onBlur={() => markTouched("responsavelPgrTelefone")}
            />
            {errors.responsavelPgrTelefone ? (
              <p className="mt-1 text-[12px] text-danger">{errors.responsavelPgrTelefone}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Email *:
            </label>
            <input
              className={getFieldClassName("responsavelPgrEmail")}
              value={dadosCadastrais.responsavelPgrEmail}
              onChange={(event) =>
                onDadosChange("responsavelPgrEmail", event.target.value)
              }
              onBlur={() => markTouched("responsavelPgrEmail")}
            />
            {errors.responsavelPgrEmail ? (
              <p className="mt-1 text-[12px] text-danger">{errors.responsavelPgrEmail}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CPF *:</label>
            <input
              className={getFieldClassName("responsavelPgrCpf")}
              value={dadosCadastrais.responsavelPgrCpf}
              onChange={(event) =>
                onDadosChange("responsavelPgrCpf", event.target.value)
              }
              onBlur={() => markTouched("responsavelPgrCpf")}
            />
            {errors.responsavelPgrCpf ? (
              <p className="mt-1 text-[12px] text-danger">{errors.responsavelPgrCpf}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-[16px] font-medium text-foreground">
            Responsável na coordenação técnica:
          </h2>
          <button
            type="button"
            onClick={onAddTechnicalCoordinator}
            className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
          >
            Adicionar responsável técnico
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {technicalCoordinators.map((coordinator, coordinatorIndex) => {
            const coordinatorKey = String(
              coordinator.id || `technical-coordinator-${coordinatorIndex}`
            );

            return (
              <div
                key={coordinator.id}
                className="rounded-[12px] border border-border/60 bg-background/40 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-foreground">
                    Responsável técnico {coordinatorIndex + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDeleteAction({
                        type: "technical-coordinator",
                        index: coordinatorIndex,
                      })
                    }
                    className="btn-outline px-3 py-1 text-[12px] text-danger hover:bg-danger/10"
                    disabled={technicalCoordinators.length <= 1}
                  >
                    Excluir
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1.6fr_1.2fr]">
                  <div>
                    <label className="text-[12px] font-medium text-foreground">
                      Nome *:
                    </label>
                    <div className="mt-2">
                      <SearchableSelect
                        value={coordinator.nome}
                        onChange={(value) => {
                          handleTechnicalCoordinatorNameSelect(coordinatorIndex, value);
                          markTechnicalCoordinatorTouched(coordinatorKey, "nome");
                        }}
                        options={technicalCoordinatorNameOptions}
                        buttonClassName={
                          technicalCoordinatorErrorsById[coordinatorKey]?.nome
                            ? `${selectBaseClass} border-rose-400 focus:ring-rose-500`
                            : selectBaseClass
                        }
                        placeholder="Selecione"
                        searchPlaceholder="Filtrar responsável"
                      />
                    </div>
                    {technicalCoordinatorErrorsById[coordinatorKey]?.nome ? (
                      <p className="mt-1 text-[12px] text-danger">
                        {technicalCoordinatorErrorsById[coordinatorKey].nome}
                      </p>
                    ) : null}
                    {technicalCoordinatorNameOptions.length === 0 ? (
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        Preencha o responsável do PGR para liberar opções.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-foreground">
                      Função *:
                    </label>
                    <input
                      className={getDisabledFieldClassName(
                        getTechnicalCoordinatorFieldClassName(coordinatorKey, "funcao")
                      )}
                      value={coordinator.funcao}
                      disabled
                      readOnly
                    />
                    {technicalCoordinatorErrorsById[coordinatorKey]?.funcao ? (
                      <p className="mt-1 text-[12px] text-danger">
                        {technicalCoordinatorErrorsById[coordinatorKey].funcao}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_0.9fr]">
                  <div>
                    <label className="text-[12px] font-medium text-foreground">
                      Telefone *:
                    </label>
                    <input
                      className={getDisabledFieldClassName(
                        getTechnicalCoordinatorFieldClassName(coordinatorKey, "telefone")
                      )}
                      value={coordinator.telefone}
                      disabled
                      readOnly
                    />
                    {technicalCoordinatorErrorsById[coordinatorKey]?.telefone ? (
                      <p className="mt-1 text-[12px] text-danger">
                        {technicalCoordinatorErrorsById[coordinatorKey].telefone}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-foreground">
                      Email *:
                    </label>
                    <input
                      className={getDisabledFieldClassName(
                        getTechnicalCoordinatorFieldClassName(coordinatorKey, "email")
                      )}
                      value={coordinator.email}
                      disabled
                      readOnly
                    />
                    {technicalCoordinatorErrorsById[coordinatorKey]?.email ? (
                      <p className="mt-1 text-[12px] text-danger">
                        {technicalCoordinatorErrorsById[coordinatorKey].email}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-foreground">
                      CPF *:
                    </label>
                    <input
                      className={getDisabledFieldClassName(
                        getTechnicalCoordinatorFieldClassName(coordinatorKey, "cpf")
                      )}
                      value={coordinator.cpf}
                      disabled
                      readOnly
                    />
                    {technicalCoordinatorErrorsById[coordinatorKey]?.cpf ? (
                      <p className="mt-1 text-[12px] text-danger">
                        {technicalCoordinatorErrorsById[coordinatorKey].cpf}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {pendingDeleteAction ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <h3 className="text-[18px] font-semibold text-foreground">
                Confirmar exclusão
              </h3>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {pendingDeleteAction.type === "contractor"
                  ? "Confirma a exclusão deste bloco de contratante?"
                  : "Confirma a exclusão deste bloco de responsável técnico?"}
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDeleteAction(null)}
                  className="btn-outline px-4"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="btn-primary px-5"
                >
                  Confirmar exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isResetModalOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <h3 className="text-[18px] font-semibold text-foreground">
                Confirmar limpeza
              </h3>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Todos os dados preenchidos serão removidos. Deseja continuar?
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="btn-outline px-4"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearData();
                    setIsResetModalOpen(false);
                  }}
                  className="btn-primary px-5"
                >
                  Confirmar limpeza
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
