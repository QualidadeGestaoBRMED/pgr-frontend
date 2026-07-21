"use client";

import { PgrShell } from "@/components/pgr-shell";
import { PgrStepBody } from "./steps/pgr-step-body";
import { StepFooterActions } from "./steps/step-footer-actions";
import { SaveConflictDialog } from "./steps/save-conflict-dialog";
import { SaveErrorBanner } from "./steps/save-error-banner";
import { PreviousVersionDialog } from "./steps/previous-version-dialog";
import { usePgrEtapaController } from "./hooks/use-pgr-etapa-controller";

export default function PgrEtapaPage({
  params,
}: {
  params: { id: string; etapa: string };
}) {
  const {
    conflict,
    saveError,
    previousImportDialog,
    shellProps,
    bodyCtx,
    footerProps,
  } = usePgrEtapaController({
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
      accessibleStepIds={shellProps.accessibleStepIds}
      cycleTimeMs={shellProps.cycleTimeMs}
      cycleSessionStartedAtMs={shellProps.cycleSessionStartedAtMs}
      onNavigateStep={shellProps.onNavigateStep}
    >
      <PgrStepBody ctx={bodyCtx} />
      <StepFooterActions {...footerProps} />
      <SaveConflictDialog
        open={conflict.open}
        onReload={conflict.onReload}
        onDismiss={conflict.onDismiss}
      />
      <SaveErrorBanner active={saveError} />
      <PreviousVersionDialog
        open={previousImportDialog.open}
        companyName={previousImportDialog.companyName}
        finalizedAt={previousImportDialog.finalizedAt}
        attachmentsCount={previousImportDialog.attachmentsCount}
        importing={previousImportDialog.importing}
        error={previousImportDialog.error}
        onImport={previousImportDialog.onImport}
      />
    </PgrShell>
  );
}
