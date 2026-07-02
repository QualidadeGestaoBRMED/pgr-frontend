import {describe, expect, it} from "vitest";

import {
    buildCommonRiskOptionsForGhes,
    buildPlanActionGeneralMeasureRow,
    calculateAffectedWorkersRange,
    calculatePlanActionPriority,
    resolveRiskGradationValue,
} from "./plan-actions";

describe("plan action helpers", () => {
    it.each([
        [1, 1, "Nenhuma ação adicional é necessária"],
        [1, 2, "Nenhuma ação adicional é necessária"],
        [1, 3, "Baixa"],
        [1, 4, "Baixa"],
        [1, 5, "Média"],
        [2, 1, "Nenhuma ação adicional é necessária"],
        [2, 2, "Baixa"],
        [2, 3, "Média"],
        [2, 4, "Média"],
        [2, 5, "Média"],
        [3, 1, "Baixa"],
        [3, 2, "Média"],
        [3, 3, "Média"],
        [3, 4, "Alta"],
        [3, 5, "Alta"],
        [4, 1, "Baixa"],
        [4, 2, "Média"],
        [4, 3, "Alta"],
        [4, 4, "Alta"],
        [4, 5, "Imediatas"],
        [5, 1, "Média"],
        [5, 2, "Média"],
        [5, 3, "Alta"],
        [5, 4, "Imediatas"],
        [5, 5, "Imediatas"],
    ])(
        "calculates plan priority for risk %i and affected workers range %i",
        (riskGrade, affectedWorkersRange, expectedPriority) => {
            expect(calculatePlanActionPriority(riskGrade, affectedWorkersRange)).toBe(
                expectedPriority
            );
        }
    );

    it("accepts textual risk gradation labels when calculating plan priority", () => {
        expect(calculatePlanActionPriority("Risco Crítico", 4)).toBe("Imediatas");
        expect(calculatePlanActionPriority("Moderado", "Faixa 2")).toBe("Média");
        expect(resolveRiskGradationValue("Risco Baixo")).toBe(2);
    });

    it("does not calculate plan priority outside the 1 to 5 ranges", () => {
        expect(calculatePlanActionPriority(0, 1)).toBeNull();
        expect(calculatePlanActionPriority(1, 6)).toBeNull();
        expect(calculatePlanActionPriority("sem classificação", 3)).toBeNull();
    });

    it("classifies exactly 50 percent of affected workers as range 3", () => {
        expect(calculateAffectedWorkersRange(0.1)).toBe(1);
        expect(calculateAffectedWorkersRange(0.1001)).toBe(2);
        expect(calculateAffectedWorkersRange(0.5)).toBe(3);
        expect(calculateAffectedWorkersRange(0.5001)).toBe(4);
        expect(calculateAffectedWorkersRange(0.75)).toBe(4);
        expect(calculateAffectedWorkersRange(0.7501)).toBe(5);
    });

    it("creates an independent general plan row for selected GHEs", () => {
        const row = buildPlanActionGeneralMeasureRow({
            description: "Instalar ventilacao local exaustora",
            nr: "NR-01",
            gheIds: ["g-2", "g-1"],
            idSeed: "test-1",
            availableGheGroups: [
                {id: "g-1", name: "GHE 1", risks: []},
                {id: "g-2", name: "GHE 2", risks: []},
                {id: "g-3", name: "GHE 3", risks: []},
            ],
        });

        expect(row).toMatchObject({
            id: "plan-action-test-1",
            nr: "NR-01",
            descricao: "Instalar ventilacao local exaustora",
            gheName: "GHE 1, 2",
            targetGheIds: ["g-2", "g-1"],
            tipoMedida: "",
            prazoAcao: "",
            responsavelAcao: "",
        });
    });

    it("lists every selected GHE when all available GHEs are selected", () => {
        const row = buildPlanActionGeneralMeasureRow({
            description: "Treinar todos os trabalhadores",
            nr: "NR-01",
            gheIds: ["g-1", "g-2"],
            idSeed: "test-2",
            availableGheGroups: [
                {id: "g-1", name: "GHE 1", risks: []},
                {id: "g-2", name: "GHE 2", risks: []},
            ],
        });

        expect(row?.gheName).toBe("GHE 1, 2");
        expect(row?.targetGheIds).toEqual(["g-1", "g-2"]);
    });

    it("labels a single selected GHE without touching other GHEs", () => {
        const row = buildPlanActionGeneralMeasureRow({
            description: "Substituir protecao coletiva",
            nr: "NR-01",
            gheIds: ["g-2"],
            idSeed: "test-single-ghe",
            availableGheGroups: [
                {id: "g-1", name: "GHE 1", risks: []},
                {id: "g-2", name: "GHE 2", risks: []},
            ],
        });

        expect(row?.gheName).toBe("GHE 2");
        expect(row?.targetGheIds).toEqual(["g-2"]);
    });

    it("does not create a row without description or target GHE", () => {
        expect(
            buildPlanActionGeneralMeasureRow({
                description: "",
                nr: "NR-01",
                gheIds: ["g-1"],
                idSeed: "test-3",
                availableGheGroups: [{id: "g-1", name: "GHE 1", risks: []}],
            })
        ).toBeNull();
        expect(
            buildPlanActionGeneralMeasureRow({
                description: "Acao",
                nr: "NR-01",
                gheIds: [],
                idSeed: "test-4",
                availableGheGroups: [{id: "g-1", name: "GHE 1", risks: []}],
            })
        ).toBeNull();
    });

    it("lists only risks that are common to every selected GHE", () => {
        const options = buildCommonRiskOptionsForGhes(
            [
                {
                    id: "g-1",
                    name: "GHE 1",
                    risks: [
                        {
                            id: "r-ruido-g1",
                            tipoAgente: "Fisico",
                            descricaoAgente: "Ruido",
                            classificacao: "Risco Alto",
                        } as never,
                        {
                            id: "r-calor-g1",
                            tipoAgente: "Fisico",
                            descricaoAgente: "Calor",
                            classificacao: "Risco Moderado",
                        } as never,
                    ],
                },
                {
                    id: "g-2",
                    name: "GHE 2",
                    risks: [
                        {
                            id: "r-ruido-g2",
                            tipoAgente: "Fisico",
                            descricaoAgente: "Ruido",
                            classificacao: "Risco Alto",
                        } as never,
                        {
                            id: "r-quimico-g2",
                            tipoAgente: "Quimico",
                            descricaoAgente: "Poeira",
                            classificacao: "Risco Moderado",
                        } as never,
                    ],
                },
            ],
            ["g-1", "g-2"]
        );

        expect(options).toEqual([
            {
                label: "Ruido · Risco Alto",
                value: "r-ruido-g1",
            },
        ]);
    });

    it("lists all risks when a single GHE is selected", () => {
        const options = buildCommonRiskOptionsForGhes(
            [
                {
                    id: "g-1",
                    name: "GHE 1",
                    risks: [
                        {
                            id: "r-ruido-g1",
                            tipoAgente: "Fisico",
                            descricaoAgente: "Ruido",
                            classificacao: "Risco Alto",
                        } as never,
                        {
                            id: "r-calor-g1",
                            tipoAgente: "Fisico",
                            descricaoAgente: "Calor",
                            classificacao: "Risco Moderado",
                        } as never,
                    ],
                },
            ],
            ["g-1"]
        );

        expect(options.map((option) => option.value)).toEqual([
            "r-ruido-g1",
            "r-calor-g1",
        ]);
    });
});
