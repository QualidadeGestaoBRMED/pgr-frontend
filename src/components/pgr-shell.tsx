"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { pgrSteps, type PgrStepId } from "@/app/pgr/steps";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { formatDurationHms } from "@/app/pgr/[id]/[etapa]/utils/cycle-time";
import { resolveStepCircleClasses } from "./pgr-shell-visuals";

type PgrShellProps = {
  pgrId: string;
  currentStep: PgrStepId;
  completedSteps: number;
  progressPercent?: number;
  stepStatusById?: Partial<Record<PgrStepId, boolean>>;
  alertSteps?: Partial<Record<PgrStepId, boolean>>;
  accessibleStepIds?: PgrStepId[];
  onNavigateStep?: (stepId: PgrStepId) => void;
  cycleTimeMs?: number;
  cycleSessionStartedAtMs?: number | null;
  children: ReactNode;
};

function CycleTimeClock({
  cycleTimeMs,
  cycleSessionStartedAtMs,
}: {
  cycleTimeMs: number;
  cycleSessionStartedAtMs: number | null;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
  }, [cycleSessionStartedAtMs, cycleTimeMs]);

  useEffect(() => {
    if (cycleSessionStartedAtMs === null) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [cycleSessionStartedAtMs]);

  const totalMs = useMemo(() => {
    if (cycleSessionStartedAtMs === null) return cycleTimeMs;
    return cycleTimeMs + Math.max(0, nowMs - cycleSessionStartedAtMs);
  }, [cycleSessionStartedAtMs, cycleTimeMs, nowMs]);

  return (
    <span className="font-semibold text-foreground tabular-nums">
      {formatDurationHms(totalMs)}
    </span>
  );
}

export function PgrShell({
  pgrId,
  currentStep,
  completedSteps,
  progressPercent,
  stepStatusById,
  alertSteps,
  accessibleStepIds,
  onNavigateStep,
  cycleTimeMs = 0,
  cycleSessionStartedAtMs = null,
  children,
}: PgrShellProps) {
  const totalSteps = pgrSteps.length;
  const clampedCompleted = Math.max(
    0,
    Math.min(completedSteps, totalSteps)
  );
  const progressByCompletedSteps = Math.round(
    (clampedCompleted / totalSteps) * 100
  );
  const progressValue =
    typeof progressPercent === "number"
      ? Math.max(0, Math.min(100, Math.round(progressPercent)))
      : progressByCompletedSteps;

  return (
    <div className="mt-6 grid min-w-0 gap-5 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-0 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="self-start rounded-[14px] border border-transparent bg-card p-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] sm:p-6 lg:sticky lg:top-6 dark:border-border/60 dark:shadow-none">
        <h2 className="text-[18px] font-semibold text-foreground">Etapas</h2>

        <ul className="mt-5 space-y-2">
          {pgrSteps.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isAlert = Boolean(alertSteps?.[step.id]);
            const isDoneByRule = Boolean(stepStatusById?.[step.id]);
            const isDone = !isAlert && (isDoneByRule || index < clampedCompleted);
            const circleClasses = resolveStepCircleClasses({
              stepId: step.id,
              isAlert,
              isDone,
            });
            const rowClasses = isCurrent
              ? "bg-primary/10 ring-1 ring-primary/15 dark:bg-white/10 dark:ring-white/10"
              : "hover:bg-muted/60";

            return (
              <li key={step.id} className="relative">
                {index < pgrSteps.length - 1 ? (
                  <span className="pointer-events-none absolute -bottom-5 left-7 top-11 w-px bg-border" />
                ) : null}
                <Link
                  href={`/pgr/${pgrId}/${step.id}`}
                  scroll={false}
                  onClick={(event) => {
                    if (
                      !onNavigateStep ||
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }
                    event.preventDefault();
                    onNavigateStep(step.id);
                  }}
                  className={`flex w-full min-w-0 items-start gap-3 rounded-[10px] px-3 py-3 transition-colors ${rowClasses}`}
                >
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold ${circleClasses} ${isCurrent ? "ring-1 ring-primary/35 dark:ring-white/30" : ""}`}
                    >
                      {isDone && !isAlert ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <span
                      className={`block text-[15px] font-semibold leading-5 ${
                        isCurrent
                          ? "text-foreground"
                          : "text-foreground/80"
                      }`}
                    >
                      {step.title}
                    </span>
                    <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
                      {step.subtitle}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="min-w-0 space-y-5 sm:space-y-6">
        <div className="rounded-[12px] border border-transparent bg-card px-5 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] sm:px-6 dark:border-border/60 dark:shadow-none">
          <div className="flex items-center justify-between text-[13px] text-muted-foreground">
            <span>Progresso</span>
            <span className="font-semibold text-foreground">{progressValue}%</span>
          </div>
          <div className="mt-3 h-3 w-full rounded-full bg-muted">
            <div
              className="h-3 rounded-full bg-[#6bbf46] transition-[width] dark:bg-[#6fd35a]"
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-muted-foreground">
            <span>Cycle Time (documento ativo)</span>
            <CycleTimeClock
              cycleTimeMs={cycleTimeMs}
              cycleSessionStartedAtMs={cycleSessionStartedAtMs}
            />
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
