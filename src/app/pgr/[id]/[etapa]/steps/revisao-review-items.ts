// Anexos é opcional (nunca bloqueia progresso/finalização, ver
// use-pgr-etapa-derived.ts) — mas o checklist de Revisão usava o mesmo
// `stepStatusById` tanto pro badge quanto pra decidir o que entra no modal
// de "Pendências de preenchimento" que bloqueia "Gerar PDF, DOCX e XLSX".
// Isso fazia Anexos vazio aparecer como pendência bloqueante, quando deveria
// só mostrar o aviso âmbar (mesmo tratamento do restante do app). Separado
// num módulo .ts puro pra testar sem esbarrar no JSX de revisao-step.tsx.
export const resolveReviewItemStatus = ({
  stepId,
  isDoneFromStatus,
  isAnexosEmpty,
  missingItemsCount,
}: {
  stepId: string;
  isDoneFromStatus: boolean;
  isAnexosEmpty: boolean;
  missingItemsCount: number;
}): { isDone: boolean; hasWarnings: boolean } => {
  if (stepId === "anexos") {
    return { isDone: true, hasWarnings: isAnexosEmpty };
  }
  return {
    isDone: isDoneFromStatus,
    hasWarnings: isDoneFromStatus && missingItemsCount > 0,
  };
};
