import type {PlanGeneralMeasureRow, RiskGheGroup} from "../types";

export type PlanActionRiskOption = {
    label: string;
    value: string;
};

export const PLAN_ACTION_PRIORITY_MATRIX = {
    1: {
        1: "Nenhuma ação adicional é necessária",
        2: "Nenhuma ação adicional é necessária",
        3: "Baixa",
        4: "Baixa",
        5: "Média",
    },
    2: {
        1: "Nenhuma ação adicional é necessária",
        2: "Baixa",
        3: "Média",
        4: "Média",
        5: "Média",
    },
    3: {
        1: "Baixa",
        2: "Média",
        3: "Média",
        4: "Alta",
        5: "Alta",
    },
    4: {
        1: "Baixa",
        2: "Média",
        3: "Alta",
        4: "Alta",
        5: "Imediatas",
    },
    5: {
        1: "Média",
        2: "Média",
        3: "Alta",
        4: "Imediatas",
        5: "Imediatas",
    },
} as const;

type PlanActionRiskGrade = keyof typeof PLAN_ACTION_PRIORITY_MATRIX;
type PlanActionAffectedWorkersRange =
    keyof (typeof PLAN_ACTION_PRIORITY_MATRIX)[PlanActionRiskGrade];

const normalizePriorityLookupToken = (value: unknown) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

const parsePlanActionScaleValue = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    const match = String(value || "").match(/\d+/);
    if (!match) return null;
    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) ? parsed : null;
};

export const resolveRiskGradationValue = (riskGrade: unknown): number | null => {
    const numericValue = parsePlanActionScaleValue(riskGrade);
    if (numericValue && numericValue >= 1 && numericValue <= 5) return numericValue;

    const token = normalizePriorityLookupToken(riskGrade);
    if (!token) return null;
    if (token.includes("irrelevante")) return 1;
    if (token.includes("baixo")) return 2;
    if (token.includes("moderado")) return 3;
    if (token.includes("alto")) return 4;
    if (token.includes("critico")) return 5;
    return null;
};

export const calculatePlanActionPriority = (
    riskGrade: unknown,
    affectedWorkersRange: unknown
): string | null => {
    const riskValue = resolveRiskGradationValue(riskGrade);
    const rangeValue = parsePlanActionScaleValue(affectedWorkersRange);

    if (
        !riskValue ||
        !rangeValue ||
        riskValue < 1 ||
        riskValue > 5 ||
        rangeValue < 1 ||
        rangeValue > 5
    ) {
        return null;
    }

    return PLAN_ACTION_PRIORITY_MATRIX[riskValue as PlanActionRiskGrade][
        rangeValue as PlanActionAffectedWorkersRange
        ];
};

export const calculateAffectedWorkersRange = (
    affectedWorkersRatio: number | null | undefined
): number | null => {
    if (
        affectedWorkersRatio === null ||
        affectedWorkersRatio === undefined ||
        !Number.isFinite(affectedWorkersRatio)
    ) {
        return null;
    }

    const ratio = Math.max(0, Math.min(1, affectedWorkersRatio));
    if (ratio <= 0.1) return 1;
    if (ratio < 0.5) return 2;
    if (ratio === 0.5) return 3;
    if (ratio <= 0.75) return 4;
    return 5;
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
    const gheTokens = selectedGheNames
        .map((name) => name.replace(/^ghe\s*/i, "").trim())
        .filter(Boolean);
    const formattedGheName =
        gheTokens.length === selectedGheNames.length && gheTokens.length > 0
            ? `GHE ${gheTokens.join(", ")}`
            : selectedGheNames.join(", ");
    return {
        id: `plan-action-${String(idSeed || Date.now()).replace(/[^a-zA-Z0-9_-]+/g, "-")}`,
        nr: safeNr,
        descricao: safeDescription,
        gheName: formattedGheName || "Todos os GHEs",
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
        return [{label: buildRiskLabel(risk, index), value: risk.id}];
    });
}
