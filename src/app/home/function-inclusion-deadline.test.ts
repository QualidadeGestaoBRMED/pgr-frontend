import { describe, expect, it } from "vitest";
import {
  getFunctionInclusionDeadlineAlert,
  parseFunctionInclusionDeadline,
} from "./function-inclusion-deadline";

const now = new Date(2026, 7, 5, 15, 30);

describe("prazo de segurança da inclusão de função", () => {
  it("aceita datas brasileiras e ISO sem deslocamento de fuso", () => {
    expect(parseFunctionInclusionDeadline("08/08/2026 18:00")).toBe(
      Date.UTC(2026, 7, 8)
    );
    expect(parseFunctionInclusionDeadline("2026-08-08T00:00:00-03:00")).toBe(
      Date.UTC(2026, 7, 8)
    );
  });

  it("mostra warning quando faltam de dois a três dias", () => {
    expect(getFunctionInclusionDeadlineAlert(["08/08/2026"], now)).toMatchObject({
      severity: "warning",
      daysRemaining: 3,
      label: "Vence em 3 dias",
    });
    expect(getFunctionInclusionDeadlineAlert(["07/08/2026"], now)).toMatchObject({
      severity: "warning",
      daysRemaining: 2,
      label: "Vence em 2 dias",
    });
  });

  it("mantém warning faltando um dia ou no vencimento", () => {
    expect(getFunctionInclusionDeadlineAlert(["06/08/2026"], now)).toMatchObject({
      severity: "warning",
      label: "Vence em 1 dia",
    });
    expect(getFunctionInclusionDeadlineAlert(["05/08/2026"], now)).toMatchObject({
      severity: "warning",
      label: "Vence hoje",
    });
  });

  it("usa danger somente após o prazo", () => {
    expect(getFunctionInclusionDeadlineAlert(["03/08/2026"], now)).toMatchObject({
      severity: "danger",
      label: "Atrasado há 2 dias",
    });
  });

  it("usa o prazo mais crítico quando a empresa possui várias solicitações", () => {
    expect(
      getFunctionInclusionDeadlineAlert(
        ["20/08/2026", "08/08/2026", "04/08/2026"],
        now
      )
    ).toMatchObject({
      severity: "danger",
      deadline: "04/08/2026",
      label: "Atrasado há 1 dia",
    });
  });

  it("não cria alerta para prazo distante, vazio ou inválido", () => {
    expect(getFunctionInclusionDeadlineAlert(["20/08/2026"], now)).toBeNull();
    expect(getFunctionInclusionDeadlineAlert(["", "sem prazo"], now)).toBeNull();
    expect(parseFunctionInclusionDeadline("31/02/2026")).toBeNull();
  });
});
