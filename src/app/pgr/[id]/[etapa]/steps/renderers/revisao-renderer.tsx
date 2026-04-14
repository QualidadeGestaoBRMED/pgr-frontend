import { RevisaoStep } from "../revisao-step";
import { RevisaoPreviewModal } from "../revisao-preview-modal";
import type { StepRenderer } from "./types";

export const renderRevisaoStep: StepRenderer = (ctx) => (
  <>
    <RevisaoStep
      pgrId={ctx.params.id}
      completedSteps={ctx.completedSteps}
      stepStatusById={ctx.stepStatusById}
      missingFieldsByStep={ctx.missingFieldsByStep}
      workflow={ctx.workflow}
      lastFakePdfAt={ctx.lastFakePdfAt}
      isGeneratingFakePdf={ctx.isGeneratingFakePdf}
      onEditStep={(stepId) => ctx.router.push(`/pgr/${ctx.params.id}/${stepId}`)}
      onOpenPreview={() => ctx.setIsPreviewModalOpen(true)}
      onGenerateFakePdf={ctx.handleGenerateFakePdf}
    />
    <RevisaoPreviewModal
      open={ctx.isPreviewModalOpen}
      fakePreviewLines={ctx.fakePreviewLines}
      pdfLayout={ctx.pdfLayout}
      isGeneratingFakePdf={ctx.isGeneratingFakePdf}
      onPdfLayoutChange={ctx.setPdfLayout}
      onGeneratePreviewPdf={ctx.handleGeneratePreviewPdf}
      onClose={() => ctx.setIsPreviewModalOpen(false)}
      onGenerate={ctx.handleGenerateFakePdf}
    />
  </>
);
