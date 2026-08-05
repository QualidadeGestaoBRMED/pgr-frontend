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
let pendingSaveOperations = 0;
let onSaveActivityHandler: ((isSaving: boolean) => void) | null = null;

// Qualquer erro de save que NÃO seja 409 (rede, 400, 500, payload grande
// demais etc.) sempre foi engolido em silêncio pelos callers — o usuário
// seguia editando por horas achando que estava salvando, sem nenhum aviso.
// Isso já causou perda de dados real em produção. `onSaveErrorHandler`
// avisa a UI a cada falha e a cada recuperação (save seguinte com sucesso).
let onSaveErrorHandler: ((hasError: boolean) => void) | null = null;

export function setSaveErrorHandler(
  fn: ((hasError: boolean) => void) | null
): void {
  onSaveErrorHandler = fn;
}

export function setSaveActivityHandler(
  fn: ((isSaving: boolean) => void) | null
): void {
  onSaveActivityHandler = fn;
  fn?.(pendingSaveOperations > 0);
}

function trackSaveActivity<T>(operation: Promise<T>): Promise<T> {
  pendingSaveOperations += 1;
  onSaveActivityHandler?.(true);
  return operation.finally(() => {
    pendingSaveOperations = Math.max(0, pendingSaveOperations - 1);
    onSaveActivityHandler?.(pendingSaveOperations > 0);
  });
}

export function getKnownUpdatedAt(pgrId: string): string | null {
  return knownUpdatedAtByPgr.get(pgrId) ?? null;
}

export function setKnownUpdatedAt(
  pgrId: string,
  value: string | null | undefined
): void {
  if (typeof value !== "string" || !value.trim()) return;
  // updated_at só cresce; manter o maior evita regredir o token por causa de
  // respostas que chegam fora de ordem (ex.: deletes paralelos).
  const current = knownUpdatedAtByPgr.get(pgrId);
  if (current) {
    const a = Date.parse(current);
    const b = Date.parse(value);
    if (Number.isFinite(a) && Number.isFinite(b) && b < a) return;
  }
  knownUpdatedAtByPgr.set(pgrId, value);
}

// Uma resposta de GET /state representa a versão que o banco realmente tem.
// Ela precisa substituir até um token maior: uma mutação concorrente antiga
// pode ter devolvido um updatedAt que depois foi sobrescrito no banco antes de
// as gravações do mesmo cliente passarem a usar a fila única.
export function replaceKnownUpdatedAt(
  pgrId: string,
  value: string | null | undefined
): void {
  if (typeof value !== "string" || !value.trim()) return;
  knownUpdatedAtByPgr.set(pgrId, value);
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

// Cadeia de gravação por pgrId: serializa os saves (single-flight). Sem isso,
// os vários gatilhos de autosave do mesmo cliente (debounce, avanço de etapa,
// cronômetro) saem concorrentes com o mesmo token e colidem entre si (409
// falso). Enfileirando, cada save só parte depois que o anterior terminou e
// atualizou o token — então o token está sempre fresco.
const saveChainByPgr = new Map<string, Promise<unknown>>();

async function runPutPgrState<T extends StateResponse>(
  pgrId: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  // Reavalia a pausa já dentro da fila: um 409 num save anterior pausa todos
  // os que ainda estavam enfileirados.
  if (savingPaused) {
    return null;
  }
  const body = {
    ...payload,
    expectedUpdatedAt: getKnownUpdatedAt(pgrId) ?? undefined,
  };
  try {
    const res = await apiPut<T>(
      `/api/v1/frontend/pgr/${pgrId}/state?compact=true`,
      body
    );
    setKnownUpdatedAt(pgrId, res?.updatedAt);
    onSaveErrorHandler?.(false);
    return res;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      savingPaused = true;
      onConflictHandler?.();
    } else {
      onSaveErrorHandler?.(true);
    }
    throw error;
  }
}

/**
 * Roda uma mutação de estado arbitrária (ex.: upload/exclusão de anexo) DENTRO
 * da mesma fila dos saves, para que nenhum autosave rode em paralelo com ela.
 * Atualiza o token de lock otimista a partir do `updatedAt` da resposta.
 *
 * Sem isso, o upload (que grava o estado fora do funil) comita concorrente a um
 * autosave em voo com token velho → 409 falso.
 */
export async function runInSaveChain<T extends StateResponse>(
  pgrId: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = saveChainByPgr.get(pgrId) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    const res = await task();
    setKnownUpdatedAt(pgrId, res?.updatedAt);
    return res;
  });
  const result = trackSaveActivity(operation);
  saveChainByPgr.set(
    pgrId,
    result.catch(() => undefined)
  );
  return result;
}

/**
 * Funil único de gravação do estado. Serializa as gravações por PGR, injeta o
 * token de lock otimista, atualiza-o a partir da resposta e, em caso de 409,
 * pausa as gravações e dispara o handler de conflito (a UI decide: recarregar
 * ou continuar).
 *
 * Retorna `null` quando a gravação foi pulada porque o save está pausado por
 * um conflito ainda não resolvido.
 */
export function putPgrState<T extends StateResponse = StateResponse>(
  pgrId: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  if (savingPaused) {
    return Promise.resolve(null);
  }
  const previous = saveChainByPgr.get(pgrId) ?? Promise.resolve();
  // Encadeia após o save anterior (ignorando o resultado/erro dele) para
  // garantir ordem e token atualizado. O resultado real volta em `result`.
  const operation = previous
    .catch(() => undefined)
    .then(() => runPutPgrState<T>(pgrId, payload));
  const result = trackSaveActivity(operation);
  // A cadeia nunca rejeita, senão um erro de save trava a fila inteira.
  saveChainByPgr.set(
    pgrId,
    result.catch(() => undefined)
  );
  return result;
}
