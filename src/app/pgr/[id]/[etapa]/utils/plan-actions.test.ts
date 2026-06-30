import { describe, expect, it } from "vitest";

import { buildPlanActionGeneralMeasureRow } from "./plan-actions";

describe("plan action helpers", () => {
  it("creates an independent general plan row for selected GHEs", () => {
    const row = buildPlanActionGeneralMeasureRow({
      description: "Instalar ventilacao local exaustora",
      nr: "NR-01",
      gheIds: ["g-2", "g-1"],
      idSeed: "test-1",
      availableGheGroups: [
        { id: "g-1", name: "GHE 1", risks: [] },
        { id: "g-2", name: "GHE 2", risks: [] },
        { id: "g-3", name: "GHE 3", risks: [] },
      ],
    });

    expect(row).toMatchObject({
      id: "plan-action-test-1",
      nr: "NR-01",
      descricao: "Instalar ventilacao local exaustora",
      gheName: "GHE 1, GHE 2",
      targetGheIds: ["g-2", "g-1"],
      tipoMedida: "",
      prazoAcao: "",
      responsavelAcao: "",
    });
  });

  it("labels the row as all GHEs when every available GHE is selected", () => {
    const row = buildPlanActionGeneralMeasureRow({
      description: "Treinar todos os trabalhadores",
      nr: "NR-01",
      gheIds: ["g-1", "g-2"],
      idSeed: "test-2",
      availableGheGroups: [
        { id: "g-1", name: "GHE 1", risks: [] },
        { id: "g-2", name: "GHE 2", risks: [] },
      ],
    });

    expect(row?.gheName).toBe("Todos os GHEs");
  });

  it("does not create a row without description or target GHE", () => {
    expect(
      buildPlanActionGeneralMeasureRow({
        description: "",
        nr: "NR-01",
        gheIds: ["g-1"],
        idSeed: "test-3",
        availableGheGroups: [{ id: "g-1", name: "GHE 1", risks: [] }],
      })
    ).toBeNull();
    expect(
      buildPlanActionGeneralMeasureRow({
        description: "Acao",
        nr: "NR-01",
        gheIds: [],
        idSeed: "test-4",
        availableGheGroups: [{ id: "g-1", name: "GHE 1", risks: [] }],
      })
    ).toBeNull();
  });
});
