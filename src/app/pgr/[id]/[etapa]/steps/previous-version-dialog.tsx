"use client";

import { History } from "lucide-react";

type PreviousVersionDialogProps = {
  open: boolean;
  companyName: string;
  finalizedAt: string;
  attachmentsCount: number;
  importing: boolean;
  error: string | null;
  onImport: () => void;
};

/**
 * Aviso de PGR anterior disponível.
 *
 * Aparece ao abrir um card novo (recém-sincronizado com o Pipefy) quando a
 * mesma empresa já possui um PGR finalizado guardado na plataforma. É sempre
 * o mesmo documento, só muda a revisão — não há opção de começar do zero: o
 * único caminho é confirmar a importação dos dados da versão anterior (dados
 * cadastrais, funções, GHEs, riscos, plano de ação e anexos).
 */
export function PreviousVersionDialog({
  open,
  companyName,
  finalizedAt,
  attachmentsCount,
  importing,
  error,
  onImport,
}: PreviousVersionDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-md rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <History className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[18px] font-semibold text-foreground">
                Encontramos um PGR anterior desta empresa
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {companyName ? (
                  <>
                    A empresa <strong>{companyName}</strong> já possui um PGR
                    finalizado na plataforma
                  </>
                ) : (
                  <>Esta empresa já possui um PGR finalizado na plataforma</>
                )}
                {finalizedAt ? <> em {finalizedAt}</> : null}.
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Vamos preencher este documento com os dados cadastrais,
                funções, GHEs, riscos, plano de ação
                {attachmentsCount > 0
                  ? ` e ${attachmentsCount} anexo${attachmentsCount > 1 ? "s" : ""}`
                  : ""}{" "}
                da versão anterior, abrindo a próxima revisão para edição.
              </p>
              {error ? (
                <p className="mt-2 text-[13px] font-medium text-danger-foreground">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onImport}
              disabled={importing}
              className="btn-primary px-3 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
              autoFocus
            >
              {importing ? "Importando..." : "Importar dados"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
