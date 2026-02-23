"use client";

import { useEffect, useState } from "react";

const getStorageKey = (pgrId: string) => `pgr-progress:${pgrId}`;

export function usePgrProgress(pgrId: string, initialCompleted: number) {
  const [completedSteps, setCompletedSteps] = useState(initialCompleted);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(getStorageKey(pgrId));
    if (!stored) return;
    const parsed = Number(stored);
    if (!Number.isNaN(parsed)) {
      setCompletedSteps(parsed);
    }
  }, [pgrId]);

  useEffect(() => {
    // TODO: temporário. Persistindo progresso localmente até integrar com API.
    window.sessionStorage.setItem(
      getStorageKey(pgrId),
      String(completedSteps)
    );
  }, [pgrId, completedSteps]);

  return [completedSteps, setCompletedSteps] as const;
}
