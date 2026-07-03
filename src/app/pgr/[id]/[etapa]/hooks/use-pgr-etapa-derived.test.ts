import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAN_ACOMPANHAMENTO,
  DEFAULT_PLAN_AFERICAO_RESULTADO,
  materializeEffectivePlanRow,
  type PlanTableRow,
} from "./use-pgr-etapa-derived";

describe("materializeEffectivePlanRow", () => {
  it("fills effective defaults used by the plan table", () => {
    const row: PlanTableRow = {
      id: "ghe-1-risk-1",
      gheId: "ghe-1",
      riskId: "risk-1",
      gheName: "GHE 1",
      tipoAgente: "Físico",
      descricaoAgente: "Ruído",
      prioridade: "Média",
      classificacao: "Risco Moderado",
      medidasPrevencao: "Implementar controle",
      tipoMedida: "Administrativa",
      prazoAcao: "",
      responsavelAcao: "",
      acompanhamento: "",
      afericaoResultado: "",
    };

    const materialized = materializeEffectivePlanRow(row, {
      calculatedPlanActionVigencia: "01/01/2026 - 31/12/2026",
      defaultResponsibleActionName: "Empresa Exemplo",
    });

    expect(materialized.prazoAcao).toBe("30/06/2026");
    expect(materialized.responsavelAcao).toBe("Empresa Exemplo");
    expect(materialized.acompanhamento).toBe(DEFAULT_PLAN_ACOMPANHAMENTO);
    expect(materialized.afericaoResultado).toBe(
      DEFAULT_PLAN_AFERICAO_RESULTADO
    );
  });
});
