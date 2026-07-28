"use client";

type FunctionInclusionBannerProps = {
  active: boolean;
};

/**
 * Aviso interno mostrado dentro do documento em elaboração quando a
 * empresa deste PGR tem uma inclusão de função pendente (identificada pelo
 * poll do BR NET, mesma fonte do banner "Alteração documental pendente" na
 * Home — mesmo texto e mesmo tratamento visual, sem ícone, pra não destoar
 * do resto do app).
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
      className="mb-4 rounded-[12px] border border-warning-foreground/30 bg-warning px-4 py-3"
    >
      <p className="text-[13px] font-semibold text-warning-foreground">
        Alteração documental pendente para esta empresa
      </p>
      <p className="mt-1 text-[12px] text-warning-foreground/90">
        Identificamos uma solicitação de inclusão de função ainda não
        incluída neste PGR. Confira o cadastro de funções e, ao concluir,
        marque a pendência como resolvida na Home.
      </p>
    </div>
  );
}
