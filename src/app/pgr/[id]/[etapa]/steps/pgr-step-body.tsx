"use client";

import { STEP_RENDERERS, renderFallbackStep } from "./renderers";

export function PgrStepBody({ ctx }: { ctx: any }) {
  const renderer = STEP_RENDERERS[ctx.step.id] ?? renderFallbackStep;
  return <>{renderer(ctx)}</>;
}
