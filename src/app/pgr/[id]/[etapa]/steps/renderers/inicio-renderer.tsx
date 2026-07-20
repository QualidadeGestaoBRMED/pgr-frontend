import { InicioStep } from "../inicio-step";
import type { StepRenderer } from "./types";

export const renderInicioStep: StepRenderer = (ctx) => (
  <InicioStep
    inicioDraft={ctx.inicioDraft}
    isPipefySyncing={ctx.isPipefySyncing}
    isPipefySyncCoolingDown={ctx.isPipefySyncCoolingDown}
    pipefySyncCooldownSeconds={ctx.pipefySyncCooldownSeconds}
    inputBaseClass={ctx.inputBaseClass}
    pendingReviewFocus={ctx.pendingReviewFocus}
    onDraftChange={ctx.generalActions.handleInicioDraftChange}
    onSyncPipefy={ctx.handleSyncPipefy}
    onCheckPreviousPgr={ctx.handleCheckPreviousPgr}
    isCheckingPreviousPgr={ctx.isCheckingPreviousPgr}
    previousPgrCheckNotice={ctx.previousPgrCheckNotice}
    lastFunctionInclusion={ctx.lastFunctionInclusion}
  />
);
