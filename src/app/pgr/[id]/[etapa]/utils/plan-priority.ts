const normalizePriorityToken = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const normalizePriorityText = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const normalized = normalizePriorityToken(value);

  if (!normalized) return "";
  if (normalized.includes("imediat") || normalized.includes("critic")) return "Imediata";
  if (normalized.includes("alta") || normalized.includes("alto")) return "Alta";
  if (normalized.includes("media") || normalized.includes("moderad")) return "Média";
  if (normalized.includes("baixa") || normalized.includes("baixo")) return "Baixa";
  return raw;
};

export const isModerateOrHigherPriority = (value: unknown) => {
  const normalized = normalizePriorityToken(normalizePriorityText(value));

  if (!normalized) return false;
  if (normalized.includes("baixa") || normalized.includes("baixo")) return false;
  return (
    normalized.includes("media") ||
    normalized.includes("moderad") ||
    normalized.includes("alta") ||
    normalized.includes("alto") ||
    normalized.includes("imediat") ||
    normalized.includes("critic")
  );
};

// Uma linha de Medidas Gerais pode ter duas origens (ver
// buildPlanActionGeneralMeasureRow e handleCreateNrPlanRows): a ação padrão do
// template da NR nasce com id "nr-general-", e a ação que o analista cria no
// modal do Plano de Ação -- escopos "Todos os GHEs" e "GHE específico" --
// nasce com id "plan-action-". A distinção define a ordem das duas no plano.
const MANUAL_PLAN_ACTION_ID_PREFIX = "plan-action-";

// A linha da tabela do Plano de Ação embrulha o id da medida geral
// (`plan-general-<id>`, ver use-pgr-etapa-derived), e é esse id embrulhado que
// chega ao backend. Por isso a busca é pelo prefixo em qualquer posição, e não
// só no início.
export const isManualPlanActionId = (value: unknown) =>
  String(value ?? "")
    .trim()
    .includes(MANUAL_PLAN_ACTION_ID_PREFIX);

// Ordem do plano: Medidas Gerais primeiro (as padrão do template antes das
// criadas à mão) e depois as linhas de risco.
export const PLAN_ROW_ORDER = {
  templateGeneralMeasure: 0,
  manualGeneralMeasure: 1,
  risk: 2,
} as const;

// A ação criada à mão no modal do Plano de Ação -- escopos "Todos os GHEs" e
// "GHE específico" -- vale com qualquer prioridade, inclusive Baixa: ali a
// prioridade é uma escolha explícita do analista, não o resultado da
// classificação do risco. O corte moderado-ou-superior continua valendo para
// todo o resto do plano.
export const shouldKeepPlanRowPriority = (options: {
  priority: unknown;
  isManualAction: boolean;
}) => options.isManualAction || isModerateOrHigherPriority(options.priority);

export const getPlanRowOrderRank = (options: {
  isGeneralMeasure: boolean;
  isManualAction: boolean;
}) => {
  if (!options.isGeneralMeasure) return PLAN_ROW_ORDER.risk;
  return options.isManualAction
    ? PLAN_ROW_ORDER.manualGeneralMeasure
    : PLAN_ROW_ORDER.templateGeneralMeasure;
};
