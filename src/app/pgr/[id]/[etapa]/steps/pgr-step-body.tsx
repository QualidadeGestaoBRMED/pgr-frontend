"use client";

import { STEP_RENDERERS, renderFallbackStep } from "./renderers";
import type { StepRenderContext } from "./renderers/types";

export function PgrStepBody({ ctx }: { ctx: StepRenderContext }) {
  const renderer = STEP_RENDERERS[ctx.step.id] ?? renderFallbackStep;
  return <>{renderer(ctx)}</>;
}
