import { useMemo, useState } from "react";
import type { InicioDraft, InicioDraftEditableField } from "./types";
import { isValidCnpj } from "../validation/br-field-utils";

type InicioStepProps = {
  inicioDraft: InicioDraft;
  isPipefySyncing: boolean;
  inputBaseClass: string;
  onDraftChange: (field: InicioDraftEditableField, value: string) => void;
};

export function InicioStep({
  inicioDraft,
  isPipefySyncing,
  inputBaseClass,
  onDraftChange,
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
    errors[field]
      ? `${inputBaseClass} border-rose-400 focus:ring-rose-500`
      : inputBaseClass;

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
          {isPipefySyncing ? (
            <p className="text-[12px] text-muted-foreground">Sincronizando dados do Pipefy...</p>
          ) : null}
        </div>

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
              className={getRequiredFieldClassName("documentTitle")}
              value={inicioDraft.documentTitle}
              onChange={(event) => onDraftChange("documentTitle", event.target.value)}
              onBlur={() => markTouched("documentTitle")}
            />
            {errors.documentTitle ? (
              <p className="mt-1 text-[12px] text-danger">{errors.documentTitle}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Nome da Empresa (Conforme BR NET) *
            </label>
            <input
              className={getRequiredFieldClassName("companyName")}
              value={inicioDraft.companyName}
              onChange={(event) => onDraftChange("companyName", event.target.value)}
              onBlur={() => markTouched("companyName")}
            />
            {errors.companyName ? (
              <p className="mt-1 text-[12px] text-danger">{errors.companyName}</p>
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
              className={getRequiredFieldClassName("cnpj")}
              value={inicioDraft.cnpj}
              onChange={(event) => onDraftChange("cnpj", event.target.value)}
              onBlur={() => markTouched("cnpj")}
            />
            {errors.cnpj ? (
              <p className="mt-1 text-[12px] text-danger">{errors.cnpj}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Responsável pela execução do Serviço (ST) *
            </label>
            <input
              className={getRequiredFieldClassName("responsible")}
              value={inicioDraft.responsible}
              onChange={(event) => onDraftChange("responsible", event.target.value)}
              onBlur={() => markTouched("responsible")}
            />
            {errors.responsible ? (
              <p className="mt-1 text-[12px] text-danger">{errors.responsible}</p>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
