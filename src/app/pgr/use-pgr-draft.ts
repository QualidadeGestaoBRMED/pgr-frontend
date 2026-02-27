"use client";

import { useEffect, useState } from "react";

const getStorageKey = (pgrId: string, scope: string) =>
  `pgr-draft:${pgrId}:${scope}`;

export function usePgrDraft<T>(pgrId: string, scope: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(getStorageKey(pgrId, scope));
    if (!stored) {
      setHasLoaded(true);
      return;
    }

    try {
      setValue(JSON.parse(stored) as T);
    } catch {
      // Ignora conteúdo inválido e mantém estado inicial.
    } finally {
      setHasLoaded(true);
    }
  }, [pgrId, scope]);

  useEffect(() => {
    if (!hasLoaded) return;
    window.sessionStorage.setItem(
      getStorageKey(pgrId, scope),
      JSON.stringify(value)
    );
  }, [hasLoaded, pgrId, scope, value]);

  return [value, setValue] as const;
}
