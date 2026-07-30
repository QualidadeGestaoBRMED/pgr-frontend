"use client";

type FunctionInclusionBannerProps = {
  active: boolean;
  responsibleName?: string | null;
  readOnly?: boolean;
};

/**
 * Aviso interno mostrado dentro do documento em elaboração quando a
 * empresa deste PGR tem uma inclusão de função pendente (identificada pelo
 * poll do BR NET, mesma fonte do banner "Alteração documental pendente" na
 * Home — mesmo texto e mesmo tratamento visual, sem ícone, pra não destoar
 * do resto do app).
 *
 * Só o dono/responsável consegue editar o PGR nesse estágio (ver
 * _can_bypass_ownership_for_function_inclusion no backend). Outros usuários
 * podem consultar o conteúdo em modo somente leitura; este aviso deixa claro
 * quem está elaborando e quem deve tratar a inclusão no fluxo atual.
 */
export function FunctionInclusionBanner({
  active,
  responsibleName,
  readOnly = false,
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
        {subject} está elaborando este documento.{" "}
        {readOnly
          ? "Você está visualizando em modo somente leitura."
          : "A solicitação de inclusão de função deve ser tratada durante esta elaboração."}
      </p>
    </div>
  );
}
