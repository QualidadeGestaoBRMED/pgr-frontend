import { ChevronDown, PlusCircle, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchableSelect } from "./searchable-select";
import type { GheRisk, RiskGheGroup } from "../types";

type CaracterizacaoStepProps = {
  ctx: any;
};

const EPC_OPTIONS = [
  "N/A",
  "Sistema de exaustão",
  "Cortinas de proteção",
  "Ventilação local",
  "Barreiras físicas",
];

const EPI_OPTIONS = [
  "N/A",
  "Respirador (CA 67890)",
  "Máscara de solda (CA 12345)",
  "Óculos de proteção (CA 55555)",
  "Protetor auricular (CA 44444)",
];

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const createRiskId = () =>
  `risk-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export function CaracterizacaoStep({ ctx }: CaracterizacaoStepProps) {
  const {
    riskGheGroups,
    setRiskGheGroups,
    currentRiskGheId,
    setCurrentRiskGheId,
    pushHistory,
    applyMissingRiskDefaults,
    tipoAgenteOptions,
    getDescricaoAgenteOptions,
    inputBaseClass,
    inputInlineClass,
    textareaBaseClass,
    selectSmallClass,
  } = ctx;

  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [riskGheSearch, setRiskGheSearch] = useState("");
  const [openMultiSelect, setOpenMultiSelect] = useState<null | {
    riskId: string;
    field: "epc" | "epi";
  }>(null);
  const [multiSelectQuery, setMultiSelectQuery] = useState("");
  const copyMenuRef = useRef<HTMLDivElement | null>(null);

  const isManyRiskGhes = riskGheGroups.length > 10;
  const normalizedRiskGheSearch = useMemo(
    () => normalizeText(riskGheSearch.trim()),
    [riskGheSearch]
  );
  const currentRiskGhe = useMemo(
    () =>
      riskGheGroups.find((ghe: RiskGheGroup) => ghe.id === currentRiskGheId) ??
      riskGheGroups[0],
    [riskGheGroups, currentRiskGheId]
  );
  const filteredRiskGheGroups = useMemo(() => {
    if (!normalizedRiskGheSearch) {
      return riskGheGroups;
    }
    const filtered = riskGheGroups.filter((ghe: RiskGheGroup) =>
      normalizeText(ghe.name).includes(normalizedRiskGheSearch)
    );
    if (
      currentRiskGhe &&
      !filtered.some((ghe: RiskGheGroup) => ghe.id === currentRiskGhe.id)
    ) {
      return [currentRiskGhe, ...filtered];
    }
    return filtered;
  }, [currentRiskGhe, normalizedRiskGheSearch, riskGheGroups]);
  const copySourceGhes = useMemo(
    () =>
      riskGheGroups.filter((ghe: RiskGheGroup) => ghe.id !== currentRiskGheId),
    [riskGheGroups, currentRiskGheId]
  );

  const handleAddRisk = () => {
    if (!currentRiskGhe) return;
    pushHistory();
    const newRisk: GheRisk = {
      id: createRiskId(),
      tipoAgente: "",
      descricaoAgente: "",
      perigo: "",
      meioPropagacao: "",
      fontes: "",
      tipoAvaliacao: "",
      intensidade: "",
      severidade: "",
      probabilidade: "",
      classificacao: "",
      medidasControle: "",
      epc: ["N/A"],
      epi: ["N/A"],
    };
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? { ...ghe, risks: [...ghe.risks, newRisk] }
          : ghe
      )
    );
    setTimeout(() => {
      const el = document.querySelector(`[data-risk-id="${newRisk.id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstInput = el.querySelector<HTMLInputElement>("input");
      firstInput?.focus();
    }, 0);
  };

  const handleRemoveRisk = (riskId: string) => {
    if (!currentRiskGhe) return;
    pushHistory();
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? { ...ghe, risks: ghe.risks.filter((risk) => risk.id !== riskId) }
          : ghe
      )
    );
  };

  const handleRiskChange = (
    riskId: string,
    field:
      | "tipoAgente"
      | "descricaoAgente"
      | "perigo"
      | "meioPropagacao"
      | "fontes"
      | "tipoAvaliacao"
      | "intensidade"
      | "severidade"
      | "probabilidade"
      | "classificacao"
      | "medidasControle",
    value: string
  ) => {
    if (!currentRiskGhe) return;
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id
          ? {
              ...ghe,
              risks: ghe.risks.map((risk) =>
                risk.id === riskId
                  ? (() => {
                      const nextRisk = { ...risk, [field]: value };
                      if (
                        field !== "tipoAgente" &&
                        field !== "descricaoAgente"
                      ) {
                        return nextRisk;
                      }
                      if (!nextRisk.tipoAgente || !nextRisk.descricaoAgente) {
                        return nextRisk;
                      }
                      return applyMissingRiskDefaults(nextRisk);
                    })()
                  : risk
              ),
            }
          : ghe
      )
    );
  };

  const handleToggleRiskMultiSelect = (
    riskId: string,
    field: "epc" | "epi",
    option: string
  ) => {
    if (!currentRiskGhe) return;
    pushHistory();
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) => {
        if (ghe.id !== currentRiskGhe.id) return ghe;
        return {
          ...ghe,
          risks: ghe.risks.map((risk) => {
            if (risk.id !== riskId) return risk;
            const current = risk[field] ?? [];
            let next: string[] = [];
            if (option === "N/A") {
              next = current.includes("N/A") ? [] : ["N/A"];
            } else {
              const withoutNa = current.filter((item) => item !== "N/A");
              if (withoutNa.includes(option)) {
                next = withoutNa.filter((item) => item !== option);
              } else {
                next = [...withoutNa, option];
              }
            }
            return { ...risk, [field]: next };
          }),
        };
      })
    );
  };

  const filterOptionsByQuery = (options: string[]) => {
    const term = normalizeText(multiSelectQuery.trim());
    if (!term) return options;
    return options.filter((option) => normalizeText(option).includes(term));
  };

  const handleCopyRiskStructure = (sourceGheId: string) => {
    if (!currentRiskGhe) return;
    const source = riskGheGroups.find((ghe: RiskGheGroup) => ghe.id === sourceGheId);
    if (!source) return;
    pushHistory();
    const clonedRisks = source.risks.map((risk: GheRisk) => ({
      ...risk,
      medidasControle: risk.medidasControle ?? "",
      epc: [...(risk.epc ?? [])],
      epi: [...(risk.epi ?? [])],
      id: createRiskId(),
    }));
    setRiskGheGroups((prev: RiskGheGroup[]) =>
      prev.map((ghe) =>
        ghe.id === currentRiskGhe.id ? { ...ghe, risks: clonedRisks } : ghe
      )
    );
    setIsCopyMenuOpen(false);
  };

  useEffect(() => {
    if (!isCopyMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!copyMenuRef.current || !target) return;
      if (!copyMenuRef.current.contains(target)) {
        setIsCopyMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isCopyMenuOpen]);

  useEffect(() => {
    if (!openMultiSelect) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-multiselect]")) {
        return;
      }
      setOpenMultiSelect(null);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [openMultiSelect]);

  useEffect(() => {
    if (openMultiSelect) {
      setMultiSelectQuery("");
    }
  }, [openMultiSelect]);

  const renderRiskCards = (withMargin: boolean) => (
    <div className={`${withMargin ? "mt-6" : ""} space-y-4`}>
      {currentRiskGhe?.risks.length ? (
        currentRiskGhe.risks.map((risk: GheRisk) => (
          <div
            key={risk.id}
            data-risk-id={risk.id}
            className="rounded-[14px] border border-border/60 bg-card px-4 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-foreground">
                Risco cadastrado
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRemoveRisk(risk.id)}
                  className="btn-outline px-3 py-1 text-[12px] text-danger hover:bg-danger/10"
                >
                  Excluir risco
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Tipo de Agente
                </label>
                <div className="mt-2">
                  <SearchableSelect
                    value={risk.tipoAgente}
                    onChange={(value) =>
                      handleRiskChange(risk.id, "tipoAgente", value)
                    }
                    options={tipoAgenteOptions.map((option: string) => ({
                      label: option,
                      value: option,
                    }))}
                    buttonClassName={selectSmallClass}
                    searchPlaceholder="Filtrar agente"
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Descrição do Agente
                </label>
                <div className="mt-2">
                  <SearchableSelect
                    value={risk.descricaoAgente}
                    onChange={(value) =>
                      handleRiskChange(risk.id, "descricaoAgente", value)
                    }
                    options={getDescricaoAgenteOptions(
                      risk.tipoAgente,
                      risk.descricaoAgente
                    ).map((option: string) => ({
                      label: option,
                      value: option,
                    }))}
                    buttonClassName={selectSmallClass}
                    searchPlaceholder="Filtrar descrição"
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Perigo
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.perigo}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "perigo", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Meio de Propagação
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.meioPropagacao}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "meioPropagacao", event.target.value)
                  }
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Fontes/Circunstâncias
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.fontes}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "fontes", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Tipo de Avaliação
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.tipoAvaliacao}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "tipoAvaliacao", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Intensidade/Concentração
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.intensidade}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "intensidade", event.target.value)
                  }
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Severidade
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.severidade}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "severidade", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Probabilidade
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.probabilidade}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "probabilidade", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Classificação de Risco
                </label>
                <input
                  className={inputBaseClass}
                  value={risk.classificacao}
                  onChange={(event) =>
                    handleRiskChange(risk.id, "classificacao", event.target.value)
                  }
                />
              </div>
            </div>
            <div className="mt-8">
              <p className="text-[13px] font-semibold text-foreground">
                Medidas de prevenção
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    Medidas de Controle Administrativas e/ou de Engenharia
                  </label>
                  <textarea
                    className={`${textareaBaseClass} min-h-[80px]`}
                    value={risk.medidasControle}
                    onChange={(event) =>
                      handleRiskChange(risk.id, "medidasControle", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    EPC
                  </label>
                  <div className="relative mt-2" data-multiselect>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMultiSelect((prev) =>
                          prev?.riskId === risk.id && prev.field === "epc"
                            ? null
                            : { riskId: risk.id, field: "epc" }
                        )
                      }
                      className={`${selectSmallClass} flex items-center justify-between text-left`}
                    >
                      <span className="truncate">
                        {risk.epc.length ? risk.epc.join(", ") : "Selecione"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {openMultiSelect?.riskId === risk.id &&
                    openMultiSelect.field === "epc" ? (
                      <div className="absolute z-10 mt-2 w-full rounded-[10px] border border-border/70 bg-card p-2 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                        <input
                          className={`${inputInlineClass} h-[32px]`}
                          value={multiSelectQuery}
                          onChange={(event) =>
                            setMultiSelectQuery(event.target.value)
                          }
                          placeholder="Filtrar..."
                        />
                        <div className="mt-2 max-h-[180px] space-y-1 overflow-auto pr-1">
                          {filterOptionsByQuery(EPC_OPTIONS).map((option) => (
                            <label
                              key={option}
                              className="flex items-center gap-2 rounded-[8px] px-2 py-1 text-[12px] text-foreground hover:bg-muted/60"
                            >
                              <input
                                type="checkbox"
                                checked={risk.epc.includes(option)}
                                onChange={() =>
                                  handleToggleRiskMultiSelect(risk.id, "epc", option)
                                }
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                          {!filterOptionsByQuery(EPC_OPTIONS).length ? (
                            <div className="rounded-[8px] border border-dashed border-border/60 px-2 py-2 text-center text-[12px] text-muted-foreground">
                              Nenhum resultado
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">
                    EPI / C.A.
                  </label>
                  <div className="relative mt-2" data-multiselect>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMultiSelect((prev) =>
                          prev?.riskId === risk.id && prev.field === "epi"
                            ? null
                            : { riskId: risk.id, field: "epi" }
                        )
                      }
                      className={`${selectSmallClass} flex items-center justify-between text-left`}
                    >
                      <span className="truncate">
                        {risk.epi.length ? risk.epi.join(", ") : "Selecione"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {openMultiSelect?.riskId === risk.id &&
                    openMultiSelect.field === "epi" ? (
                      <div className="absolute z-10 mt-2 w-full rounded-[10px] border border-border/70 bg-card p-2 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                        <input
                          className={`${inputInlineClass} h-[32px]`}
                          value={multiSelectQuery}
                          onChange={(event) =>
                            setMultiSelectQuery(event.target.value)
                          }
                          placeholder="Filtrar..."
                        />
                        <div className="mt-2 max-h-[180px] space-y-1 overflow-auto pr-1">
                          {filterOptionsByQuery(EPI_OPTIONS).map((option) => (
                            <label
                              key={option}
                              className="flex items-center gap-2 rounded-[8px] px-2 py-1 text-[12px] text-foreground hover:bg-muted/60"
                            >
                              <input
                                type="checkbox"
                                checked={risk.epi.includes(option)}
                                onChange={() =>
                                  handleToggleRiskMultiSelect(risk.id, "epi", option)
                                }
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                          {!filterOptionsByQuery(EPI_OPTIONS).length ? (
                            <div className="rounded-[8px] border border-dashed border-border/60 px-2 py-2 text-center text-[12px] text-muted-foreground">
                              Nenhum resultado
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-[12px] border border-dashed border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
          Nenhum risco cadastrado neste GHE.
        </div>
      )}
    </div>
  );

  return (
    <>
      <section className="px-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Caracterização de Risco
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Cadastre e gerencie os riscos identificados no GHE
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2" />
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-foreground">
              Riscos atribuídos a um GHE
            </p>
            <p className="text-[12px] text-muted-foreground">
              Selecione o GHE para editar os riscos vinculados
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
              {currentRiskGhe?.name ?? "GHE"}
            </span>
            <div ref={copyMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCopyMenuOpen((prev) => !prev)}
                disabled={!copySourceGhes.length}
                className={
                  copySourceGhes.length ? "btn-outline px-4" : "btn-disabled px-4"
                }
              >
                Copiar Estrutura do GHE
              </button>
              {isCopyMenuOpen ? (
                <div className="absolute right-0 z-10 mt-2 w-72 rounded-[12px] border border-border/70 bg-card p-3 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                  <p className="text-[12px] font-semibold text-foreground">
                    Copiar estrutura para{" "}
                    <span className="font-semibold text-foreground">
                      {currentRiskGhe?.name ?? "GHE"}
                    </span>
                  </p>
                  <div className="mt-2 max-h-[220px] space-y-2 overflow-auto pr-1">
                    {copySourceGhes.map((ghe: RiskGheGroup) => (
                      <button
                        key={ghe.id}
                        type="button"
                        onClick={() => handleCopyRiskStructure(ghe.id)}
                        className="flex w-full items-center justify-between rounded-[10px] border border-border/60 px-3 py-2 text-left text-[12px] text-foreground hover:bg-muted/60"
                      >
                        <span>
                          {ghe.name} → {currentRiskGhe?.name ?? "GHE"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {ghe.risks.length} riscos
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button type="button" onClick={handleAddRisk} className="btn-primary px-4">
              <PlusCircle className="h-4 w-4" />
              Adicionar Risco
            </button>
          </div>
        </div>

        {isManyRiskGhes ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
            <div className="self-start rounded-[12px] border border-border/70 bg-background/40 p-3">
              <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                <span>Lista de GHEs</span>
                <span>
                  {filteredRiskGheGroups.length} de {riskGheGroups.length}
                </span>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={riskGheSearch}
                  onChange={(event) => setRiskGheSearch(event.target.value)}
                  className={`${inputInlineClass} pl-10`}
                  placeholder="Buscar GHE"
                />
              </div>
              <div className="mt-3 max-h-[280px] space-y-2 overflow-auto pr-1">
                {filteredRiskGheGroups.map((ghe: RiskGheGroup) => (
                  <button
                    key={ghe.id}
                    type="button"
                    onClick={() => setCurrentRiskGheId(ghe.id)}
                    className={`w-full rounded-[10px] border px-3 py-2 text-left text-[12px] transition ${
                      currentRiskGheId === ghe.id
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/70 bg-background/60 hover:bg-muted/60"
                    }`}
                  >
                    <p className="font-semibold text-foreground">{ghe.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ghe.risks.length} riscos cadastrados
                    </p>
                  </button>
                ))}
                {!filteredRiskGheGroups.length ? (
                  <div className="rounded-[10px] border border-dashed border-border/70 px-3 py-4 text-center text-[12px] text-muted-foreground">
                    Nenhum GHE encontrado.
                  </div>
                ) : null}
              </div>
            </div>
            <div>{renderRiskCards(false)}</div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-[260px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={riskGheSearch}
                  onChange={(event) => setRiskGheSearch(event.target.value)}
                  className={`${inputInlineClass} pl-10`}
                  placeholder="Buscar GHE"
                />
              </div>
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <span>
                  {filteredRiskGheGroups.length} de {riskGheGroups.length} GHEs
                </span>
              </div>
            </div>

            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {filteredRiskGheGroups.map((ghe: RiskGheGroup) => (
                <button
                  key={ghe.id}
                  type="button"
                  onClick={() => setCurrentRiskGheId(ghe.id)}
                  className={`min-w-[150px] rounded-[12px] border px-3 py-2 text-left transition ${
                    currentRiskGheId === ghe.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/70 bg-background/40 hover:bg-muted/60"
                  }`}
                >
                  <p className="text-[12px] font-semibold text-foreground">
                    {ghe.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {ghe.risks.length} riscos
                  </p>
                </button>
              ))}
              {!filteredRiskGheGroups.length ? (
                <div className="rounded-[12px] border border-dashed border-border/70 px-4 py-3 text-[12px] text-muted-foreground">
                  Nenhum GHE encontrado.
                </div>
              ) : null}
            </div>
            {renderRiskCards(true)}
          </>
        )}

        {currentRiskGhe && currentRiskGhe.risks.length >= 2 ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleAddRisk}
              className="btn-primary h-9 w-9 justify-center px-0"
              aria-label="Adicionar risco"
              title="Adicionar risco"
            >
              <PlusCircle className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}
