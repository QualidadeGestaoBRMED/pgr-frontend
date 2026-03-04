import type { CycleTimeData } from "../types";

export const normalizeCycleTime = (raw: unknown): CycleTimeData => {
  const candidate = (raw as Partial<CycleTimeData> | null) ?? null;
  const byStepRaw = candidate?.byStepMs;
  const byStepMs =
    byStepRaw && typeof byStepRaw === "object"
      ? Object.entries(byStepRaw).reduce<Record<string, number>>((acc, [key, value]) => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed < 0) return acc;
          acc[key] = parsed;
          return acc;
        }, {})
      : {};

  const totalMsRaw = Number(candidate?.totalMs);
  return {
    totalMs: Number.isFinite(totalMsRaw) && totalMsRaw >= 0 ? totalMsRaw : 0,
    firstOpenedAt:
      typeof candidate?.firstOpenedAt === "string" && candidate.firstOpenedAt
        ? candidate.firstOpenedAt
        : null,
    lastActiveAt:
      typeof candidate?.lastActiveAt === "string" && candidate.lastActiveAt
        ? candidate.lastActiveAt
        : null,
    byStepMs,
  };
};

export const formatDurationHms = (totalMs: number): string => {
  const safeMs = Math.max(0, Math.floor(Number(totalMs) || 0));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

