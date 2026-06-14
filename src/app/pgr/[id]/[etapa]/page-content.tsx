"use client";

import { PgrShell } from "@/components/pgr-shell";
import { PgrStepBody } from "./steps/pgr-step-body";
import { StepFooterActions } from "./steps/step-footer-actions";
import { SaveConflictDialog } from "./steps/save-conflict-dialog";
import { usePgrEtapaController } from "./hooks/use-pgr-etapa-controller";

export default function PgrEtapaPage({
  params,
}: {
  params: { id: string; etapa: string };
}) {
  const { conflict, shellProps, bodyCtx, footerProps } = usePgrEtapaController({
    params,
  });

  return (
    <PgrShell
      pgrId={shellProps.pgrId}
      currentStep={shellProps.currentStep}
      completedSteps={shellProps.completedSteps}
      progressPercent={shellProps.progressPercent}
      stepStatusById={shellProps.stepStatusById}
      alertSteps={shellProps.alertSteps}
      cycleTimeMs={shellProps.cycleTimeMs}
      cycleSessionStartedAtMs={shellProps.cycleSessionStartedAtMs}
    >
      <PgrStepBody ctx={bodyCtx} />
      <StepFooterActions {...footerProps} />
      <SaveConflictDialog
        open={conflict.open}
        onReload={conflict.onReload}
        onDismiss={conflict.onDismiss}
      />
    </PgrShell>
  );
}
