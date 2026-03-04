import { LoaderCircle } from "lucide-react";
import type { InicioDraft, InicioDraftEditableField } from "./types";

type InicioStepProps = {
  inicioDraft: InicioDraft;
  isPipefySyncing: boolean;
  inputBaseClass: string;
  textareaBaseClass: string;
  onLoadPipefyMock: () => void;
  onDraftChange: (field: InicioDraftEditableField, value: string) => void;
};

export function InicioStep({
  inicioDraft,
  isPipefySyncing,
  inputBaseClass,
  textareaBaseClass,
  onLoadPipefyMock,
  onDraftChange,
}: InicioStepProps) {
  return (
    <>
      <section className="px-2">
        <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
          Início da elaboração do PGR
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Nesta etapa você inicia o documento com os dados-base que virão do
          Pipefy.
        </p>
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
                : "Sem sincronização ainda. Use a integração para preencher rapidamente."}
            </p>
          </div>
          <button
            type="button"
            onClick={onLoadPipefyMock}
            disabled={isPipefySyncing}
            className={isPipefySyncing ? "btn-disabled px-4" : "btn-primary px-4"}
          >
            {isPipefySyncing ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              "Carregar dados do Pipefy"
            )}
          </button>
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
              Título do documento
            </label>
            <input
              className={inputBaseClass}
              value={inicioDraft.documentTitle}
              onChange={(event) => onDraftChange("documentTitle", event.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Empresa
            </label>
            <input
              className={inputBaseClass}
              value={inicioDraft.companyName}
              onChange={(event) => onDraftChange("companyName", event.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Unidade
            </label>
            <input
              className={inputBaseClass}
              value={inicioDraft.unitName}
              onChange={(event) => onDraftChange("unitName", event.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CNPJ</label>
            <input
              className={inputBaseClass}
              value={inicioDraft.cnpj}
              onChange={(event) => onDraftChange("cnpj", event.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Responsável
            </label>
            <input
              className={inputBaseClass}
              value={inicioDraft.responsible}
              onChange={(event) => onDraftChange("responsible", event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[12px] font-medium text-foreground">
              E-mail de contato
            </label>
            <input
              className={inputBaseClass}
              value={inicioDraft.email}
              onChange={(event) => onDraftChange("email", event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[12px] font-medium text-foreground">
              Observações iniciais
            </label>
            <textarea
              className={textareaBaseClass}
              value={inicioDraft.notes}
              onChange={(event) => onDraftChange("notes", event.target.value)}
              placeholder="Ex: contexto, unidade atendida, observações do card."
            />
          </div>
        </div>
      </section>
    </>
  );
}
