import type { DadosCadastraisDraft, InicioDraft } from "../steps/types";
import { defaultHistorico } from "../defaults";
import type {
  AnexoItem,
  GheGroup,
  PgrDocxTemplateOption,
  PgrFunction,
  PlanGeneralMeasureRow,
  RiskGheGroup,
} from "../types";
import type { PlanTableRow } from "../hooks/use-pgr-etapa-derived";
import type { PersistedPlanActionItem } from "../utils/plan-action-items";
import type { PdfLayoutState } from "@/lib/pgr-pdf-runtime/layout";

export type PersistedPgrState = {
  serverSynced?: boolean;
  syncedAt?: number;
  completedSteps: number;
  progressPercent?: number;
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
    scope: "empresa" | "estabelecimento" | "contratante" | "quantitativo";
  }>;
  estabelecimentoSelecionado: string;
  planAction: { nr: string; vigencia: string; items?: PersistedPlanActionItem[] };
  planTableRows?: PlanTableRow[];
  persistedOptionsByRowId?: Record<string, string[]>;
  removedPlanRiskKeys: string[];
  planGeneralMeasures: PlanGeneralMeasureRow[];
  anexos: AnexoItem[];
  anexoDiretriz: string;
  anexoDiretrizTemplateId?: number | null;
  pgrDocxTemplates?: PgrDocxTemplateOption[];
  gheGroups: GheGroup[];
  currentGheId: string;
  riskGheGroups: RiskGheGroup[];
  currentRiskGheId: string;
  pdfLayout: PdfLayoutState;
  workflow: {
    isLocked: boolean;
    version: number;
    statusLabel?: string | null;
    rejectionReason?: string | null;
    wasRejected?: boolean;
    // ID da fase do Pipefy que originou a rejeição (workflow.rejection.sourcePhaseId
    // no backend). Usado para decidir se a correção pede o motivo por modal
    // (rejeição pelo cliente) ou libera direto (retornos internos).
    rejectionSourcePhaseId?: string | null;
    finalizedAt: string | null;
    finalizedBy: string | null;
    finalizedById: number | null;
  };
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
