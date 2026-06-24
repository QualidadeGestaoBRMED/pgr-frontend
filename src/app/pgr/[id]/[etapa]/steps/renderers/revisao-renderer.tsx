import { buildPendingReviewHref } from "../../utils/pending-review";
import { RevisaoStep } from "../revisao-step";
import type { StepRenderer } from "./types";

export const renderRevisaoStep: StepRenderer = (ctx) => (
  <>
    <RevisaoStep
      pgrId={ctx.params.id}
      completedSteps={ctx.completedSteps}
      stepStatusById={ctx.stepStatusById}
      missingFieldsByStep={ctx.missingFieldsByStep}
      missingTargetsByStep={ctx.missingTargetsByStep}
      workflow={ctx.workflow}
      lastFakePdfAt={ctx.lastFakePdfAt}
      isGeneratingFakePdf={ctx.isGeneratingFakePdf}
      isFinalizingPgr={ctx.isFinalizingPgr}
      onEditStep={(stepId) => ctx.router.push(`/pgr/${ctx.params.id}/${stepId}`)}
      onOpenPendingTarget={(target) =>
        ctx.router.push(buildPendingReviewHref(ctx.params.id, target))
      }
      onGenerateFakePdf={ctx.handleGenerateFakePdf}
      onFinalizePgr={ctx.handleFinalizePgr}
      onResetData={ctx.handleResetAllData}
    />
  </>
);
