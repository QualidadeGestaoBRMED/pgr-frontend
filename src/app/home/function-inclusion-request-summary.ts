/**
 * Resumo dos números de solicitação exibidos no banner da Home.
 *
 * A listagem passou a trazer toda pendência aberta da empresa, sem corte por
 * data — o que é o certo, já que "Finalizar todas" resolve todas elas — mas
 * uma empresa com muitas pendências enfileirava dezenas de números numa
 * linha só. Acima do limite, o banner passa a apontar para o botão, que abre
 * o quadro completo com rolagem e checkboxes.
 */
export const FUNCTION_INCLUSION_INLINE_NUMBERS_LIMIT = 3;

export function describeFunctionInclusionRequestNumbers(
  requestNumbers: string[],
  limit = FUNCTION_INCLUSION_INLINE_NUMBERS_LIMIT
): string | null {
  const numbers = requestNumbers
    .map((requestNumber) => String(requestNumber || "").trim())
    .filter(Boolean);

  if (numbers.length === 0) return null;
  if (numbers.length === 1) return `Solicitação nº ${numbers[0]}`;
  if (numbers.length <= limit) return `Solicitações nº ${numbers.join(", ")}`;

  return `${numbers.length} solicitações pendentes — clique em "Verificar solicitações" para ver os números.`;
}
