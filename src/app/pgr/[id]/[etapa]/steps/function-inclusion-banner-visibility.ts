// O aviso só faz sentido enquanto o documento ainda está em elaboração
// (não travado) — depois de finalizado, a pendência vira acesso aberto pra
// qualquer usuário (ver _can_bypass_ownership_for_function_inclusion no
// backend), tratado por outro fluxo, não por este aviso. Separada num
// módulo .ts puro (sem JSX) pra dar pra testar sem esbarrar em
// function-inclusion-banner.tsx — o setup de teste deste projeto
// (vitest.config.ts) só transforma .test.ts puro, não componentes .tsx
// (tsconfig usa jsx: "preserve", que o esbuild do vitest não sabe
// transformar sem config extra).
export const shouldShowFunctionInclusionBanner = ({
  functionInclusionPending,
  isInElaborationPhase,
  isLocked,
}: {
  functionInclusionPending: boolean;
  isInElaborationPhase: boolean;
  isLocked: boolean;
}): boolean => functionInclusionPending && isInElaborationPhase && !isLocked;

export const shouldUseReadOnlyPgrView = ({
  finalizationActive,
  functionInclusionReadOnly,
}: {
  finalizationActive: boolean;
  functionInclusionReadOnly: boolean;
}): boolean => finalizationActive || functionInclusionReadOnly;
