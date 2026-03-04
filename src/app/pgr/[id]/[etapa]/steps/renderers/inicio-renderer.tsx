import { InicioStep } from "../inicio-step";
import type { StepRenderer } from "./types";

export const renderInicioStep: StepRenderer = (ctx) => (
  <InicioStep
    inicioDraft={ctx.inicioDraft}
    isPipefySyncing={ctx.isPipefySyncing}
    inputBaseClass={ctx.inputBaseClass}
    textareaBaseClass={ctx.textareaBaseClass}
    onLoadPipefyMock={ctx.generalActions.handleLoadPipefyMock}
    onDraftChange={ctx.generalActions.handleInicioDraftChange}
  />
);
