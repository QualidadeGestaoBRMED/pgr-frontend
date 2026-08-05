"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SAVED_VISIBLE_MS = 2000;

export function SaveStatusIndicator({
  ready,
  saving,
  hidden = false,
}: {
  ready: boolean;
  saving: boolean;
  hidden?: boolean;
}) {
  const [showSaved, setShowSaved] = useState(false);
  const wasSavingRef = useRef(false);

  useEffect(() => {
    if (!ready) {
      wasSavingRef.current = false;
      setShowSaved(false);
      return;
    }

    if (saving) {
      wasSavingRef.current = true;
      setShowSaved(false);
      return;
    }

    if (hidden) {
      wasSavingRef.current = false;
      setShowSaved(false);
      return;
    }

    if (!wasSavingRef.current) return;
    wasSavingRef.current = false;

    setShowSaved(true);
    const timeoutId = window.setTimeout(() => setShowSaved(false), SAVED_VISIBLE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [hidden, ready, saving]);

  if (!ready || hidden || (!saving && !showSaved)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 inline-flex animate-in items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.14)] fade-in duration-200"
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-[#4f9f35]" aria-hidden="true" />
      )}
      {saving ? "Salvando..." : "Salvo"}
    </div>
  );
}
