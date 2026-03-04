import type { StepRenderer } from "./types";

export const renderFallbackStep: StepRenderer = (ctx) => (
  <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
    <h1 className="text-[22px] font-semibold text-foreground sm:text-[24px]">{ctx.step.title}</h1>
    <p className="mt-1 text-[14px] text-muted-foreground">{ctx.step.subtitle}</p>
    <div className="mt-6 rounded-[10px] bg-muted px-4 py-4 text-[14px] text-muted-foreground">
      Conteúdo da etapa <strong>{ctx.step.title}</strong> será exibido aqui.
    </div>
  </section>
);
