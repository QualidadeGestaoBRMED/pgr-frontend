import type { DadosCadastraisDraft } from "../steps/types";

/**
 * `dadosCadastrais` da resposta do sync-pipefy é a cópia do banco com o card
 * por cima. Aplicar tudo sobre a tela fazia o "Sincronizar" restaurar o que o
 * usuário tinha acabado de limpar ou editar (e o autosave ainda não tinha
 * gravado). Só as chaves de `syncedFields` -- campos do card e o que a
 * sincronização preencheu agora -- entram. Backend antigo, sem
 * `syncedFields`, mantém o comportamento anterior (resposta inteira).
 */
export function selectSyncedDados(
  fullResponseDados: Partial<DadosCadastraisDraft>,
  syncedFields: unknown
): Partial<DadosCadastraisDraft> {
  if (!Array.isArray(syncedFields)) return fullResponseDados;
  return Object.fromEntries(
    syncedFields
      .filter((key): key is string => typeof key === "string" && key in fullResponseDados)
      .map((key) => [key, fullResponseDados[key as keyof DadosCadastraisDraft]])
  ) as Partial<DadosCadastraisDraft>;
}

/**
 * Campo do card (`cardSourcedFields`) manda: a origem sobrescreve a tela. O
 * resto de `syncedFields` foi preenchido agora pelo lookup da Receita, que no
 * backend só cobre campo vazio da cópia do banco -- aqui ele também só cobre
 * campo vazio da tela, senão o que o usuário digitou e o autosave ainda não
 * gravou era trocado pelo dado da Receita. Backend sem `cardSourcedFields`
 * mantém o comportamento anterior (tudo sobrescreve).
 */
export function keepScreenValuesOverLookupFills(
  syncedDados: Partial<DadosCadastraisDraft>,
  prev: DadosCadastraisDraft,
  cardSourcedFields: unknown
): Partial<DadosCadastraisDraft> {
  if (!Array.isArray(cardSourcedFields)) return syncedDados;
  const fromCard = new Set(cardSourcedFields.filter((key) => typeof key === "string"));
  return Object.fromEntries(
    Object.entries(syncedDados).filter(([key]) => {
      if (fromCard.has(key)) return true;
      const current = prev[key as keyof DadosCadastraisDraft];
      return typeof current !== "string" || !current.trim();
    })
  ) as Partial<DadosCadastraisDraft>;
}

/**
 * Contratantes e estabelecimentos não vêm em `syncedFields` como lista, só
 * como escalares (contratanteCnpj, estabelecimentoNome, campos do lookup da
 * Receita). Na sincronização legada a lista ganha do escalar, então eles têm
 * de entrar no primeiro item: o CNPJ do card sempre vale; os demais só
 * preenchem o que está vazio na tela. Sem item nenhum, a lista sai do merge e
 * é montada a partir dos escalares.
 */
function applySyncedListFields(
  dados: DadosCadastraisDraft,
  syncedDados: Partial<DadosCadastraisDraft>
): DadosCadastraisDraft {
  let next = dados;
  for (const [prefix, listKey] of [
    ["contratante", "contratantes"],
    ["estabelecimento", "estabelecimentos"],
  ] as const) {
    const synced = Object.entries(syncedDados).filter(
      ([key, value]) =>
        key.startsWith(prefix) &&
        key !== "estabelecimentoSelecionado" &&
        typeof value === "string" &&
        value.trim()
    ) as [string, string][];
    if (!synced.length) continue;
    const items = Array.isArray(next[listKey]) ? next[listKey] : [];
    if (!items.length) {
      const { [listKey]: _omit, ...rest } = next;
      next = rest as DadosCadastraisDraft;
      continue;
    }
    const first = { ...items[0] } as Record<string, unknown>;
    for (const [key, value] of synced) {
      const field = key.charAt(prefix.length).toLowerCase() + key.slice(prefix.length + 1);
      if (field === "cnpj" || !String(first[field] ?? "").trim()) {
        first[field] = value;
      }
    }
    next = {
      ...next,
      [listKey]: [first, ...items.slice(1)],
    } as DadosCadastraisDraft;
  }
  return next;
}

/**
 * Funde o resultado do sync-pipefy sobre o que está na tela, antes da
 * sincronização legada lista <-> escalares (feita pelo chamador).
 *
 * Parte de `prev` (e não de `initial`): o Pipefy só conhece os campos básicos
 * do card e nunca envia responsaveisCoordenacaoTecnica e outros dados
 * preenchidos à mão. O nome da empresa só cobre razão social/nome vazios.
 */
export function mergeSyncedDadosCadastrais({
  initial,
  prev,
  syncedDados,
  hasSyncedFields,
  fallbackCompany,
  cardSourcedFields,
}: {
  initial: DadosCadastraisDraft;
  prev: DadosCadastraisDraft;
  syncedDados: Partial<DadosCadastraisDraft>;
  hasSyncedFields: boolean;
  fallbackCompany: string;
  cardSourcedFields?: unknown;
}): DadosCadastraisDraft {
  syncedDados = keepScreenValuesOverLookupFills(syncedDados, prev, cardSourcedFields);
  const merged: DadosCadastraisDraft = {
    ...initial,
    ...prev,
    ...syncedDados,
    empresaRazaoSocial:
      String(syncedDados.empresaRazaoSocial || "").trim() ||
      String(prev.empresaRazaoSocial || "").trim() ||
      fallbackCompany,
    empresaNome:
      String(syncedDados.empresaNome || "").trim() ||
      String(prev.empresaNome || "").trim() ||
      fallbackCompany,
  };
  return hasSyncedFields ? applySyncedListFields(merged, syncedDados) : merged;
}
