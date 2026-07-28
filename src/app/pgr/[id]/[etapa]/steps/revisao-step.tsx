import {
  Check,
  Clock,
  Eye,
  FileDown,
  Hourglass,
  LoaderCircle,
  Pencil,
  TriangleAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { pgrSteps } from "@/app/pgr/steps";
import type { PendingReviewTarget } from "../types";
import { resolveReviewItemStatus } from "./revisao-review-items";

type RevisaoStepProps = {
  pgrId: string;
  completedSteps: number;
  stepStatusById?: Partial<Record<string, boolean>>;
  isAnexosEmpty?: boolean;
  missingFieldsByStep?: Partial<Record<string, string[]>>;
  missingTargetsByStep?: Partial<Record<string, PendingReviewTarget[]>>;
  workflow: {
    isLocked: boolean;
    version: number;
    finalizedAt: string | null;
    finalizedBy: string | null;
    finalizedById: number | null;
  };
  lastFakePdfAt: string | null;
  isGeneratingFakePdf: boolean;
  isFinalizingPgr: boolean;
  heavyGenerationWaitMessage: string | null;
  attachmentsAreLarge: boolean;
  attachmentsTotalMb: number;
  onEditStep: (stepId: string) => void;
  onOpenPendingTarget: (target: PendingReviewTarget) => void;
  onGenerateFakePdf: () => void;
  onFinalizePgr: () => void;
};

const isOptionalEpiEpcIssue = (issue: string) =>
  /\b(?:EPI|EPC)\s+é\s+obrigatório\b/i.test(String(issue || ""));

export function RevisaoStep({
  pgrId,
  completedSteps,
  stepStatusById,
  isAnexosEmpty,
  missingFieldsByStep,
  missingTargetsByStep,
  workflow,
  lastFakePdfAt,
  isGeneratingFakePdf,
  isFinalizingPgr,
  heavyGenerationWaitMessage,
  attachmentsAreLarge,
  attachmentsTotalMb,
  onEditStep,
  onOpenPendingTarget,
  onGenerateFakePdf,
  onFinalizePgr,
}: RevisaoStepProps) {
  const [openMissingStepId, setOpenMissingStepId] = useState<string | null>(null);
  const [isGenerateBlockedModalOpen, setIsGenerateBlockedModalOpen] = useState(false);
  const reviewItems = useMemo(
    () =>
      pgrSteps
        .filter((item) => item.id !== "revisao")
        .map((item, index) => {
          const fallbackByProgress = index < completedSteps;
          const isDoneFromStatus =
            typeof stepStatusById?.[item.id] === "boolean"
              ? Boolean(stepStatusById[item.id])
              : fallbackByProgress;
          const missingItems = (missingFieldsByStep?.[item.id] ?? []).filter(
            (issue) => !isOptionalEpiEpcIssue(issue)
          );
          const missingTargets = (missingTargetsByStep?.[item.id] ?? []).filter(
            (target) => !isOptionalEpiEpcIssue(target.message)
          );
          const { isDone, hasWarnings } = resolveReviewItemStatus({
            stepId: item.id,
            isDoneFromStatus,
            isAnexosEmpty: Boolean(isAnexosEmpty),
            missingItemsCount: missingItems.length,
          });
          return {
            id: item.id,
            title: item.title,
            isDone,
            hasWarnings,
            missingItems,
            missingTargets,
          };
        }),
    [completedSteps, stepStatusById, isAnexosEmpty, missingFieldsByStep, missingTargetsByStep]
  );
  const pendingReviewItems = useMemo(
    () =>
      reviewItems
        .filter((item) => !item.isDone)
        .map((item) => ({
          ...item,
          missingItems: item.missingItems.length
            ? item.missingItems
            : ["Concluir esta etapa para liberar a geração dos arquivos."],
          missingTargets: item.missingTargets.length
            ? item.missingTargets
            : [],
        })),
    [reviewItems]
  );
  const missingFields = useMemo(
    () =>
      openMissingStepId
        ? (missingFieldsByStep?.[openMissingStepId] ?? []).filter(
            (issue) => !isOptionalEpiEpcIssue(issue)
          )
        : [],
    [missingFieldsByStep, openMissingStepId]
  );
  const missingStepTitle = useMemo(
    () => reviewItems.find((item) => item.id === openMissingStepId)?.title ?? "Etapa",
    [reviewItems, openMissingStepId]
  );
  const missingTargets = useMemo(
    () => (openMissingStepId ? (missingTargetsByStep?.[openMissingStepId] ?? []) : []),
    [missingTargetsByStep, openMissingStepId]
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
              const { isDone, hasWarnings, missingItems } = item;
              const statusLabel = !isDone ? "Incompleto" : hasWarnings ? "Atenção" : "Completo";
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border/60 bg-background/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        !isDone
                          ? "border-danger-foreground/30 bg-danger text-danger-foreground"
                          : hasWarnings
                            ? "border-warning-foreground/30 bg-warning text-warning-foreground"
                            : "border-success-foreground/30 bg-success text-success-foreground"
                      }`}
                    >
                      {!isDone ? (
                        <TriangleAlert className="h-4 w-4" />
                      ) : hasWarnings ? (
                        <TriangleAlert className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
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
                        !isDone
                          ? "bg-danger text-danger-foreground"
                          : hasWarnings
                            ? "bg-warning text-warning-foreground"
                            : "bg-success text-success-foreground"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    {missingItems.length > 0 ? (
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
                  : "Gere os arquivos finais (PDF, DOCX e XLSX) no modelo base do PGR."}
              </p>
              {lastFakePdfAt ? (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Última geração realizada em {lastFakePdfAt}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">PGR: {pgrId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pendingReviewItems.length > 0) {
                    setIsGenerateBlockedModalOpen(true);
                    return;
                  }
                  onGenerateFakePdf();
                }}
                disabled={isGeneratingFakePdf || isFinalizingPgr}
                className={
                  isGeneratingFakePdf || isFinalizingPgr
                    ? "btn-disabled px-5"
                    : "btn-primary px-5"
                }
              >
                {isGeneratingFakePdf ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Gerar PDF, DOCX e XLSX
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onFinalizePgr}
                disabled={workflow.isLocked || isGeneratingFakePdf || isFinalizingPgr}
                className={
                  workflow.isLocked || isGeneratingFakePdf || isFinalizingPgr
                    ? "btn-disabled px-5"
                    : "btn-primary px-5"
                }
              >
                {isFinalizingPgr ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  "Finalizar PGR"
                )}
              </button>
            </div>
            {heavyGenerationWaitMessage ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-3 flex items-start gap-2 rounded-[12px] border border-primary/30 bg-primary/10 px-4 py-3 text-[13px] text-primary"
              >
                <Clock className="mt-0.5 h-4 w-4 shrink-0 animate-pulse" />
                <span>{heavyGenerationWaitMessage}</span>
              </div>
            ) : null}
            {attachmentsAreLarge && (isGeneratingFakePdf || isFinalizingPgr) ? (
              <div
                role="status"
                className="mt-3 flex items-start gap-2 rounded-[12px] border border-warning-foreground/30 bg-warning px-4 py-3 text-[13px] text-warning-foreground"
              >
                <Hourglass className="mt-0.5 h-4 w-4 shrink-0 animate-pulse" />
                <span>
                  Anexo grande ({attachmentsTotalMb} MB). A geração pode levar alguns
                  minutos. Não feche esta página.
                </span>
              </div>
            ) : null}
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
                {missingFields.map((field, index) => {
                  const target = missingTargets.find((item) => item.message === field);
                  return (
                    <div
                      key={`${openMissingStepId}-${index}`}
                      className="rounded-[10px] border border-border/60 bg-background/40 px-3 py-2"
                    >
                      <p className="text-[13px] text-foreground/90">{field}</p>
                      {target ? (
                        <button
                          type="button"
                          onClick={() => onOpenPendingTarget(target)}
                          className="mt-2 inline-flex rounded-full border border-warning-foreground/30 bg-warning px-3 py-1 text-[11px] font-semibold text-warning-foreground transition hover:brightness-95"
                        >
                          Ir para pendência
                        </button>
                      ) : null}
                    </div>
                  );
                })}
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
                    Complete os itens abaixo para liberar a geração dos arquivos.
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
                        <div
                          key={`${item.id}-field-${index}`}
                          className="rounded-[8px] border border-border/60 bg-card px-3 py-2"
                        >
                          <p className="text-[13px] text-foreground/90">{field}</p>
                          {item.missingTargets.find((target) => target.message === field) ? (
                            <button
                              type="button"
                              onClick={() => {
                                const target = item.missingTargets.find(
                                  (pendingTarget) => pendingTarget.message === field
                                );
                                if (!target) return;
                                setIsGenerateBlockedModalOpen(false);
                                onOpenPendingTarget(target);
                              }}
                              className="mt-2 inline-flex rounded-full border border-warning-foreground/30 bg-warning px-3 py-1 text-[11px] font-semibold text-warning-foreground transition hover:brightness-95"
                            >
                              Corrigir agora
                            </button>
                          ) : null}
                        </div>
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

    </>
  );
}
