"use client";

import { PgrShell } from "@/components/pgr-shell";
import { PgrStepBody } from "./steps/pgr-step-body";
import { StepFooterActions } from "./steps/step-footer-actions";
import { usePgrEtapaController } from "./hooks/use-pgr-etapa-controller";

export default function PgrEtapaPage({
  params,
}: {
  params: { id: string; etapa: string };
}) {
  const { shellProps, bodyCtx, footerProps } = usePgrEtapaController({ params });

  return (
    <PgrShell
      pgrId={shellProps.pgrId}
      currentStep={shellProps.currentStep}
      completedSteps={shellProps.completedSteps}
      stepStatusById={shellProps.stepStatusById}
      alertSteps={shellProps.alertSteps}
      cycleTimeMs={shellProps.cycleTimeMs}
      cycleSessionStartedAtMs={shellProps.cycleSessionStartedAtMs}
    >
      <PgrStepBody ctx={bodyCtx} />
      <StepFooterActions {...footerProps} />
    </PgrShell>
  );
}
