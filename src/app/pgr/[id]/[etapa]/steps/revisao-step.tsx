import { Check, Eye, FileDown, LoaderCircle, Pencil, TriangleAlert } from "lucide-react";
import { pgrSteps } from "@/app/pgr/steps";

type RevisaoStepProps = {
  pgrId: string;
  completedSteps: number;
  stepStatusById?: Partial<Record<string, boolean>>;
  lastFakePdfAt: string | null;
  isGeneratingFakePdf: boolean;
  onEditStep: (stepId: string) => void;
  onOpenPreview: () => void;
  onGenerateFakePdf: () => void;
};

export function RevisaoStep({
  pgrId,
  completedSteps,
  stepStatusById,
  lastFakePdfAt,
  isGeneratingFakePdf,
  onEditStep,
  onOpenPreview,
  onGenerateFakePdf,
}: RevisaoStepProps) {
  return (
    <>
      <section className="px-2">
        <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
          Revisão dos Campos
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Revise todas as seções preenchidas antes de finalizar o documento
        </p>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <div className="space-y-3">
          {pgrSteps
            .filter((item) => item.id !== "revisao" && item.id !== "inicio")
            .map((item, index) => {
              const fallbackByProgress = index < completedSteps;
              const isDone =
                typeof stepStatusById?.[item.id] === "boolean"
                  ? Boolean(stepStatusById[item.id])
                  : fallbackByProgress;
              const statusLabel = isDone ? "Completo" : "Incompleto";
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border/60 bg-background/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        isDone
                          ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                          : "border-rose-300 bg-rose-50 text-rose-600"
                      }`}
                    >
                      {isDone ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <TriangleAlert className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">
                        {item.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        isDone ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditStep(item.id)}
                      className="btn-outline px-2 py-1"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="mt-6 rounded-[12px] border border-border/60 bg-background/40 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-foreground">
                Finalizar Documento
              </p>
              <p className="text-[12px] text-muted-foreground">
                Gere o PDF final no template base do PGR.
              </p>
              {lastFakePdfAt ? (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Último PDF gerado em {lastFakePdfAt}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">PGR: {pgrId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onOpenPreview} className="btn-outline px-4">
                <Eye className="h-4 w-4" />
                Visualizar prévia
              </button>
              <button
                type="button"
                onClick={onGenerateFakePdf}
                disabled={isGeneratingFakePdf}
                className={isGeneratingFakePdf ? "btn-disabled px-5" : "btn-primary px-5"}
              >
                {isGeneratingFakePdf ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Gerar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
