import Link from "next/link";
import { Check } from "lucide-react";
import { pgrSteps, type PgrStepId } from "@/app/pgr/steps";
import type { ReactNode } from "react";

type PgrShellProps = {
  pgrId: string;
  currentStep: PgrStepId;
  completedSteps: number;
  children: ReactNode;
};

export function PgrShell({
  pgrId,
  currentStep,
  completedSteps,
  children,
}: PgrShellProps) {
  const totalSteps = pgrSteps.length;
  const clampedCompleted = Math.max(
    0,
    Math.min(completedSteps, totalSteps)
  );
  const progressValue = Math.round((clampedCompleted / totalSteps) * 100);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
      <aside className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <h2 className="text-[18px] font-semibold text-foreground">Etapas</h2>

        <ul className="mt-6 space-y-5">
          {pgrSteps.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isDone = index < clampedCompleted;
            const isAlert = !isDone && step.tone === "alert";
            const circleClasses = isDone
              ? "bg-[#dff5e8] text-[#1a7f4f] dark:bg-[#2a5a3f] dark:text-[#c6f5de]"
              : isAlert
                ? "bg-[#ffe1e1] text-[#d14c4c] dark:bg-[#5a2a2a] dark:text-[#ffb6b6]"
                : "bg-muted text-muted-foreground";
            const rowClasses = isCurrent
              ? "rounded-[10px] bg-primary/8 px-2 py-2 -mx-2 dark:bg-white/8"
              : "px-2 py-2 -mx-2";

            return (
              <li key={step.id} className="relative">
                <Link
                  href={`/pgr/${pgrId}/${step.id}`}
                  className={`flex w-full gap-4 ${rowClasses}`}
                >
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold ${circleClasses} ${isCurrent ? "ring-1 ring-primary/35 dark:ring-white/30" : ""}`}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    {index < pgrSteps.length - 1 && (
                      <span className="absolute left-1/2 top-8 h-10 w-px -translate-x-1/2 bg-border" />
                    )}
                  </div>
                  <div>
                    <span
                      className={`inline-block text-[15px] font-semibold ${
                        isCurrent
                          ? "border-b border-[#e5e5e5] pb-0 text-foreground dark:border-white/25"
                          : "text-foreground/80"
                      }`}
                    >
                      {step.title}
                    </span>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {step.subtitle}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="space-y-6">
        <div className="rounded-[12px] bg-card px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
          <div className="flex items-center justify-between text-[13px] text-muted-foreground">
            <span>Progresso</span>
            <span className="font-semibold text-foreground">
              {progressValue}%
            </span>
          </div>
          <div className="mt-3 h-3 w-full rounded-full bg-muted">
            <div
              className="h-3 rounded-full bg-[#6bbf46] dark:bg-[#6fd35a]"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
