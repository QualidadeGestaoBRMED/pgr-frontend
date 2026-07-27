import { describe, expect, it } from "vitest";
import { resolveStepCircleClasses } from "./pgr-shell-visuals";

describe("resolveStepCircleClasses", () => {
  it("uses amber for an incomplete anexos step (optional, not blocking)", () => {
    const classes = resolveStepCircleClasses({
      stepId: "anexos",
      isAlert: true,
      isDone: false,
    });
    expect(classes).toContain("#fdf0d5");
  });

  it("uses amber for an incomplete dados step (partially auto-filled by sync)", () => {
    const classes = resolveStepCircleClasses({
      stepId: "dados",
      isAlert: true,
      isDone: false,
    });
    expect(classes).toContain("#fdf0d5");
  });

  it("uses red for every other incomplete required step", () => {
    const classes = resolveStepCircleClasses({
      stepId: "descricao",
      isAlert: true,
      isDone: false,
    });
    expect(classes).toContain("#ffe1e1");
    expect(classes).not.toContain("#fdf0d5");
  });

  it("uses green when the step is done and not alerting", () => {
    const classes = resolveStepCircleClasses({
      stepId: "plano",
      isAlert: false,
      isDone: true,
    });
    expect(classes).toContain("#dff5e8");
  });

  it("uses the neutral color when neither alerting nor done", () => {
    const classes = resolveStepCircleClasses({
      stepId: "caracterizacao",
      isAlert: false,
      isDone: false,
    });
    expect(classes).toBe("bg-muted text-muted-foreground");
  });
});
