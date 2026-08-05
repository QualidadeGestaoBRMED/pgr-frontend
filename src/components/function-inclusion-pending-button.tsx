"use client";

import { AlertTriangle } from "lucide-react";

type FunctionInclusionPendingButtonProps = {
  visible: boolean;
  onOpen: () => void;
};

/**
 * Botão flutuante (canto inferior esquerdo) mostrado durante a elaboração
 * de um PGR cuja empresa tem inclusão de função pendente. Abre o mesmo
 * quadro de solicitações do banner da Home, só que em modo consulta (sem
 * "Finalizar") -- ver FunctionInclusionRequestsModal.
 */
export function FunctionInclusionPendingButton({
  visible,
  onOpen,
}: FunctionInclusionPendingButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning px-4 py-2.5 text-[13px] font-semibold text-warning-foreground shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition hover:brightness-95"
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      Inclusões pendentes
    </button>
  );
}
