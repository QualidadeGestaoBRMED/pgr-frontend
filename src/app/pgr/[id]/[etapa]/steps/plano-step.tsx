import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { MinusCircle, Pencil } from "lucide-react";
import { SearchableSelect, type SearchableSelectProps } from "./searchable-select";

type PlanoStepProps = {
  ctx: {
    inputBaseClass: string;
    textareaBaseClass: string;
    selectBaseClass: string;
    planAction: { nr: string; vigencia: string };
    maskDate: (value: string) => string;
    setPlanAction: Dispatch<SetStateAction<{ nr: string; vigencia: string }>>;
    planTableRows: Array<{
      id: string;
      gheId: string;
      riskId: string;
      gheName: string;
      descricaoAgente: string;
      classificacao: string;
      medidasPrevencao: string;
      groupTargets?: Array<{ gheId: string; riskId: string }>;
    }>;
    planTableRowsPage: Array<{
      id: string;
      gheId: string;
      riskId: string;
      gheName: string;
      descricaoAgente: string;
      classificacao: string;
      medidasPrevencao: string;
      groupTargets?: Array<{ gheId: string; riskId: string }>;
    }>;
    editingMedidasId: string | null;
    editingMedidasValue: string;
    setEditingMedidasValue: Dispatch<SetStateAction<string>>;
    handleEditMedidasSave: (
      gheId: string,
      riskId: string,
      groupTargets?: Array<{ gheId: string; riskId: string }>
    ) => void;
    handleDeleteMedidas: (
      gheId: string,
      riskId: string,
      groupTargets?: Array<{ gheId: string; riskId: string }>
    ) => void;
    handleEditMedidasCancel: () => void;
    handleEditMedidasStart: (rowId: string, value: string) => void;
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
  };
};

export function PlanoStep({ ctx }: PlanoStepProps) {
  const {
    inputBaseClass,
    textareaBaseClass,
    selectBaseClass,
    planAction,
    maskDate,
    setPlanAction,
    planTableRows,
    planTableRowsPage,
    editingMedidasId,
    editingMedidasValue,
    setEditingMedidasValue,
    handleEditMedidasSave,
    handleDeleteMedidas,
    handleEditMedidasCancel,
    handleEditMedidasStart,
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
  } = ctx;

  const [touchedMedidasByRowId, setTouchedMedidasByRowId] = useState<
    Record<string, boolean>
  >({});
  const [touchedPlanActionDescription, setTouchedPlanActionDescription] =
    useState(false);
  const [selectedPlanActionGheIds, setSelectedPlanActionGheIds] = useState<string[]>([]);
  const [touchedPlanActionGheSelection, setTouchedPlanActionGheSelection] =
    useState(false);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<null | {
    gheId: string;
    riskId: string;
    groupTargets?: Array<{ gheId: string; riskId: string }>;
  }>(null);

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

  const medidasErrorsByRowId = useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        planTableRows.map((row) => [
          row.id,
          row.medidasPrevencao.trim()
            ? ""
            : "Medidas de prevenção é obrigatório.",
        ])
      ),
    [planTableRows]
  );

  const planActionDescriptionError = planActionDescription.trim()
    ? ""
    : "Descrição da ação é obrigatória.";
  const shouldValidateGheBatchSelection =
    planActionScope === "risk" || planActionScope === "all";
  const planActionGheSelectionError =
    shouldValidateGheBatchSelection && selectedPlanActionGheIds.length === 0
      ? "Selecione ao menos um GHE."
      : "";

  const markMedidasTouched = (rowId: string) => {
    setTouchedMedidasByRowId((prev) => ({ ...prev, [rowId]: true }));
  };

  const getMedidasTextareaClassName = (rowId: string) =>
    touchedMedidasByRowId[rowId] && medidasErrorsByRowId[rowId]
      ? `${textareaBaseClass} min-h-[96px] border-rose-400 focus:ring-rose-500`
      : `${textareaBaseClass} min-h-[96px]`;

  const getPlanActionDescriptionClassName = () =>
    touchedPlanActionDescription && planActionDescriptionError
      ? `${textareaBaseClass} min-h-[120px] border-rose-400 focus:ring-rose-500`
      : `${textareaBaseClass} min-h-[120px]`;

  return (
    <>
      <section className="px-2">
        <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
          Plano de Ação
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Defina as ações para mitigação dos riscos identificados
        </p>
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
                "NR-33",
                "NR-35",
              ].map((nr) => (
                <button
                  key={nr}
                  type="button"
                  onClick={() => setPlanAction((prev) => ({ ...prev, nr }))}
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
            <div className="max-h-[420px] overflow-auto rounded-[12px] border border-border/60">
              <table className="min-w-[720px] w-full border-separate border-spacing-0 text-left text-[12px]">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">GHE</th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Descrição agente de risco
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Classificação
                    </th>
                    <th className="border-l border-border/60 px-4 py-3 font-semibold">
                      Medidas de prevenção *
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {planTableRowsPage.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="px-4 py-3 text-foreground">{row.gheName}</td>
                      <td className="border-l border-border/60 px-4 py-3 text-foreground">
                        {row.descricaoAgente}
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-foreground">
                        {row.classificacao}
                      </td>
                      <td className="border-l border-border/60 px-4 py-3 text-foreground">
                        {editingMedidasId === row.id ? (
                          <div className="space-y-2">
                            <textarea
                              className={getMedidasTextareaClassName(row.id)}
                              value={editingMedidasValue}
                              onChange={(event) =>
                                setEditingMedidasValue(event.target.value)
                              }
                              onBlur={() => markMedidasTouched(row.id)}
                              placeholder="Descreva as medidas de prevenção"
                            />
                            {touchedMedidasByRowId[row.id] &&
                            medidasErrorsByRowId[row.id] ? (
                              <p className="text-[12px] text-danger">
                                {medidasErrorsByRowId[row.id]}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    markMedidasTouched(row.id);
                                    if (editingMedidasValue.trim().length === 0) return;
                                    handleEditMedidasSave(
                                      row.gheId,
                                      row.riskId,
                                      row.groupTargets
                                    );
                                  }}
                                className="btn-primary px-3 py-1 text-[11px]"
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={handleEditMedidasCancel}
                                className="btn-outline px-3 py-1 text-[11px]"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="group px-1 py-1">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className={`text-[12px] leading-relaxed ${
                                  row.medidasPrevencao
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {row.medidasPrevencao
                                  ? row.medidasPrevencao
                                  : "Sem medidas cadastradas."}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditMedidasStart(
                                      row.id,
                                      row.medidasPrevencao
                                    )
                                  }
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
                            </div>
                          </div>
                        )}
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
                          {touchedPlanActionGheSelection &&
                          planActionGheSelectionError ? (
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
                    {touchedPlanActionGheSelection && planActionGheSelectionError ? (
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
                  {touchedPlanActionDescription && planActionDescriptionError ? (
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
    </>
  );
}
