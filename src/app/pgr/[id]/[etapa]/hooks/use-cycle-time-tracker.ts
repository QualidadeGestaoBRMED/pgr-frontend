import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { apiPut } from "@/lib/api";
import type { PgrStepId } from "@/app/pgr/steps";
import type { CycleTimeData, HistoricoData } from "../types";
import { normalizeCycleTime } from "../utils/cycle-time";

const AUTO_COMMIT_INTERVAL_MS = 30000;
const MIN_ELAPSED_MS = 250;

type UseCycleTimeTrackerParams = {
  pgrId: string;
  stepId: PgrStepId;
  historicoData: HistoricoData;
  isStateLoading: boolean;
  setHistoricoData: Dispatch<SetStateAction<HistoricoData>>;
};

export function useCycleTimeTracker({
  pgrId,
  stepId,
  historicoData,
  isStateLoading,
  setHistoricoData,
}: UseCycleTimeTrackerParams) {
  const historicoRef = useRef(historicoData);
  const cycleRef = useRef<CycleTimeData>(normalizeCycleTime(historicoData.cycleTime));
  const sessionStartedAtRef = useRef<number | null>(null);
  const [cycleTotalMs, setCycleTotalMs] = useState(cycleRef.current.totalMs);
  const [activeSessionStartedAtMs, setActiveSessionStartedAtMs] = useState<number | null>(null);

  useEffect(() => {
    historicoRef.current = historicoData;
    const normalized = normalizeCycleTime(historicoData.cycleTime);
    cycleRef.current = normalized;
    setCycleTotalMs(normalized.totalMs);
  }, [historicoData]);

  const persistCycleSnapshot = useCallback(
    (cycleTime: CycleTimeData) => {
      const mergedHistorico = {
        ...historicoRef.current,
        cycleTime,
      };
      void apiPut(`/api/frontend/pgr/${pgrId}/state`, { historico: mergedHistorico }).catch(
        () => {
          // Sem bloqueio de navegação caso a persistência imediata falhe.
        }
      );
    },
    [pgrId]
  );

  const applyCycleUpdate = useCallback(
    (nextCycle: CycleTimeData, options?: { flush?: boolean; skipState?: boolean }) => {
      cycleRef.current = nextCycle;
      setCycleTotalMs(nextCycle.totalMs);
      if (!options?.skipState) {
        setHistoricoData((prev) => ({
          ...prev,
          cycleTime: nextCycle,
        }));
      }

      if (options?.flush) {
        persistCycleSnapshot(nextCycle);
      }
    },
    [persistCycleSnapshot, setHistoricoData]
  );

  const commitElapsed = useCallback(
    (options?: { flush?: boolean; pause?: boolean; skipState?: boolean }) => {
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

      applyCycleUpdate(nextCycle, {
        flush: Boolean(options?.flush),
        skipState: Boolean(options?.skipState),
      });

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
    if (typeof document !== "undefined" && document.hidden) return;
    if (sessionStartedAtRef.current !== null) return;

    const now = Date.now();
    sessionStartedAtRef.current = now;
    setActiveSessionStartedAtMs(now);
  }, [isStateLoading]);

  useEffect(() => {
    if (isStateLoading) return;

    startSession();

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      commitElapsed({ flush: false, pause: false });
    }, AUTO_COMMIT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        commitElapsed({ flush: true, pause: true });
        return;
      }
      startSession();
    };

    const handleBeforeUnload = () => {
      commitElapsed({ flush: true, pause: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      commitElapsed({ flush: true, pause: true, skipState: true });
    };
  }, [commitElapsed, isStateLoading, startSession]);

  return {
    cycleTotalMs,
    activeSessionStartedAtMs,
  };
}
