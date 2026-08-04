import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAN_ACOMPANHAMENTO,
  DEFAULT_PLAN_AFERICAO_RESULTADO,
  computeDisplayStepStatusById,
  computeIsAnexosEmpty,
  materializeEffectivePlanRow,
  shouldAlertStepWhenAdvanced,
  type PlanTableRow,
} from "./use-pgr-etapa-derived";
import type { AnexoItem } from "../types";

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
      defaultResponsibleActionName: "Grupo Econômico Exemplo",
    });

    expect(materialized.prazoAcao).toBe("30/06/2026");
    expect(materialized.responsavelAcao).toBe("Grupo Econômico Exemplo");
    expect(materialized.acompanhamento).toBe(DEFAULT_PLAN_ACOMPANHAMENTO);
    expect(materialized.afericaoResultado).toBe(
      DEFAULT_PLAN_AFERICAO_RESULTADO
    );
  });
});

describe("computeIsAnexosEmpty", () => {
  it("is empty when there are no anexo entries at all", () => {
    expect(computeIsAnexosEmpty([])).toBe(true);
  });

  it("is empty when every anexo entry has zero files (just the placeholder slot)", () => {
    const anexos: AnexoItem[] = [
      { id: "anexo-art", title: "ART", files: [] },
    ];
    expect(computeIsAnexosEmpty(anexos)).toBe(true);
  });

  it("is not empty once at least one anexo has a real file", () => {
    const anexos: AnexoItem[] = [
      { id: "anexo-art", title: "ART", files: [] },
      {
        id: "anexo-outro",
        title: "Outro",
        files: [{ id: "file-1", name: "documento.pdf" }],
      },
    ];
    expect(computeIsAnexosEmpty(anexos)).toBe(false);
  });
});

describe("computeDisplayStepStatusById", () => {
  it("overrides only anexos, leaving every other step status untouched", () => {
    const stepStatusById = {
      inicio: true,
      dados: false,
      descricao: true,
      anexos: true, // always-true usado pro cálculo de progresso
      revisao: true,
    };

    const withFiles = computeDisplayStepStatusById(stepStatusById, false);
    expect(withFiles).toEqual({ ...stepStatusById, anexos: true });

    const withoutFiles = computeDisplayStepStatusById(stepStatusById, true);
    expect(withoutFiles).toEqual({ ...stepStatusById, anexos: false });
  });
});

describe("shouldAlertStepWhenAdvanced", () => {
  it("never alerts historico regardless of completion", () => {
    expect(
      shouldAlertStepWhenAdvanced("historico", false, {
        currentStepId: "historico",
        completedSteps: 0,
      })
    ).toBe(false);
  });

  it("stays quiet on a step the user hasn't reached yet, even if incomplete", () => {
    // Right after sync: user is on "inicio", completedSteps is 0 — a later,
    // untouched step (ex.: anexos) must not alert yet.
    expect(
      shouldAlertStepWhenAdvanced("anexos", false, {
        currentStepId: "inicio",
        completedSteps: 0,
      })
    ).toBe(false);
  });

  it("alerts when the user is currently on the incomplete step", () => {
    expect(
      shouldAlertStepWhenAdvanced("anexos", false, {
        currentStepId: "anexos",
        completedSteps: 0,
      })
    ).toBe(true);
  });

  it("alerts when the user has navigated past the still-incomplete step", () => {
    expect(
      shouldAlertStepWhenAdvanced("descricao", false, {
        currentStepId: "plano",
        completedSteps: 0,
      })
    ).toBe(true);
  });

  it("does not alert a complete step even after the user moves past it", () => {
    expect(
      shouldAlertStepWhenAdvanced("descricao", true, {
        currentStepId: "plano",
        completedSteps: 5,
      })
    ).toBe(false);
  });
});
