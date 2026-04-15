import { Check, Eye, FileDown, LoaderCircle, Pencil, TriangleAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { pgrSteps } from "@/app/pgr/steps";

type RevisaoStepProps = {
  pgrId: string;
  completedSteps: number;
  stepStatusById?: Partial<Record<string, boolean>>;
  missingFieldsByStep?: Partial<Record<string, string[]>>;
  workflow: {
    isLocked: boolean;
    version: number;
    finalizedAt: string | null;
    finalizedBy: string | null;
    finalizedById: number | null;
  };
  lastFakePdfAt: string | null;
  isGeneratingFakePdf: boolean;
  onEditStep: (stepId: string) => void;
  onOpenPreview: () => void;
  onGenerateFakePdf: () => void;
  onResetData: () => void;
};

export function RevisaoStep({
  pgrId,
  completedSteps,
  stepStatusById,
  missingFieldsByStep,
  workflow,
  lastFakePdfAt,
  isGeneratingFakePdf,
  onEditStep,
  onOpenPreview,
  onGenerateFakePdf,
  onResetData,
}: RevisaoStepProps) {
  const [openMissingStepId, setOpenMissingStepId] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isGenerateBlockedModalOpen, setIsGenerateBlockedModalOpen] = useState(false);
  const reviewItems = useMemo(
    () =>
      pgrSteps
        .filter((item) => item.id !== "revisao" && item.id !== "inicio")
        .map((item, index) => {
          const fallbackByProgress = index < completedSteps;
          const isDone =
            typeof stepStatusById?.[item.id] === "boolean"
              ? Boolean(stepStatusById[item.id])
              : fallbackByProgress;
          const missingItems = missingFieldsByStep?.[item.id] ?? [];
          return {
            id: item.id,
            title: item.title,
            isDone,
            missingItems,
          };
        }),
    [completedSteps, stepStatusById, missingFieldsByStep]
  );
  const pendingReviewItems = useMemo(
    () =>
      reviewItems
        .filter((item) => !item.isDone)
        .map((item) => ({
          ...item,
          missingItems: item.missingItems.length
            ? item.missingItems
            : ["Concluir esta etapa para liberar a geração do PDF."],
        })),
    [reviewItems]
  );
  const missingFields = useMemo(
    () => (openMissingStepId ? missingFieldsByStep?.[openMissingStepId] ?? [] : []),
    [missingFieldsByStep, openMissingStepId]
  );
  const missingStepTitle = useMemo(
    () => reviewItems.find((item) => item.id === openMissingStepId)?.title ?? "Etapa",
    [reviewItems, openMissingStepId]
  );

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
          {reviewItems.map((item) => {
              const { isDone, missingItems } = item;
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
                    {!isDone && missingItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setOpenMissingStepId(item.id)}
                        className="btn-outline px-2 py-1"
                        title="Ver pendências"
                        aria-label={`Ver pendências da etapa ${item.title}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onEditStep(item.id)}
                      disabled={workflow.isLocked}
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
                {workflow.isLocked
                  ? "Documento finalizado. Para editar novamente, inicie uma nova versão no Histórico."
                  : "Gere o PDF final no template base do PGR."}
              </p>
              {lastFakePdfAt ? (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Último PDF gerado em {lastFakePdfAt}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">PGR: {pgrId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                disabled={workflow.isLocked}
                className={
                  workflow.isLocked
                    ? "btn-disabled px-4"
                    : "btn-outline border-rose-300 px-4 text-rose-600 hover:bg-rose-50"
                }
              >
                Limpar dados
              </button>
              <button type="button" onClick={onOpenPreview} className="btn-outline px-4">
                <Eye className="h-4 w-4" />
                Visualizar prévia
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingReviewItems.length > 0) {
                    setIsGenerateBlockedModalOpen(true);
                    return;
                  }
                  onGenerateFakePdf();
                }}
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

      {openMissingStepId && missingFields.length > 0 ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="w-full max-w-2xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground">
                    Pendências de preenchimento
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {missingStepTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenMissingStepId(null)}
                  className="btn-outline px-2 py-1"
                  aria-label="Fechar pendências"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 max-h-[55vh] space-y-2 overflow-auto pr-1">
                {missingFields.map((field, index) => (
                  <p
                    key={`${openMissingStepId}-${index}`}
                    className="rounded-[10px] border border-border/60 bg-background/40 px-3 py-2 text-[13px] text-foreground/90"
                  >
                    {field}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isGenerateBlockedModalOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
            <div className="w-full max-w-3xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground">
                    Pendências de preenchimento
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Complete os itens abaixo para liberar a geração do PDF.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGenerateBlockedModalOpen(false)}
                  className="btn-outline px-2 py-1"
                  aria-label="Fechar pendências"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 max-h-[55vh] space-y-3 overflow-auto pr-1">
                {pendingReviewItems.map((item) => (
                  <div
                    key={`pending-${item.id}`}
                    className="rounded-[10px] border border-border/60 bg-background/40 px-3 py-3"
                  >
                    <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
                    <div className="mt-2 space-y-2">
                      {item.missingItems.map((field, index) => (
                        <p
                          key={`${item.id}-field-${index}`}
                          className="rounded-[8px] border border-border/60 bg-card px-3 py-2 text-[13px] text-foreground/90"
                        >
                          {field}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsGenerateBlockedModalOpen(false)}
                  className="btn-primary px-5"
                >
                  Entendi
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
                    onResetData();
                    setOpenMissingStepId(null);
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
