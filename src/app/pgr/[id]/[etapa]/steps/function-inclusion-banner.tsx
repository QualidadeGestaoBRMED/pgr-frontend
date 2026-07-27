"use client";

import { UserPlus } from "lucide-react";

type FunctionInclusionBannerProps = {
  active: boolean;
};

/**
 * Aviso interno mostrado dentro do documento em elaboração quando a
 * empresa deste PGR tem uma inclusão de função pendente (identificada pelo
 * poll do BR NET, mesma fonte do banner "Ver PGR desta empresa" na Home).
 *
 * Só o dono/responsável consegue editar o PGR nesse estágio (ver
 * _can_bypass_ownership_for_function_inclusion no backend — o acesso aberto
 * pra qualquer usuário só vale depois que o documento é finalizado), então
 * este aviso é o lembrete de que é ele quem precisa tratar a inclusão,
 * dentro do próprio fluxo de elaboração — não bloqueia nada, só sinaliza.
 */
export function FunctionInclusionBanner({ active }: FunctionInclusionBannerProps) {
  if (!active) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-[12px] border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/40"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
        <UserPlus className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-200">
          Inclusão de função pendente para esta empresa
        </p>
        <p className="mt-1 text-[12px] text-amber-800/90 dark:text-amber-300/90">
          Identificamos uma solicitação de inclusão de função ainda não
          incluída neste PGR. Confira o cadastro de funções e, ao concluir,
          marque a pendência como resolvida na Home.
        </p>
      </div>
    </div>
  );
}
