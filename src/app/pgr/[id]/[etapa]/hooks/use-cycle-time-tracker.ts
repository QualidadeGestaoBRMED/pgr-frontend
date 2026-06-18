import { useCallback, useEffect, useRef, useState } from "react";
import type { PgrStepId } from "@/app/pgr/steps";
import type { CycleTimeData, HistoricoData } from "../types";
import { normalizeCycleTime } from "../utils/cycle-time";

const AUTO_COMMIT_INTERVAL_MS = 30000;
const MIN_ELAPSED_MS = 250;

type UseCycleTimeTrackerParams = {
  stepId: PgrStepId;
  historicoData: HistoricoData;
  isStateLoading: boolean;
  isLocked: boolean;
};

export function useCycleTimeTracker({
  stepId,
  historicoData,
  isStateLoading,
  isLocked,
}: UseCycleTimeTrackerParams) {
  const cycleRef = useRef<CycleTimeData>(normalizeCycleTime(historicoData.cycleTime));
  const sessionStartedAtRef = useRef<number | null>(null);
  const [cycleTotalMs, setCycleTotalMs] = useState(cycleRef.current.totalMs);
  const [activeSessionStartedAtMs, setActiveSessionStartedAtMs] = useState<number | null>(null);

  useEffect(() => {
    const normalized = normalizeCycleTime(historicoData.cycleTime);
    cycleRef.current = normalized;
    setCycleTotalMs(normalized.totalMs);
  }, [historicoData]);

  const applyCycleUpdate = useCallback((nextCycle: CycleTimeData) => {
    cycleRef.current = nextCycle;
    setCycleTotalMs(nextCycle.totalMs);
  }, []);

  const commitElapsed = useCallback(
    (options?: { pause?: boolean }) => {
      const startedAt = sessionStartedAtRef.current;
      if (startedAt === null) return;

      const now = Date.now();
      const elapsedMs = now - startedAt;
      const shouldPause = Boolean(options?.pause);
      if (elapsedMs < MIN_ELAPSED_MS) {
        if (shouldPause) {
          sessionStartedAtRef.current = null;
          setActiveSessionStartedAtMs(null);
        }
        return;
      }

      const previous = cycleRef.current;
      const nowIso = new Date(now).toISOString();
      const nextCycle: CycleTimeData = {
        ...previous,
        totalMs: previous.totalMs + elapsedMs,
        firstOpenedAt: previous.firstOpenedAt || nowIso,
        lastActiveAt: nowIso,
        byStepMs: {
          ...previous.byStepMs,
          [stepId]: (previous.byStepMs[stepId] || 0) + elapsedMs,
        },
      };

      applyCycleUpdate(nextCycle);

      if (shouldPause) {
        sessionStartedAtRef.current = null;
        setActiveSessionStartedAtMs(null);
      } else {
        sessionStartedAtRef.current = now;
        setActiveSessionStartedAtMs(now);
      }
    },
    [applyCycleUpdate, stepId]
  );

  const startSession = useCallback(() => {
    if (isStateLoading) return;
    if (isLocked) return;
    if (typeof document !== "undefined" && document.hidden) return;
    if (sessionStartedAtRef.current !== null) return;

    const now = Date.now();
    sessionStartedAtRef.current = now;
    setActiveSessionStartedAtMs(now);
  }, [isLocked, isStateLoading]);

  useEffect(() => {
    if (isStateLoading) return;
    if (isLocked) {
      commitElapsed({ pause: true });
      return;
    }

    startSession();

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      commitElapsed({ pause: false });
    }, AUTO_COMMIT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        commitElapsed({ pause: true });
        return;
      }
      startSession();
    };

    const handleBeforeUnload = () => {
      commitElapsed({ pause: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      commitElapsed({ pause: true });
    };
  }, [commitElapsed, isLocked, isStateLoading, startSession]);

  return {
    cycleTotalMs,
    activeSessionStartedAtMs,
  };
}
