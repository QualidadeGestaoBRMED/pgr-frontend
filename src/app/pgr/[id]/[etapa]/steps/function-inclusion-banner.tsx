"use client";

type FunctionInclusionBannerProps = {
  active: boolean;
  responsibleName?: string | null;
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
export function FunctionInclusionBanner({
  active,
  responsibleName,
}: FunctionInclusionBannerProps) {
  if (!active) return null;

  const subject = responsibleName?.trim() || "O usuário responsável";

  return (
    <div
      role="status"
      className="rounded-[12px] border border-primary/30 bg-primary/10 px-4 py-3 shadow-sm"
    >
      <p className="text-[13px] font-semibold text-foreground">
        Alteração documental pendente para esta empresa
      </p>
      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
        {subject} está elaborando este documento. A solicitação de inclusão
        de função deve ser tratada durante esta elaboração.
      </p>
    </div>
  );
}
