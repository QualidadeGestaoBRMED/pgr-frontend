"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

export function SaveStatusIndicator({
  ready,
  saving,
  hidden = false,
}: {
  ready: boolean;
  saving: boolean;
  hidden?: boolean;
}) {
  if (!ready || hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
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
