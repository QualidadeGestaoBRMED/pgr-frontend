import type { GheGroup } from "../types";

/**
 * Desassocia todas as funções dos GHEs, preservando id, nome e a descrição
 * (processo/observações/ambiente) de cada um.
 *
 * É o núcleo do "Limpar apenas as funções" da etapa de Descrição do GHE.
 * Zerar `gheGroups` inteiro (o reset completo da etapa) derruba junto a
 * caracterização de riscos, porque `riskGheGroups` é derivado de `gheGroups`
 * em use-pgr-persistence — manter os grupos aqui é o que segura os riscos.
 */
export function clearGheFunctionAssignments(gheGroups: GheGroup[]): GheGroup[] {
  return gheGroups.map((ghe) => ({ ...ghe, items: [] }));
}
