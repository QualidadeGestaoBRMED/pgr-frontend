"use client";

import { AlertTriangle } from "lucide-react";

type FunctionInclusionFinalizedNoticeDialogProps = {
  open: boolean;
  onClose: () => void;
  onGoToHome: () => void;
};

/**
 * Aviso pós-finalização quando a empresa deste PGR tem inclusão de função
 * pendente, mas a finalização passou pelo fluxo completo (PIPEFY_PUBLISH:
 * gera PDF/XLSX, anexa e movimenta o card pelas fases no Pipefy) -- ao
 * contrário do LOCK_ONLY (reabertura pontual de um card já DONE), aqui não
 * dá pra saber se o Portal de Serviços já deu baixa na solicitação, então
 * não faz sentido levar o técnico direto pro modal de "Finalizar" no Home.
 * Só avisa e deixa ele decidir quando ir.
 */
export function FunctionInclusionFinalizedNoticeDialog({
  open,
  onClose,
  onGoToHome,
}: FunctionInclusionFinalizedNoticeDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-md rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[18px] font-semibold text-foreground">
                PGR finalizado com sucesso
              </h3>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                É necessário finalizar também esta solicitação no Portal de
                Serviços. Depois disso, acesse o Home para marcar a inclusão de
                função como resolvida.
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline px-3 py-2 text-[13px]"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={onGoToHome}
              className="btn-primary px-3 py-2 text-[13px]"
              autoFocus
            >
              Ir para o Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
