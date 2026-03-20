import { describe, expect, it } from "vitest";

import { formatDurationHms, normalizeCycleTime } from "./cycle-time";

describe("cycle-time utils", () => {
  it("normalizeCycleTime returns safe defaults for invalid payload", () => {
    const normalized = normalizeCycleTime({
      totalMs: -10,
      firstOpenedAt: 123,
      lastActiveAt: {},
      byStepMs: {
        inicio: 1000,
        dados: "2500",
        broken: "abc",
        negative: -1,
      },
    });

    expect(normalized.totalMs).toBe(0);
    expect(normalized.firstOpenedAt).toBeNull();
    expect(normalized.lastActiveAt).toBeNull();
    expect(normalized.byStepMs).toEqual({
      inicio: 1000,
      dados: 2500,
    });
  });

  it("normalizeCycleTime preserves valid values", () => {
    const normalized = normalizeCycleTime({
      totalMs: 3601000,
      firstOpenedAt: "2026-03-19T12:00:00Z",
      lastActiveAt: "2026-03-19T13:00:00Z",
      byStepMs: { inicio: 1000, dados: 2000 },
    });

    expect(normalized.totalMs).toBe(3601000);
    expect(normalized.firstOpenedAt).toBe("2026-03-19T12:00:00Z");
    expect(normalized.lastActiveAt).toBe("2026-03-19T13:00:00Z");
    expect(normalized.byStepMs).toEqual({ inicio: 1000, dados: 2000 });
  });

  it("formatDurationHms formats milliseconds as hh:mm:ss", () => {
    expect(formatDurationHms(0)).toBe("00:00:00");
    expect(formatDurationHms(15000)).toBe("00:00:15");
    expect(formatDurationHms(3723000)).toBe("01:02:03");
  });
});
