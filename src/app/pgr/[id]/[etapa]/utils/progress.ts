import type { PgrStepId } from "@/app/pgr/steps";
import type { GheGroup } from "../types";

const TOTAL_STEP_UNITS = 8;

const DESCRIPTION_REQUIRED_INFO_FIELDS: Array<keyof GheGroup["info"]> = [
  "processo",
  "observacoes",
  "ambiente",
];

function isGheDescriptionComplete(ghe: GheGroup): boolean {
  const infoIsComplete = DESCRIPTION_REQUIRED_INFO_FIELDS.every(
    (field) => String(ghe.info?.[field] || "").trim().length > 0
  );
  return infoIsComplete && Array.isArray(ghe.items) && ghe.items.length > 0;
}

export function computeDescricaoProgressRatio(gheGroups: GheGroup[]): number {
  if (!Array.isArray(gheGroups) || gheGroups.length === 0) return 0;
  const describedCount = gheGroups.filter(isGheDescriptionComplete).length;
  return Math.max(0, Math.min(1, describedCount / gheGroups.length));
}

export function computeWeightedProgressPercent({
  stepStatusById,
  gheGroups,
  isLocked,
}: {
  stepStatusById: Partial<Record<PgrStepId, boolean>>;
  gheGroups: GheGroup[];
  isLocked: boolean;
}): number {
  if (isLocked) return 100;

  const descricaoRatio = computeDescricaoProgressRatio(gheGroups);
  const staticStepIds: PgrStepId[] = [
    "inicio",
    "historico",
    "dados",
    "caracterizacao",
    "plano",
    "anexos",
    "revisao",
  ];
  const staticUnits = staticStepIds.reduce((acc, stepId) => {
    return acc + (stepStatusById[stepId] ? 1 : 0);
  }, 0);

  const rawPercent = ((staticUnits + descricaoRatio) / TOTAL_STEP_UNITS) * 100;
  return Math.max(0, Math.min(100, Math.round(rawPercent)));
}
