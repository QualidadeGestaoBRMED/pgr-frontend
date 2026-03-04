import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import { defaultHistorico } from "../defaults";
import type { AnexoItem, GheGroup, PgrFunction, RiskGheGroup } from "../types";

export type PersistedPgrState = {
  serverSynced?: boolean;
  syncedAt?: number;
  completedSteps: number;
  inicioDraft: InicioDraft;
  dadosCadastrais: DadosCadastraisDraft;
  cardMeta: {
    pipefyCardId: string;
    cardName: string;
    dueDate: string;
    companyId: number | null;
    responsibleId: number | null;
  };
  historicoData: typeof defaultHistorico;
  functionsData: PgrFunction[];
  extraEstabelecimentoFields: Array<{
    id: string;
    title: string;
    value: string;
    scope: "empresa" | "estabelecimento" | "contratante";
  }>;
  estabelecimentoSelecionado: string;
  planAction: { nr: string; vigencia: string };
  anexos: AnexoItem[];
  anexoDiretriz: string;
  gheGroups: GheGroup[];
  currentGheId: string;
  riskGheGroups: RiskGheGroup[];
  currentRiskGheId: string;
};

const pgrRuntimeStateCache = new Map<string, PersistedPgrState>();

export const getRuntimeCachedState = (pgrId: string): PersistedPgrState | null => {
  if (typeof window === "undefined") return null;
  return pgrRuntimeStateCache.get(pgrId) ?? null;
};

export const setRuntimeCachedState = (pgrId: string, state: PersistedPgrState) => {
  if (typeof window === "undefined") return;
  pgrRuntimeStateCache.set(pgrId, state);
};
