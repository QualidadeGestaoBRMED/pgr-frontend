import { useCallback, useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api";
import type { PgrStepId } from "@/app/pgr/steps";
import type { CycleTimeData, HistoricoData } from "../types";
import { normalizeCycleTime } from "../utils/cycle-time";

const HEARTBEAT_INTERVAL_MS = 30000;
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const MIN_INCREMENT_MS = 250;
const MAX_INCREMENT_MS = 60000;
const TAB_ID_KEY = "pgr-cycle-time-tab-id";

const createUuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (Number(char) ^ (Math.random() * 16) >> (Number(char) / 4)).toString(16)
  );
};

const getTabId = () => {
  const existing = window.sessionStorage.getItem(TAB_ID_KEY);
  if (existing) return existing;
  const created = createUuid();
  window.sessionStorage.setItem(TAB_ID_KEY, created);
  return created;
};

type UseCycleTimeTrackerParams = {
  pgrId: string;
  stepId: PgrStepId;
  historicoData: HistoricoData;
  isStateLoading: boolean;
  isLocked: boolean;
};

type CycleTimeEvent = "start" | "heartbeat" | "exit";

export function useCycleTimeTracker({
  pgrId,
  stepId,
  historicoData,
  isStateLoading,
  isLocked,
}: UseCycleTimeTrackerParams) {
  const cycleRef = useRef<CycleTimeData>(normalizeCycleTime(historicoData.cycleTime));
  const visitIdRef = useRef<string | null>(null);
  const tabIdRef = useRef<string | null>(null);
  const sampleStartedAtRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());
  const pendingActiveMsRef = useRef(0);
  const pendingIdleMsRef = useRef(0);
  const idleTimerRef = useRef<number | null>(null);
  const sessionOpenRef = useRef(false);
  const [cycleTotalMs, setCycleTotalMs] = useState(cycleRef.current.totalMs);
  const [activeSessionStartedAtMs, setActiveSessionStartedAtMs] = useState<number | null>(null);

  useEffect(() => {
    const normalized = normalizeCycleTime(historicoData.cycleTime);
    if (normalized.totalMs >= cycleRef.current.totalMs) {
      cycleRef.current = normalized;
      setCycleTotalMs(normalized.totalMs);
    }
  }, [historicoData.cycleTime]);

  const applyActiveIncrement = useCallback((activeMs: number, now: number) => {
    if (activeMs <= 0) return;
    const previous = cycleRef.current;
    const nextCycle: CycleTimeData = {
      ...previous,
      totalMs: previous.totalMs + activeMs,
      firstOpenedAt: previous.firstOpenedAt || new Date(now).toISOString(),
      lastActiveAt: new Date(now).toISOString(),
      byStepMs: {
        ...previous.byStepMs,
        [stepId]: (previous.byStepMs[stepId] || 0) + activeMs,
      },
    };
    cycleRef.current = nextCycle;
    setCycleTotalMs(nextCycle.totalMs);
  }, [stepId]);

  const sampleVisibleTime = useCallback((now: number) => {
    const startedAt = sampleStartedAtRef.current;
    if (startedAt === null || now <= startedAt) return;
    const cappedNow = Math.min(now, startedAt + MAX_INCREMENT_MS);
    const idleBoundary = lastActivityAtRef.current + IDLE_THRESHOLD_MS;
    pendingActiveMsRef.current += Math.max(
      0,
      Math.min(cappedNow, idleBoundary) - startedAt
    );
    pendingIdleMsRef.current += Math.max(
      0,
      cappedNow - Math.max(startedAt, idleBoundary)
    );
    sampleStartedAtRef.current = now;
  }, []);

  const sendEvent = useCallback((
    event: CycleTimeEvent,
    activeMs: number,
    idleMs: number,
    keepalive = false
  ) => {
    const sessionId = visitIdRef.current;
    const tabId = tabIdRef.current;
    if (!sessionId || !tabId) return;
    const path = `/api/v1/frontend/pgr/${pgrId}/cycle-time`;
    const body = { event, sessionId, tabId, stepId, activeMs, idleMs };

    if (keepalive) {
      void fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
        keepalive: true,
      }).catch(() => undefined);
      return;
    }

    void apiPost<CycleTimeData>(path, body).then((persisted) => {
      const normalized = normalizeCycleTime(persisted);
      if (normalized.totalMs >= cycleRef.current.totalMs) {
        cycleRef.current = normalized;
        setCycleTotalMs(normalized.totalMs);
      }
    }).catch(() => undefined);
  }, [pgrId, stepId]);

  const flush = useCallback((event: CycleTimeEvent, keepalive = false) => {
    const now = Date.now();
    sampleVisibleTime(now);
    const activeMs = Math.min(pendingActiveMsRef.current, MAX_INCREMENT_MS);
    const idleMs = Math.min(
      pendingIdleMsRef.current,
      Math.max(0, MAX_INCREMENT_MS - activeMs)
    );
    pendingActiveMsRef.current = 0;
    pendingIdleMsRef.current = 0;
    if (event === "heartbeat" && activeMs + idleMs < MIN_INCREMENT_MS) return;
    applyActiveIncrement(activeMs, now);
    sendEvent(event, activeMs, idleMs, keepalive);
    const isIdle = now >= lastActivityAtRef.current + IDLE_THRESHOLD_MS;
    setActiveSessionStartedAtMs(event === "exit" || isIdle ? null : now);
  }, [applyActiveIncrement, sampleVisibleTime, sendEvent]);

  const scheduleIdle = useCallback(() => {
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    const delay = Math.max(0, lastActivityAtRef.current + IDLE_THRESHOLD_MS - Date.now());
    idleTimerRef.current = window.setTimeout(() => {
      flush("heartbeat");
    }, delay);
  }, [flush]);

  useEffect(() => {
    if (isStateLoading || isLocked || document.hidden) return;
    const now = Date.now();
    visitIdRef.current = createUuid();
    tabIdRef.current = getTabId();
    sampleStartedAtRef.current = now;
    lastActivityAtRef.current = now;
    sessionOpenRef.current = true;
    setActiveSessionStartedAtMs(now);
    sendEvent("start", 0, 0);
    scheduleIdle();

    const handleActivity = () => {
      if (document.hidden || !sessionOpenRef.current) return;
      const activityAt = Date.now();
      if (activityAt >= lastActivityAtRef.current + IDLE_THRESHOLD_MS) {
        sampleVisibleTime(activityAt);
        setActiveSessionStartedAtMs(activityAt);
      }
      lastActivityAtRef.current = activityAt;
      scheduleIdle();
    };
    const handleVisibility = () => {
      if (document.hidden) {
        flush("heartbeat", true);
        sampleStartedAtRef.current = null;
        setActiveSessionStartedAtMs(null);
      } else {
        const visibleAt = Date.now();
        sampleStartedAtRef.current = visibleAt;
        lastActivityAtRef.current = visibleAt;
        setActiveSessionStartedAtMs(visibleAt);
        scheduleIdle();
      }
    };
    const handleUnload = () => {
      if (!sessionOpenRef.current) return;
      flush("exit", true);
      sessionOpenRef.current = false;
    };
    const intervalId = window.setInterval(() => flush("heartbeat"), HEARTBEAT_INTERVAL_MS);
    const activityEvents = ["pointerdown", "keydown", "input", "scroll", "touchstart"] as const;
    activityEvents.forEach((event) => document.addEventListener(event, handleActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.clearInterval(intervalId);
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      activityEvents.forEach((event) => document.removeEventListener(event, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, [flush, isLocked, isStateLoading, sampleVisibleTime, scheduleIdle, sendEvent]);

  return { cycleTotalMs, activeSessionStartedAtMs };
}
