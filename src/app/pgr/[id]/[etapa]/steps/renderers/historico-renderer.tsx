import { HistoricoStep } from "../historico-step";
import type { StepRenderer } from "./types";

export const renderHistoricoStep: StepRenderer = (ctx) => (
  <HistoricoStep
    title={ctx.historicoData.title}
    subtitle={ctx.historicoData.subtitle}
    changes={ctx.historicoData.changes}
    workflow={ctx.workflow}
    isGeneratingFakePdf={ctx.isGeneratingFakePdf}
    onDownloadPdf={ctx.handleGenerateFakePdf}
    onStartNewVersion={ctx.handleStartNewVersion}
  />
);
