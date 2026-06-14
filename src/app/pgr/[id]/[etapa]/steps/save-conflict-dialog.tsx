"use client";

import { AlertTriangle } from "lucide-react";

type SaveConflictDialogProps = {
  open: boolean;
  onReload: () => void;
  onDismiss: () => void;
};

/**
 * Aviso de edição concorrente (lock otimista).
 *
 * Aparece quando uma gravação foi recusada com 409 porque outra pessoa alterou
 * este PGR — tipicamente após o documento ser reatribuído. As gravações ficam
 * pausadas: o usuário escolhe recarregar a versão mais recente ou continuar
 * editando localmente (sem salvar) até recarregar.
 */
export function SaveConflictDialog({
  open,
  onReload,
  onDismiss,
}: SaveConflictDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-md rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[18px] font-semibold text-foreground">
                Este PGR foi alterado por outra pessoa
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Alguém salvou uma versão mais recente deste documento desde que
                você o abriu. Para evitar sobrescrever esse trabalho, as
                gravações foram pausadas.
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Recarregue para trabalhar sobre a versão atual. Se continuar
                editando, suas alterações <strong>não serão salvas</strong> até
                recarregar.
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="btn-outline px-3 py-2 text-[13px]"
            >
              Continuar editando
            </button>
            <button
              type="button"
              onClick={onReload}
              className="btn-primary px-3 py-2 text-[13px]"
              autoFocus
            >
              Recarregar agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
