"use client";

import { AlertTriangle } from "lucide-react";

type SaveErrorBannerProps = {
  active: boolean;
};

/**
 * Avisa quando o autosave está falhando (rede, payload grande demais, erro
 * do servidor — qualquer coisa que não seja o conflito de 409, que tem seu
 * próprio diálogo). Antes disso, esses erros eram engolidos em silêncio: o
 * usuário seguia editando por horas achando que estava tudo salvo, e não
 * estava — causa raiz de um incidente real de perda de dados.
 *
 * Não bloqueia a edição de propósito (o usuário deve poder continuar
 * trabalhando/copiar o conteúdo como backup manual); some sozinho assim que
 * um save seguinte tiver sucesso.
 */
export function SaveErrorBanner({ active }: SaveErrorBannerProps) {
  if (!active) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-[12px] border border-danger-foreground/30 bg-danger px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-foreground/15 text-danger-foreground">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-danger-foreground">
            Não foi possível salvar as últimas alterações
          </p>
          <p className="mt-1 text-[12px] text-danger-foreground/90">
            Verifique sua conexão. Suas edições continuam aqui na tela, mas
            ainda não foram salvas — evite fechar ou recarregar a página até
            este aviso sumir.
          </p>
        </div>
      </div>
    </div>
  );
}
