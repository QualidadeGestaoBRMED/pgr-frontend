import type { PlanGeneralMeasureRow, RiskGheGroup } from "../types";

export type PlanActionRiskOption = {
  label: string;
  value: string;
};

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

const getRiskContentKey = (risk: RiskGheGroup["risks"][number]) =>
  [risk.descricaoAgente, risk.classificacao]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("||");

const buildRiskLabel = (risk: RiskGheGroup["risks"][number], index: number) =>
  `${risk.descricaoAgente || `Risco ${index + 1}`} · ${
    risk.classificacao || "Sem classificação"
  }`;

export function buildCommonRiskOptionsForGhes(
  availableGheGroups: RiskGheGroup[],
  selectedGheIds: string[]
): PlanActionRiskOption[] {
  const selectedIdSet = new Set(
    selectedGheIds.map((id) => String(id || "").trim()).filter(Boolean)
  );
  const selectedGroups = availableGheGroups.filter((ghe) => selectedIdSet.has(ghe.id));
  if (!selectedGroups.length) return [];

  const commonKeys = selectedGroups.reduce<Set<string> | null>((currentKeys, ghe) => {
    const gheKeys = new Set(
      ghe.risks.map(getRiskContentKey).filter((key) => key !== "||")
    );
    if (currentKeys === null) return gheKeys;
    return new Set([...currentKeys].filter((key) => gheKeys.has(key)));
  }, null);

  if (!commonKeys?.size) return [];

  const seenKeys = new Set<string>();
  return selectedGroups[0].risks.flatMap((risk, index) => {
    const key = getRiskContentKey(risk);
    if (!commonKeys.has(key) || seenKeys.has(key)) return [];
    seenKeys.add(key);
    return [{ label: buildRiskLabel(risk, index), value: risk.id }];
  });
}
