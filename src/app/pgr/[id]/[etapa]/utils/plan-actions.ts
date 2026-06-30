import type { PlanGeneralMeasureRow, RiskGheGroup } from "../types";

type BuildPlanActionGeneralMeasureRowArgs = {
  description: string;
  nr: string;
  gheIds: string[];
  availableGheGroups: RiskGheGroup[];
  idSeed: string;
};

export function buildPlanActionGeneralMeasureRow({
  description,
  nr,
  gheIds,
  availableGheGroups,
  idSeed,
}: BuildPlanActionGeneralMeasureRowArgs): PlanGeneralMeasureRow | null {
  const safeDescription = String(description || "").trim();
  const safeNr = String(nr || "").trim();
  const selectedGheIds = Array.from(
    new Set(gheIds.map((id) => String(id || "").trim()).filter(Boolean))
  );
  if (!safeDescription || selectedGheIds.length === 0) return null;

  const selectedIdSet = new Set(selectedGheIds);
  const selectedGheNames = availableGheGroups
    .filter((ghe) => selectedIdSet.has(ghe.id))
    .map((ghe) => String(ghe.name || "").trim())
    .filter(Boolean);
  const allAvailableSelected =
    availableGheGroups.length > 0 &&
    selectedGheIds.length === availableGheGroups.length &&
    availableGheGroups.every((ghe) => selectedIdSet.has(ghe.id));

  return {
    id: `plan-action-${String(idSeed || Date.now()).replace(/[^a-zA-Z0-9_-]+/g, "-")}`,
    nr: safeNr,
    descricao: safeDescription,
    gheName: allAvailableSelected
      ? "Todos os GHEs"
      : selectedGheNames.join(", ") || "Todos os GHEs",
    targetGheIds: selectedGheIds,
    tipoMedida: "",
    prazoAcao: "",
    responsavelAcao: "",
    acompanhamento: "",
    afericaoResultado: "",
  };
}
