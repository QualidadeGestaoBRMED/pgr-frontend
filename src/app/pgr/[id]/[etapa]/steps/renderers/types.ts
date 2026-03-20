import type { ReactNode } from "react";
import type { usePgrEtapaController } from "../../hooks/use-pgr-etapa-controller";

export type StepRenderContext = ReturnType<typeof usePgrEtapaController>["bodyCtx"];

export type StepRenderer = (ctx: StepRenderContext) => ReactNode;
