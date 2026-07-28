import { AlertTriangle, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";

type FinalizationLockDialogProps = {
  open: boolean;
  startedAt: string | null;
  startedBy: string | null;
  isCancelling: boolean;
  editAttempted: boolean;
  onCancel: () => void;
};

const formatStartedAt = (value: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
};

export function FinalizationLockDialog({
  open,
  startedAt,
  startedBy,
  isCancelling,
  editAttempted,
  onCancel,
}: FinalizationLockDialogProps) {
  if (!open) return null;

  const formattedStartedAt = formatStartedAt(startedAt);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-labelledby="finalization-lock-title"
      className="rounded-[14px] border border-primary/30 bg-primary/10 px-5 py-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="finalization-lock-title"
              className="text-[15px] font-semibold text-foreground"
            >
              PGR em processo de finalização
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              Você pode navegar pelas etapas, mas nenhuma alteração será permitida
              ou persistida até o processo terminar.
            </p>
            {startedBy || formattedStartedAt ? (
              <p className="mt-1.5 text-[12px] text-muted-foreground/80">
                Iniciado{startedBy ? ` por ${startedBy}` : ""}
                {formattedStartedAt ? ` em ${formattedStartedAt}` : ""}.
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isCancelling}
          className={isCancelling ? "btn-disabled shrink-0 px-4" : "btn-outline shrink-0 px-4"}
        >
          {isCancelling ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Restaurando backup...
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              Cancelar finalização
            </>
          )}
        </button>
      </div>
      {editAttempted ? (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-[10px] border border-warning-foreground/30 bg-warning px-3 py-2.5 text-[13px] font-medium text-warning-foreground"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Este PGR está sendo finalizado. Alterações estão bloqueadas e não serão salvas.
        </div>
      ) : null}
    </section>
  );
}
