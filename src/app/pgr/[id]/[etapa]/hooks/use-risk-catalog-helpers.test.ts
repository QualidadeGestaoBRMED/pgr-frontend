import { describe, expect, it } from "vitest";
import { buildPlanMeasureOptions } from "./use-risk-catalog-helpers";

const criterio = (
  actionDescriptionValues: string[],
  controlMeasureValues: string[]
) => ({ actionDescriptionValues, controlMeasureValues });

describe("buildPlanMeasureOptions", () => {
  it("offers the control measures alongside the action descriptions", () => {
    const options = buildPlanMeasureOptions(
      [criterio(["Implantar sistema de exaustão"], ["Uso de protetor auricular"])],
      ""
    );

    expect(options).toEqual([
      "Implantar sistema de exaustão",
      "Uso de protetor auricular",
    ]);
  });

  it("keeps the action descriptions first, since they are the plan's own catalog", () => {
    const options = buildPlanMeasureOptions(
      [criterio(["Ação B"], ["Medida A"]), criterio(["Ação C"], ["Medida D"])],
      ""
    );

    expect(options).toEqual(["Ação B", "Ação C", "Medida A", "Medida D"]);
  });

  it("dedupes a measure that is cataloged as both action and control measure", () => {
    const options = buildPlanMeasureOptions(
      [criterio(["Treinamento periódico"], ["Treinamento periódico"])],
      ""
    );

    expect(options).toEqual(["Treinamento periódico"]);
  });

  it("drops empty and whitespace-only catalog entries", () => {
    const options = buildPlanMeasureOptions([criterio(["", "  "], ["Medida"])], "");

    expect(options).toEqual(["Medida"]);
  });

  it("appends a current value that is absent from both catalogs", () => {
    const options = buildPlanMeasureOptions(
      [criterio(["Ação"], ["Medida"])],
      "Texto digitado pelo analista"
    );

    expect(options).toEqual(["Ação", "Medida", "Texto digitado pelo analista"]);
  });

  it("does not duplicate a current value already present in the catalogs", () => {
    const options = buildPlanMeasureOptions([criterio(["Ação"], ["Medida"])], "Medida");

    expect(options).toEqual(["Ação", "Medida"]);
  });

  it("returns an empty list when the risk has no cataloged criteria", () => {
    expect(buildPlanMeasureOptions([], "")).toEqual([]);
  });
});
