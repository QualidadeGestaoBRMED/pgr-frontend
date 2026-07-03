import type { PlanTableRow } from "../hooks/use-pgr-etapa-derived";

export type PersistedPlanActionItem = {
  id: string;
  gheId: string;
  gheName: string;
  riscoId: string;
  riskDescription: string;
  descricao: string;
  medida: string;
  responsavel: string;
  prazo: string;
  acompanhamento: string;
  status: string;
  prioridade: string;
  tipoMedida: string;
  afericaoResultado: string;
};

export const buildPersistedPlanActionItems = (
  rows: PlanTableRow[] | undefined
): PersistedPlanActionItem[] => {
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row) => String(row.medidasPrevencao || "").trim().length > 0)
    .map((row, index) => ({
      id: String(row.id || "").trim() || `plan-row-${index + 1}`,
      gheId: String(row.gheId || "").trim(),
      gheName: String(row.gheName || "").trim() || "Todos os GHEs",
      riscoId: String(row.riskId || "").trim(),
      riskDescription: String(row.descricaoAgente || "").trim(),
      descricao: String(row.medidasPrevencao || "").trim(),
      medida: String(row.medidasPrevencao || "").trim(),
      responsavel: String(row.responsavelAcao || "").trim(),
      prazo: String(row.prazoAcao || "").trim(),
      acompanhamento: String(row.acompanhamento || "").trim(),
      status: "Pendente",
      prioridade: String(row.prioridade || "").trim(),
      tipoMedida: String(row.tipoMedida || "").trim(),
      afericaoResultado: String(row.afericaoResultado || "").trim(),
    }));
};
