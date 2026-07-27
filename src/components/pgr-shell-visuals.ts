import type { PgrStepId } from "@/app/pgr/steps";

// Passos opcionais (anexos) ou parcialmente auto-preenchidos pela
// sincronização (dados) usam âmbar — é um aviso, não um bloqueio real como
// nos demais passos obrigatórios incompletos. Separada num módulo .ts puro
// (sem JSX) pra dar pra testar sem esbarrar em pgr-shell.tsx — o setup de
// teste deste projeto (vitest.config.ts) só transforma .test.ts puro, não
// componentes .tsx (tsconfig usa jsx: "preserve", que o esbuild do vitest
// não sabe transformar sem config extra).
export const resolveStepCircleClasses = ({
  stepId,
  isAlert,
  isDone,
}: {
  stepId: PgrStepId;
  isAlert: boolean;
  isDone: boolean;
}): string => {
  const isWarningAlert = isAlert && (stepId === "anexos" || stepId === "dados");
  if (isWarningAlert) {
    return "bg-[#fdf0d5] text-[#a86b00] dark:bg-[#4a3a1a] dark:text-[#ffcf70]";
  }
  if (isAlert) {
    return "bg-[#ffe1e1] text-[#d14c4c] dark:bg-[#5a2a2a] dark:text-[#ffb6b6]";
  }
  if (isDone) {
    return "bg-[#dff5e8] text-[#1a7f4f] dark:bg-[#2a5a3f] dark:text-[#c6f5de]";
  }
  return "bg-muted text-muted-foreground";
};
