import { useEffect, useMemo, useState } from "react";
import type { InicioDraft, InicioDraftEditableField } from "./types";
import type { PendingReviewFocus } from "../types";
import { isValidCnpj } from "../validation/br-field-utils";

type InicioStepProps = {
  inicioDraft: InicioDraft;
  isPipefySyncing: boolean;
  isPipefySyncCoolingDown: boolean;
  pipefySyncCooldownSeconds: number;
  inputBaseClass: string;
  pendingReviewFocus?: PendingReviewFocus | null;
  onDraftChange: (field: InicioDraftEditableField, value: string) => void;
  onSyncPipefy: () => void;
  onCheckPreviousPgr: () => void;
  canImportPreviousPgr: boolean;
  isCheckingPreviousPgr: boolean;
  previousPgrCheckNotice: string | null;
  lastFunctionInclusion: {
    funcao: string;
    resolvedBy: string;
    resolvedAt: string;
  } | null;
};

function formatBrDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function InicioStep({
  inicioDraft,
  isPipefySyncing,
  isPipefySyncCoolingDown,
  pipefySyncCooldownSeconds,
  inputBaseClass,
  pendingReviewFocus,
  onDraftChange,
  onSyncPipefy,
  onCheckPreviousPgr,
  canImportPreviousPgr,
  isCheckingPreviousPgr,
  previousPgrCheckNotice,
  lastFunctionInclusion,
}: InicioStepProps) {
  type RequiredInicioField =
    | "documentTitle"
    | "companyName"
    | "cnpj"
    | "responsible";

  const [, setTouchedFields] = useState<Partial<Record<RequiredInicioField, boolean>>>(
    {}
  );

  const markTouched = (field: RequiredInicioField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const errors = useMemo(
    () => ({
      documentTitle: inicioDraft.documentTitle.trim()
        ? ""
        : "Título do card é obrigatório.",
      companyName: inicioDraft.companyName.trim() ? "" : "Nome da empresa é obrigatório.",
      cnpj: !inicioDraft.cnpj.trim()
        ? "CNPJ é obrigatório."
        : isValidCnpj(inicioDraft.cnpj)
          ? ""
          : "CNPJ inválido.",
      responsible: inicioDraft.responsible.trim()
        ? ""
        : "Responsável pela execução do serviço (ST) é obrigatório.",
    }),
    [inicioDraft]
  );

  const getRequiredFieldClassName = (field: RequiredInicioField) =>
    [
      inputBaseClass,
      errors[field] ? "border-danger-foreground/50 focus:ring-danger-foreground" : "",
      pendingReviewFocus?.stepId === "inicio" && pendingReviewFocus.fieldKey === field
        ? "border-warning-foreground/50 bg-warning ring-2 ring-warning-foreground/30"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  useEffect(() => {
    if (pendingReviewFocus?.stepId !== "inicio" || !pendingReviewFocus.fieldKey) return;
    const input = document.querySelector<HTMLInputElement>(
      `[data-pending-field="${pendingReviewFocus.fieldKey}"]`
    );
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus();
  }, [pendingReviewFocus]);

  return (
    <>
      <section className="px-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Início da elaboração do PGR
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Nesta etapa você inicia o documento com os dados-base que virão do
              Pipefy.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        {pendingReviewFocus?.stepId === "inicio" ? (
          <div className="mb-5 rounded-[12px] border border-warning-foreground/30 bg-warning px-4 py-3 text-[13px] text-warning-foreground">
            Pendência destacada: {pendingReviewFocus.message}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-foreground">
              Origem dos dados
            </p>
            <p className="text-[12px] text-muted-foreground">
              {inicioDraft.syncedAt
                ? `Última sincronização via API: ${inicioDraft.syncedAt}`
                : "Sem sincronização ainda. Os dados serão carregados automaticamente ao abrir o card."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onSyncPipefy}
              disabled={isPipefySyncing || isPipefySyncCoolingDown}
            >
              {isPipefySyncing
                ? "Sincronizando..."
                : isPipefySyncCoolingDown
                  ? `Sincronizar (${pipefySyncCooldownSeconds}s)`
                  : "Sincronizar"}
            </button>
            {isPipefySyncing ? (
              <p className="text-[12px] text-muted-foreground">
                Sincronizando dados do Pipefy...
              </p>
            ) : null}
            {canImportPreviousPgr ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onCheckPreviousPgr}
                disabled={isCheckingPreviousPgr}
              >
                {isCheckingPreviousPgr
                  ? "Verificando..."
                  : "Importar dados de PGR anterior"}
              </button>
            ) : null}
          </div>
        </div>
        {canImportPreviousPgr && previousPgrCheckNotice ? (
          <p className="mt-2 text-[12px] text-muted-foreground">
            {previousPgrCheckNotice}
          </p>
        ) : null}
        {lastFunctionInclusion ? (
          <div className="mt-3 rounded-[10px] border border-success-foreground/30 bg-success px-4 py-2.5 text-[12px] text-success-foreground">
            <span className="font-semibold">Última alteração documental</span>
            {": concluída"}
            {lastFunctionInclusion.resolvedBy
              ? ` por ${lastFunctionInclusion.resolvedBy}`
              : ""}
            {lastFunctionInclusion.resolvedAt
              ? ` em ${formatBrDate(lastFunctionInclusion.resolvedAt)}`
              : ""}
            {"."}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Card do Pipefy
            </label>
            <input
              className={inputBaseClass}
              value={inicioDraft.pipefyCardId}
              onChange={(event) => onDraftChange("pipefyCardId", event.target.value)}
              placeholder="Ex: PIPE-9012"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Título do Card *
            </label>
            <input
              data-pending-field="documentTitle"
              className={getRequiredFieldClassName("documentTitle")}
              value={inicioDraft.documentTitle}
              onChange={(event) => onDraftChange("documentTitle", event.target.value)}
              onBlur={() => markTouched("documentTitle")}
            />
            {errors.documentTitle ? (
              <p className="mt-1 text-[12px] text-danger-foreground">{errors.documentTitle}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Nome da Empresa (Conforme BR NET) *
            </label>
            <input
              data-pending-field="companyName"
              className={getRequiredFieldClassName("companyName")}
              value={inicioDraft.companyName}
              onChange={(event) => onDraftChange("companyName", event.target.value)}
              onBlur={() => markTouched("companyName")}
            />
            {errors.companyName ? (
              <p className="mt-1 text-[12px] text-danger-foreground">{errors.companyName}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Grupo Econômico (Conforme BR NET)
            </label>
            <input
              className={inputBaseClass}
              value={inicioDraft.unitName}
              onChange={(event) => onDraftChange("unitName", event.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CNPJ *</label>
            <input
              data-pending-field="cnpj"
              className={getRequiredFieldClassName("cnpj")}
              value={inicioDraft.cnpj}
              onChange={(event) => onDraftChange("cnpj", event.target.value)}
              onBlur={() => markTouched("cnpj")}
            />
            {errors.cnpj ? (
              <p className="mt-1 text-[12px] text-danger-foreground">{errors.cnpj}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Responsável pela execução do Serviço (ST) *
            </label>
            <input
              data-pending-field="responsible"
              className={getRequiredFieldClassName("responsible")}
              value={inicioDraft.responsible}
              onChange={(event) => onDraftChange("responsible", event.target.value)}
              onBlur={() => markTouched("responsible")}
            />
            {errors.responsible ? (
              <p className="mt-1 text-[12px] text-danger-foreground">{errors.responsible}</p>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
