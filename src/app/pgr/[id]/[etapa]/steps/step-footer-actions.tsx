import { ArrowLeft, ArrowRight, Save } from "lucide-react";

type StepFooterActionsProps = {
  stepId: string;
  prevStepId: string | null;
  nextStepId: string | null;
  onNavigateStep: (stepId: string) => void;
  onAdvance: () => void;
  onCreateNextGhe: () => void;
  onOpenInfoForAdvance: () => void;
  canOpenInfoModal: boolean;
  remainingCount: number;
  hasNextExistingGhe: boolean;
  allGhesDescribed: boolean;
};

const BackButton = ({
  prevStepId,
  onNavigateStep,
}: {
  prevStepId: string | null;
  onNavigateStep: (stepId: string) => void;
}) =>
  prevStepId ? (
    <button
      type="button"
      onClick={() => onNavigateStep(prevStepId)}
      className="btn-outline"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  ) : (
    <button type="button" disabled className="btn-disabled">
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  );

const AdvanceButton = ({
  nextStepId,
  onAdvance,
  className = "btn-primary px-6",
}: {
  nextStepId: string | null;
  onAdvance: () => void;
  className?: string;
}) =>
  nextStepId ? (
    <button type="button" onClick={onAdvance} className={className}>
      Avançar
      <ArrowRight className="h-4 w-4" />
    </button>
  ) : (
    <button type="button" disabled className="btn-disabled border-0 px-6">
      Avançar
      <ArrowRight className="h-4 w-4" />
    </button>
  );

export function StepFooterActions({
  stepId,
  prevStepId,
  nextStepId,
  onNavigateStep,
  onAdvance,
  onCreateNextGhe,
  onOpenInfoForAdvance,
  canOpenInfoModal,
  remainingCount,
  hasNextExistingGhe,
  allGhesDescribed,
}: StepFooterActionsProps) {
  if (stepId === "descricao") {
    const disableDescricaoAdvance =
      remainingCount > 0 ||
      hasNextExistingGhe ||
      !canOpenInfoModal ||
      !allGhesDescribed;

    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackButton
          prevStepId={prevStepId}
          onNavigateStep={onNavigateStep}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCreateNextGhe}
            disabled={!canOpenInfoModal}
            className={canOpenInfoModal ? "btn-primary px-4" : "btn-disabled px-4"}
          >
            Descrever este GHE
          </button>
          <button type="button" className="btn-outline px-4">
            <Save className="h-4 w-4" />
            Salvar
          </button>
          {nextStepId ? (
            <button
              type="button"
              onClick={onOpenInfoForAdvance}
              disabled={disableDescricaoAdvance}
              className={disableDescricaoAdvance ? "btn-disabled px-6" : "btn-outline px-6"}
            >
              Avançar
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled className="btn-disabled border-0 px-6">
              Avançar
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stepId === "plano" || stepId === "anexos" || stepId === "revisao") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackButton
          prevStepId={prevStepId}
          onNavigateStep={onNavigateStep}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-outline px-4">
            <Save className="h-4 w-4" />
            Salvar
          </button>
          <AdvanceButton nextStepId={nextStepId} onAdvance={onAdvance} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <BackButton
        prevStepId={prevStepId}
        onNavigateStep={onNavigateStep}
      />
      <AdvanceButton nextStepId={nextStepId} onAdvance={onAdvance} />
    </div>
  );
}
