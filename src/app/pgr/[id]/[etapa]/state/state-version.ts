// Lock otimista do estado do PGR.
//
// Guarda, por pgrId, o `updatedAt` da última versão que este cliente carregou
// ou gravou com sucesso. Esse token vai em todo PUT /state como
// `expectedUpdatedAt`; o backend rejeita com 409 se a linha mudou desde então
// (ex.: o documento foi reatribuído a outra pessoa que já salvou).
//
// É um Map em memória do módulo: vale para a aba/sessão atual, que é
// exatamente o escopo que precisamos para detectar "minha cópia está velha".

import { apiPut, ApiError } from "@/lib/api";

const knownUpdatedAtByPgr = new Map<string, string>();

// Quando um save bate 409, pausamos toda gravação até o usuário recarregar.
// Assim a pessoa pode continuar editando localmente sem martelar o servidor
// nem sobrescrever a versão mais nova de quem assumiu o documento.
let savingPaused = false;
let onConflictHandler: (() => void) | null = null;

export function getKnownUpdatedAt(pgrId: string): string | null {
  return knownUpdatedAtByPgr.get(pgrId) ?? null;
}

export function setKnownUpdatedAt(
  pgrId: string,
  value: string | null | undefined
): void {
  if (typeof value === "string" && value.trim()) {
    knownUpdatedAtByPgr.set(pgrId, value);
  }
}

export function clearKnownUpdatedAt(pgrId: string): void {
  knownUpdatedAtByPgr.delete(pgrId);
}

export function isSavingPaused(): boolean {
  return savingPaused;
}

export function resumeSaving(): void {
  savingPaused = false;
}

export function setConflictHandler(fn: (() => void) | null): void {
  onConflictHandler = fn;
}

type StateResponse = { updatedAt?: string } & Record<string, unknown>;

/**
 * Funil único de gravação do estado. Injeta o token de lock otimista,
 * atualiza-o a partir da resposta e, em caso de 409, pausa as gravações e
 * dispara o handler de conflito (a UI decide: recarregar ou continuar).
 *
 * Retorna `null` quando a gravação foi pulada porque o save está pausado por
 * um conflito ainda não resolvido.
 */
export async function putPgrState<T extends StateResponse = StateResponse>(
  pgrId: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  if (savingPaused) {
    return null;
  }
  const body = {
    ...payload,
    expectedUpdatedAt: getKnownUpdatedAt(pgrId) ?? undefined,
  };
  try {
    const res = await apiPut<T>(`/api/v1/frontend/pgr/${pgrId}/state`, body);
    setKnownUpdatedAt(pgrId, res?.updatedAt);
    return res;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      savingPaused = true;
      onConflictHandler?.();
    }
    throw error;
  }
}
