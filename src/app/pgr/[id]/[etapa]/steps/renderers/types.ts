import type { ReactNode } from "react";

export type StepRenderContext = any;

export type StepRenderer = (ctx: StepRenderContext) => ReactNode;
