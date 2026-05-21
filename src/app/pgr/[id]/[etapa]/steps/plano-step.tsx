import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ChevronDown, MinusCircle, Pencil, Search } from "lucide-react";
import { SearchableSelect, type SearchableSelectProps } from "./searchable-select";

type PlanoStepProps = {
  ctx: {
    inputBaseClass: string;
    textareaBaseClass: string;
    selectBaseClass: string;
    defaultResponsibleActionName: string;
    handleResetPlanoData: () => void;
    historicoChanges: Array<{
      date: string;
      analysis?: string;
      change?: string;
    }>;
    workflowVersion: number;
    planAction: { nr: string; vigencia: string };
    maskDate: (value: string) => string;
    setPlanAction: Dispatch<SetStateAction<{ nr: string; vigencia: string }>>;
    planTableRows: Array<{
      id: string;
      gheId: string;
      riskId: string;
      gheName: string;
      tipoAgente: string;
      descricaoAgente: string;
      prioridade: string;
      classificacao: string;
      exposureValue?: number;
      medidasPrevencao: string;
      tipoMedida?: string;
      prazoAcao?: string;
      responsavelAcao?: string;
      acompanhamento?: string;
      afericaoResultado?: string;
      groupTargets?: Array<{ gheId: string; riskId: string }>;
    }>;
    planTableRowsPage: Array<{
      id: string;
      gheId: string;
      riskId: string;
      gheName: string;
      tipoAgente: string;
      descricaoAgente: string;
      prioridade: string;
      classificacao: string;
      exposureValue?: number;
      medidasPrevencao: string;
      tipoMedida?: string;
      prazoAcao?: string;
      responsavelAcao?: string;
      acompanhamento?: string;
      afericaoResultado?: string;
      groupTargets?: Array<{ gheId: string; riskId: string }>;
    }>;
    getActionDescriptionOptions: (
      tipoAgente: string,
      descricaoAgente: string,
      currentValue: string
    ) => string[];
    handlePlanMedidasChange: (
      gheId: string,
      riskId: string,
      value: string,
      groupTargets?: Array<{ gheId: string; riskId: string }>
    ) => void;
    handlePlanRiskFieldChange: (
      gheId: string,
      riskId: string,
      field:
        | "tipoMedida"
        | "prazoAcao"
        | "responsavelAcao"
        | "acompanhamento"
        | "afericaoResultado",
      value: string,
      groupTargets?: Array<{ gheId: string; riskId: string }>
    ) => void;
    handleDeleteMedidas: (
      gheId: string,
      riskId: string,
      groupTargets?: Array<{ gheId: string; riskId: string }>
    ) => void;
    planTableCurrentPage: number;
    planTableTotalPages: number;
    setPlanTablePage: Dispatch<SetStateAction<number>>;
    isPlanActionModalOpen: boolean;
    setIsPlanActionModalOpen: Dispatch<SetStateAction<boolean>>;
    handleOpenPlanActionModal: () => void;
    handleChangePlanActionScope: (scope: "all" | "ghe" | "risk") => void;
    planActionScope: "all" | "ghe" | "risk";
    planActionGheId: string;
    handlePlanActionGheChange: (value: string) => void;
    planActionGheOptions: SearchableSelectProps["options"];
    planActionRiskId: string;
    setPlanActionRiskId: Dispatch<SetStateAction<string>>;
    planActionRiskOptions: SearchableSelectProps["options"];
    planActionDescription: string;
    setPlanActionDescription: Dispatch<SetStateAction<string>>;
    handleSavePlanActionModal: (options?: { riskIds?: string[]; gheIds?: string[] }) => void;
    handleCreateNrPlanRows: (nr: string, actions: string[]) => void;
  };
};

export function PlanoStep({ ctx }: PlanoStepProps) {
  const nrActionPresets: Record<string, string[]> = {
    "NR-01": [
      "Antecipação dos riscos no local de trabalho",
      "Reconhecimento dos riscos no local de trabalho",
      "Implantar Procedimento para Fluxo de Atendimento à Emergências e Investigação de Acidentes de Trabalho.",
      "Implementar Matriz de Capacitação para acompanhamento de todos os treinamentos legais vigentes para atendimentos aos requisitos legais",
      "Divulgar o PGR a todos os colaboradores da empresa, conforme o item 1.4.1 da NR 01",
    ],
    "NR-18": [
      "Projeto/layout da área de vivência do canteiro de obras e de eventual frente de trabalho",
      "Plano de atendimento à emergências",
      "Projetos dos sistemas de proteção coletiva",
      "Projetos dos sistemas de proteção individual contra quedas (SPIQ)",
      "Projeto elétrico das instalações temporárias",
      "Relação dos equipamentos de proteção individual (EPI) e suas respectivas especificações técnicas",
      "Matriz de EPI x função",
      "Procedimento de investigação de acidentes",
      "Anotação de responsabilidade técnica",
    ],
    "NR-29": [
      "Fornecer as informações dos riscos ocupacionais sob a gestão da empresa que possam impactar as atividades da administração portuária e do OGMO",
      "Informar as medidas de prevenção para os operadores portuários, tomadores de serviço, empregadores e OGMO que atuem em suas dependências",
      "Elaborar, manter de forma acessível aos trabalhadores e anexar no PGR os procedimentos relacionados ao subitem 29.4.6 da NR-29",
    ],
    "NR-30": [
      "Procedimentos de segurança nas atividades de manutenção em embarcação em operação",
      "Orientação aos trabalhadores quanto aos procedimentos a serem adotados na ocorrência de condições climáticas extremas e interrupção das atividades nessas situações",
      "Procedimentos de acesso seguro à embarcação atracada e fundeada",
      "Procedimentos seguros de movimentação de carga",
      "Procedimentos de segurança nas atividades que envolvam outras embarcações, balsas, plataformas de petróleo e demais unidades marítimas;",
      "Procedimentos de segurança nas manobras de atracação e fundeio",
    ],
  };

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const parseMultiTextValues = (value: string) =>
    value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const toMultiTextValue = (values: string[]) =>
    Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).join(", ");

  const parseHistoricoDate = (raw: string) => {
    const value = String(raw || "").trim();
    if (!value) return null;
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (isoMatch) {
      const date = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/);
    if (brMatch) {
      const date = new Date(Date.UTC(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1])));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  const extractVersionNumber = (raw: string) => {
    const value = String(raw || "").trim();
    if (!value) return null;
    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const versionMatch = normalized.match(/(?:versao|v)\s*0*(\d{1,4})/);
    if (versionMatch) {
      const parsed = Number(versionMatch[1]);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    const pureDigitsMatch = normalized.match(/^0*(\d{1,4})$/);
    if (pureDigitsMatch) {
      const parsed = Number(pureDigitsMatch[1]);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    return null;
  };

  const toIsoDate = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const addDays = (date: Date, days: number) => {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  };


  const {
    inputBaseClass,
    textareaBaseClass,
    selectBaseClass,
    defaultResponsibleActionName,
    handleResetPlanoData,
    historicoChanges,
    workflowVersion,
    planAction,
    maskDate,
    setPlanAction,
    planTableRows,
    planTableRowsPage,
    getActionDescriptionOptions,
    handlePlanRiskFieldChange,
    handlePlanMedidasChange,
    handleDeleteMedidas,
    planTableCurrentPage,
    planTableTotalPages,
    setPlanTablePage,
    isPlanActionModalOpen,
    setIsPlanActionModalOpen,
    handleOpenPlanActionModal,
    handleChangePlanActionScope,
    planActionScope,
    planActionGheId,
    handlePlanActionGheChange,
    planActionGheOptions,
    planActionRiskId,
    setPlanActionRiskId,
    planActionRiskOptions,
    planActionDescription,
    setPlanActionDescription,
    handleSavePlanActionModal,
    handleCreateNrPlanRows,
  } = ctx;
  const tableControlClass =
    "h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const tableSelectClass = tableControlClass;
  const tableInputClass = tableControlClass;
  const defaultAcompanhamento = "Programado";
  const defaultAfericaoResultado = "Aguardando realização da Ação";

  const [, setTouchedPlanActionDescription] = useState(false);
  const [selectedPlanActionGheIds, setSelectedPlanActionGheIds] = useState<string[]>([]);
  const [, setTouchedPlanActionGheSelection] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<null | {
    gheId: string;
    riskId: string;
    groupTargets?: Array<{ gheId: string; riskId: string }>;
  }>(null);
  const [tipoMedidaByRowId, setTipoMedidaByRowId] = useState<Record<string, string>>(
    {}
  );
  const [responsavelAcaoByRowId, setResponsavelAcaoByRowId] = useState<
    Record<string, string>
  >({});
  const [prazoAcaoByRowId, setPrazoAcaoByRowId] = useState<Record<string, string>>(
    {}
  );
  const [acompanhamentoByRowId, setAcompanhamentoByRowId] = useState<
    Record<string, string>
  >({});
  const [afericaoResultadoByRowId, setAfericaoResultadoByRowId] = useState<
    Record<string, string>
  >({});
  const [openMedidasMultiSelectRowId, setOpenMedidasMultiSelectRowId] = useState<
    string | null
  >(null);
  const [medidasMultiSelectQuery, setMedidasMultiSelectQuery] = useState("");

  const dataEmissaoBase = useMemo(() => {
    const currentVersion = Math.max(1, Number(workflowVersion || 1));
    const normalizedChanges = historicoChanges
      .map((item) => ({
        date: parseHistoricoDate(item.date),
        analysisVersion: extractVersionNumber(item.analysis || ""),
        changeVersion: extractVersionNumber(item.change || ""),
      }))
      .filter((item): item is {
        date: Date;
        analysisVersion: number | null;
        changeVersion: number | null;
      } => Boolean(item.date));

    const matchedCurrentVersion = normalizedChanges.filter(
      (item) =>
        item.analysisVersion === currentVersion ||
        item.changeVersion === currentVersion
    );

    if (matchedCurrentVersion.length > 0) {
      const mostRecentCurrentVersion = matchedCurrentVersion.sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      )[0];
      return mostRecentCurrentVersion?.date ?? null;
    }

    const mostRecentAnyVersion = normalizedChanges.sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    )[0];
    return mostRecentAnyVersion?.date ?? null;
  }, [historicoChanges, workflowVersion]);

  useEffect(() => {
    if (!dataEmissaoBase) return;
    const getPrazoDaysByPriority = (prioridade: string, classificacao: string) => {
      const text = normalizeText(`${prioridade} ${classificacao}`);
      if (text.includes("critic")) return 30;
      if (text.includes("alt")) return 90;
      if (text.includes("moderad")) return 180;
      return null;
    };

    planTableRows.forEach((row) => {
      const hasExistingPrazo = Boolean(
        String(prazoAcaoByRowId[row.id] ?? row.prazoAcao ?? "").trim()
      );
      if (hasExistingPrazo) return;

      const days = getPrazoDaysByPriority(row.prioridade || "", row.classificacao || "");
      if (!days) return;
      const prazoCalculado = toIsoDate(addDays(dataEmissaoBase, days));

      setPrazoAcaoByRowId((prev) =>
        prev[row.id] ? prev : { ...prev, [row.id]: prazoCalculado }
      );
      handlePlanRiskFieldChange(
        row.gheId,
        row.riskId,
        "prazoAcao",
        prazoCalculado,
        row.groupTargets
      );
    });
  }, [dataEmissaoBase, handlePlanRiskFieldChange, planTableRows, prazoAcaoByRowId]);

  useEffect(() => {
    if (!isPlanActionModalOpen) return;
    setTouchedPlanActionDescription(false);
    setTouchedPlanActionGheSelection(false);
  }, [isPlanActionModalOpen]);

  useEffect(() => {
    if (!isPlanActionModalOpen) return;
    if (planActionScope !== "risk" && planActionScope !== "all") {
      setSelectedPlanActionGheIds([]);
      return;
    }

    const availableGheIds = planActionGheOptions.map((option) =>
      String(option.value)
    );
    if (!availableGheIds.length) {
      setSelectedPlanActionGheIds([]);
      return;
    }

    setSelectedPlanActionGheIds((prev) => {
      if (planActionScope === "all") return availableGheIds;
      const next = prev.filter((id) => availableGheIds.includes(id));
      if (next.length) return next;
      if (planActionGheId && availableGheIds.includes(planActionGheId)) {
        return [planActionGheId];
      }
      return [availableGheIds[0]];
    });
  }, [
    isPlanActionModalOpen,
    planActionScope,
    planActionGheId,
    planActionGheOptions,
  ]);

  useEffect(() => {
    if (!openMedidasMultiSelectRowId) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-medidas-multiselect]")) return;
      setOpenMedidasMultiSelectRowId(null);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [openMedidasMultiSelectRowId]);

  useEffect(() => {
    if (!openMedidasMultiSelectRowId) return;
    setMedidasMultiSelectQuery("");
  }, [openMedidasMultiSelectRowId]);

  const planActionDescriptionError = planActionDescription.trim()
    ? ""
    : "Descrição da ação é obrigatória.";
  const shouldValidateGheBatchSelection =
    planActionScope === "risk" || planActionScope === "all";
  const planActionGheSelectionError =
    shouldValidateGheBatchSelection &&
    planActionGheOptions.length > 0 &&
    selectedPlanActionGheIds.length === 0
      ? "Selecione ao menos um GHE."
      : "";

  const getPlanActionDescriptionClassName = () =>
    planActionDescriptionError
      ? `${textareaBaseClass} min-h-[120px] border-rose-400 focus:ring-rose-500`
      : `${textareaBaseClass} min-h-[120px]`;

  const filterOptionsByQuery = (options: string[]) => {
    const term = normalizeText(medidasMultiSelectQuery.trim());
    if (!term) return options;
    return options.filter((option) => normalizeText(option).includes(term));
  };

  const handleNrPresetClick = (nr: string) => {
    setPlanAction((prev) => ({ ...prev, nr }));
    const presetActions = nrActionPresets[nr] ?? [];
    handleCreateNrPlanRows(nr, presetActions);
  };

  return (
    <>
      <section className="px-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Plano de Ação
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Defina as ações para mitigação dos riscos identificados
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="btn-outline border-rose-300 px-4 text-rose-600 hover:bg-rose-50"
            >
              Limpar dados da etapa
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div>
            <p className="text-[12px] font-semibold text-muted-foreground">NRs</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "NR-01",
                "NR-06",
                "NR-07",
                "NR-09",
                "NR-10",
                "NR-12",
                "NR-17",
                "NR-18",
                "NR-29",
                "NR-30",
                "NR-33",
                "NR-35",
              ].map((nr) => (
                <button
                  key={nr}
                  type="button"
                  onClick={() => handleNrPresetClick(nr)}
                  className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                    planAction.nr === nr
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {nr}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground">
              Vigência (DD/MM/AAAA)
            </label>
            <input
              className={inputBaseClass}
              value={planAction.vigencia}
              onChange={(event) =>
                setPlanAction((prev) => ({
                  ...prev,
                  vigencia: maskDate(event.target.value),
                }))
              }
              placeholder="Ex: 10/03/2025"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Ações por risco</p>
            <p className="text-[12px] text-muted-foreground">
              {planTableRows.length} registros gerados a partir da
              caracterização de risco
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenPlanActionModal}
            className="btn-primary px-4 text-[12px]"
          >
            Criar ação
          </button>
        </div>

        {planTableRows.length ? (
          <div className="mt-4 space-y-3">
            <div className="max-h-[620px] overflow-auto rounded-[12px] border border-border/60">
              <table className="min-w-[1950px] w-full border-separate border-spacing-0 text-left text-[12px]">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">GHE</th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Descrição agente de risco
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Prioridade
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Tipo de Medidas de Prevenção
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Medidas de Prevenção *
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Prazo para Realização da Ação
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Responsável pela Ação
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Acompanhamentos das Medidas de Prevenção
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Aferição de Resultados
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {planTableRowsPage.map((row) => (
                    <tr key={row.id} className="border-t border-border/60 align-middle">
                      <td className="px-4 py-3 text-foreground align-middle">{row.gheName}</td>
                      <td className="border-l border-border/60 px-4 py-3 text-foreground align-middle">
                        {row.descricaoAgente}
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-foreground align-middle">
                        {row.prioridade}
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-muted-foreground align-middle">
                        <select
                          className={`${tableSelectClass} min-w-[170px]`}
                          value={tipoMedidaByRowId[row.id] ?? row.tipoMedida ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setTipoMedidaByRowId((prev) => ({
                              ...prev,
                              [row.id]: value,
                            }));
                            handlePlanRiskFieldChange(
                              row.gheId,
                              row.riskId,
                              "tipoMedida",
                              value,
                              row.groupTargets
                            );
                          }}
                        >
                          <option value="">Selecione</option>
                          <option value="Introduzir">Introduzir</option>
                          <option value="Aprimorar">Aprimorar</option>
                          <option value="Manter">Manter</option>
                        </select>
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-foreground align-middle">
                        <div className="group">
                          {(() => {
                            const medidasOptions = getActionDescriptionOptions(
                              row.tipoAgente,
                              row.descricaoAgente,
                              ""
                            );
                            const selectedMedidas = parseMultiTextValues(
                              row.medidasPrevencao || ""
                            );
                            const mergedMedidasOptions = Array.from(
                              new Set([...medidasOptions, ...selectedMedidas])
                            );
                            const filteredMedidasOptions =
                              filterOptionsByQuery(mergedMedidasOptions);

                            return (
                              <div className="relative" data-medidas-multiselect>
                                <button
                                  type="button"
                                  className={`${tableSelectClass} relative flex min-w-[260px] items-center pr-10 text-left`}
                                  onClick={() =>
                                    setOpenMedidasMultiSelectRowId((prev) =>
                                      prev === row.id ? null : row.id
                                    )
                                  }
                                >
                                  <span className="block min-w-0 truncate">
                                      {selectedMedidas.length
                                        ? selectedMedidas.join(", ")
                                        : "Selecione medidas"}
                                  </span>
                                  <ChevronDown
                                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform ${
                                      openMedidasMultiSelectRowId === row.id
                                        ? "rotate-180"
                                        : "rotate-0"
                                    }`}
                                  />
                                </button>
                                {openMedidasMultiSelectRowId === row.id ? (
                                  <div className="absolute z-20 mt-2 w-full rounded-[10px] border border-border bg-popover p-2 shadow-md">
                                    <div className="relative mb-2">
                                      <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                      <input
                                        className={`${inputBaseClass} mt-0 h-[36px] pl-8`}
                                        value={medidasMultiSelectQuery}
                                        onChange={(event) =>
                                          setMedidasMultiSelectQuery(event.target.value)
                                        }
                                        placeholder="Filtrar medidas"
                                      />
                                    </div>
                                    <div className="max-h-44 space-y-1 overflow-auto">
                                      {filteredMedidasOptions.length ? (
                                        filteredMedidasOptions.map((option) => {
                                          const isChecked =
                                            selectedMedidas.includes(option);
                                          return (
                                            <label
                                              key={`${row.id}-medidas-${option}`}
                                              className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-[12px] hover:bg-muted"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                  const next = isChecked
                                                    ? selectedMedidas.filter(
                                                        (item) => item !== option
                                                      )
                                                    : [...selectedMedidas, option];
                                                  handlePlanMedidasChange(
                                                    row.gheId,
                                                    row.riskId,
                                                    toMultiTextValue(next),
                                                    row.groupTargets
                                                  );
                                                }}
                                              />
                                              <span>{option}</span>
                                            </label>
                                          );
                                        })
                                      ) : (
                                        <p className="px-2 py-1 text-[12px] text-muted-foreground">
                                          Nenhuma medida encontrada.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-muted-foreground align-middle">
                        <input
                          type="date"
                          className={`${tableInputClass} min-w-[170px]`}
                          value={prazoAcaoByRowId[row.id] ?? row.prazoAcao ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPrazoAcaoByRowId((prev) => ({
                              ...prev,
                              [row.id]: value,
                            }));
                            handlePlanRiskFieldChange(
                              row.gheId,
                              row.riskId,
                              "prazoAcao",
                              value,
                              row.groupTargets
                            );
                          }}
                        />
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-muted-foreground align-middle">
                        <input
                          className={`${tableInputClass} min-w-[220px]`}
                          value={
                            responsavelAcaoByRowId[row.id] ??
                            row.responsavelAcao ??
                            defaultResponsibleActionName
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            setResponsavelAcaoByRowId((prev) => ({
                              ...prev,
                              [row.id]: value,
                            }));
                            handlePlanRiskFieldChange(
                              row.gheId,
                              row.riskId,
                              "responsavelAcao",
                              value,
                              row.groupTargets
                            );
                          }}
                          placeholder="Responsável pela ação"
                        />
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-muted-foreground align-middle">
                        <select
                          className={`${tableSelectClass} min-w-[180px]`}
                          value={
                            acompanhamentoByRowId[row.id] ??
                            row.acompanhamento ??
                            defaultAcompanhamento
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            setAcompanhamentoByRowId((prev) => ({
                              ...prev,
                              [row.id]: value,
                            }));
                            handlePlanRiskFieldChange(
                              row.gheId,
                              row.riskId,
                              "acompanhamento",
                              value,
                              row.groupTargets
                            );
                          }}
                        >
                          <option value="">Selecione</option>
                          <option value="Realizado">Realizado</option>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Programado">Programado</option>
                        </select>
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-muted-foreground align-middle">
                        <select
                          className={`${tableSelectClass} min-w-[210px]`}
                          value={
                            afericaoResultadoByRowId[row.id] ??
                            row.afericaoResultado ??
                            defaultAfericaoResultado
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            setAfericaoResultadoByRowId((prev) => ({
                              ...prev,
                              [row.id]: value,
                            }));
                            handlePlanRiskFieldChange(
                              row.gheId,
                              row.riskId,
                              "afericaoResultado",
                              value,
                              row.groupTargets
                            );
                          }}
                        >
                          <option value="">Selecione</option>
                          <option value="Eficaz">Eficaz</option>
                          <option value="Ineficaz">Ineficaz</option>
                          <option value="Aguardando realização da Ação">
                            Aguardando realização da Ação
                          </option>
                        </select>
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-foreground align-middle">
                        <div className="flex h-[36px] items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenMedidasMultiSelectRowId(row.id)}
                            className="text-muted-foreground transition hover:text-primary"
                            title="Editar medidas de prevenção"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingDeleteRow({
                                gheId: row.gheId,
                                riskId: row.riskId,
                                groupTargets: row.groupTargets,
                              });
                            }}
                            className="text-muted-foreground transition hover:text-primary"
                            title="Excluir ação"
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
              <span>
                Página {planTableCurrentPage} de {planTableTotalPages} ·{" "}
                {planTableRows.length} registros
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlanTablePage((prev) => Math.max(1, prev - 1))}
                  disabled={planTableCurrentPage === 1}
                  className={
                    planTableCurrentPage === 1
                      ? "btn-disabled px-3 py-1 text-[11px]"
                      : "btn-outline px-3 py-1 text-[11px]"
                  }
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPlanTablePage((prev) =>
                      Math.min(planTableTotalPages, prev + 1)
                    )
                  }
                  disabled={planTableCurrentPage === planTableTotalPages}
                  className={
                    planTableCurrentPage === planTableTotalPages
                      ? "btn-disabled px-3 py-1 text-[11px]"
                      : "btn-outline px-3 py-1 text-[11px]"
                  }
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[12px] border border-dashed border-border/60 px-4 py-6 text-center text-[12px] text-muted-foreground">
            Nenhum risco cadastrado para gerar o plano de ação.
          </div>
        )}
      </section>

      {isPlanActionModalOpen ? (
        <div className="fixed -inset-6 z-50">
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="w-full max-w-3xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground">
                    Criar ação
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Defina o escopo da ação a partir do inventário.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlanActionModalOpen(false)}
                  className="btn-outline px-3 py-1 text-[12px]"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-[12px] font-semibold text-muted-foreground">
                    Escopo da ação
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {[
                      {
                        value: "risk",
                        label: "Risco específico",
                        helper: "Direciona a um risco pontual.",
                      },
                      {
                        value: "ghe",
                        label: "GHE específico",
                        helper: "Aplica a um GHE inteiro.",
                      },
                      {
                        value: "all",
                        label: "Todos os GHEs",
                        helper: "Ação transversal.",
                      },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() =>
                          handleChangePlanActionScope(
                            item.value as "all" | "ghe" | "risk"
                          )
                        }
                        className={`rounded-[12px] border px-4 py-3 text-left text-[12px] ${
                          planActionScope === item.value
                            ? "border-primary/50 bg-primary/5 text-foreground"
                            : "border-border/70 bg-background/40 text-muted-foreground"
                        }`}
                      >
                        <p className="font-semibold">{item.label}</p>
                        <p className="mt-1 text-[11px]">{item.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {planActionScope !== "all" ? (
                  <>
                    {planActionScope === "ghe" ? (
                      <div>
                        <label className="text-[12px] font-semibold text-muted-foreground">
                          GHE
                        </label>
                        <div className="mt-2">
                          <SearchableSelect
                            value={planActionGheId}
                            onChange={handlePlanActionGheChange}
                            options={planActionGheOptions}
                            buttonClassName={selectBaseClass}
                            searchPlaceholder="Filtrar GHE"
                            disabled={!planActionGheOptions.length}
                          />
                        </div>
                      </div>
                    ) : null}
                    {planActionScope === "risk" ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-[12px] font-semibold text-muted-foreground">
                            Risco
                          </label>
                          <div className="mt-2">
                            <SearchableSelect
                              value={planActionRiskId}
                              onChange={setPlanActionRiskId}
                              options={planActionRiskOptions}
                              buttonClassName={selectBaseClass}
                              searchPlaceholder="Filtrar risco"
                              disabled={!planActionRiskOptions.length}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[12px] font-semibold text-muted-foreground">
                            GHEs para aplicar em lote
                          </label>
                          <div className="mt-2 rounded-[10px] border border-border/60 bg-background/40 p-3">
                            {planActionGheOptions.length ? (
                              <>
                                <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span>
                                    {selectedPlanActionGheIds.length} de{" "}
                                    {planActionGheOptions.length} selecionados
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedPlanActionGheIds(
                                          planActionGheOptions.map((option) =>
                                            String(option.value)
                                          )
                                        )
                                      }
                                      className="underline underline-offset-2 hover:text-foreground"
                                    >
                                      Marcar todos
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPlanActionGheIds([])}
                                      className="underline underline-offset-2 hover:text-foreground"
                                    >
                                      Limpar
                                    </button>
                                  </div>
                                </div>
                                <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
                                  {planActionGheOptions.map((option) => {
                                    const gheId = String(option.value);
                                    const checked =
                                      selectedPlanActionGheIds.includes(gheId);
                                    return (
                                      <label
                                        key={gheId}
                                        className="flex cursor-pointer items-start gap-2 rounded-[8px] border border-border/60 bg-background/60 px-2 py-2 text-[12px] text-foreground hover:bg-muted/60"
                                      >
                                        <input
                                          type="checkbox"
                                          className="mt-0.5 h-4 w-4 accent-primary"
                                          checked={checked}
                                          onChange={(event) => {
                                            setSelectedPlanActionGheIds((prev) => {
                                              if (event.target.checked) {
                                                return prev.includes(gheId)
                                                  ? prev
                                                  : [...prev, gheId];
                                              }
                                              return prev.filter((id) => id !== gheId);
                                            });
                                          }}
                                        />
                                        <span className="leading-relaxed">
                                          {option.label}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <p className="text-[12px] text-muted-foreground">
                                Nenhum GHE disponível.
                              </p>
                            )}
                          </div>
                          {planActionGheSelectionError ? (
                            <p className="mt-1 text-[12px] text-danger">
                              {planActionGheSelectionError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {planActionScope === "all" ? (
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground">
                      GHEs para aplicar em lote
                    </label>
                    <div className="mt-2 rounded-[10px] border border-border/60 bg-background/40 p-3">
                      {planActionGheOptions.length ? (
                        <>
                          <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              {selectedPlanActionGheIds.length} de{" "}
                              {planActionGheOptions.length} selecionados
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedPlanActionGheIds(
                                    planActionGheOptions.map((option) =>
                                      String(option.value)
                                    )
                                  )
                                }
                                className="underline underline-offset-2 hover:text-foreground"
                              >
                                Marcar todos
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedPlanActionGheIds([])}
                                className="underline underline-offset-2 hover:text-foreground"
                              >
                                Limpar
                              </button>
                            </div>
                          </div>
                          <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
                            {planActionGheOptions.map((option) => {
                              const gheId = String(option.value);
                              const checked = selectedPlanActionGheIds.includes(gheId);
                              return (
                                <label
                                  key={gheId}
                                  className="flex cursor-pointer items-start gap-2 rounded-[8px] border border-border/60 bg-background/60 px-2 py-2 text-[12px] text-foreground hover:bg-muted/60"
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 accent-primary"
                                    checked={checked}
                                    onChange={(event) => {
                                      setSelectedPlanActionGheIds((prev) => {
                                        if (event.target.checked) {
                                          return prev.includes(gheId)
                                            ? prev
                                            : [...prev, gheId];
                                        }
                                        return prev.filter((id) => id !== gheId);
                                      });
                                    }}
                                  />
                                  <span className="leading-relaxed">{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="text-[12px] text-muted-foreground">
                          Nenhum GHE disponível.
                        </p>
                      )}
                    </div>
                    {planActionGheSelectionError ? (
                      <p className="mt-1 text-[12px] text-danger">
                        {planActionGheSelectionError}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <label className="text-[12px] font-semibold text-muted-foreground">
                    Descrição da ação *
                  </label>
                  <textarea
                    className={getPlanActionDescriptionClassName()}
                    value={planActionDescription}
                    onChange={(event) => setPlanActionDescription(event.target.value)}
                    onBlur={() => setTouchedPlanActionDescription(true)}
                    placeholder="Descreva a ação preventiva..."
                  />
                  {planActionDescriptionError ? (
                    <p className="mt-1 text-[12px] text-danger">
                      {planActionDescriptionError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlanActionModalOpen(false)}
                  className="btn-outline px-4"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTouchedPlanActionDescription(true);
                    if (shouldValidateGheBatchSelection) {
                      setTouchedPlanActionGheSelection(true);
                    }
                    if (planActionDescription.trim().length === 0) return;
                    if (
                      shouldValidateGheBatchSelection &&
                      selectedPlanActionGheIds.length === 0
                    ) {
                      return;
                    }
                    handleSavePlanActionModal(
                      planActionScope === "risk"
                        ? {
                            riskIds: planActionRiskId ? [planActionRiskId] : [],
                            gheIds: selectedPlanActionGheIds,
                          }
                        : planActionScope === "all"
                          ? { gheIds: selectedPlanActionGheIds }
                          : undefined
                    );
                  }}
                  className="btn-primary px-5"
                >
                  Salvar ação
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteRow ? (
        <div className="fixed -inset-6 z-50">
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <h3 className="text-[18px] font-semibold text-foreground">
                Confirmar exclusão
              </h3>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Deseja realmente excluir esta ação do plano? O risco será mantido.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDeleteRow(null)}
                  className="btn-outline px-4"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteMedidas(
                      pendingDeleteRow.gheId,
                      pendingDeleteRow.riskId,
                      pendingDeleteRow.groupTargets
                    );
                    setPendingDeleteRow(null);
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
                    handleResetPlanoData();
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
