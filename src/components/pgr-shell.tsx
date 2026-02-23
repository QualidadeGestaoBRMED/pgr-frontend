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
    <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-[14px] bg-white px-6 py-6">
        <h2 className="text-[18px] font-semibold text-[#1f3f52]">Etapas</h2>

        <ul className="mt-6 space-y-5">
          {pgrSteps.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isDone = index < clampedCompleted;
            const isAlert = !isDone && step.tone === "alert";
            const circleClasses = isDone
              ? "bg-[#dff5e8] text-[#1a7f4f]"
              : isAlert
                ? "bg-[#ffe1e1] text-[#d14c4c]"
                : "bg-[#eef0f4] text-[#8b96a5]";

            return (
              <li key={step.id} className="relative">
                <Link
                  href={`/pgr/${pgrId}/${step.id}`}
                  className="flex w-full gap-4"
                >
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold ${circleClasses}`}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    {index < pgrSteps.length - 1 && (
                      <span className="absolute left-1/2 top-8 h-10 w-px -translate-x-1/2 bg-[#d6d6d6]" />
                    )}
                  </div>
                  <div>
                    <span
                      className={`text-[15px] font-semibold ${
                        isCurrent ? "text-[#193b4f]" : "text-[#1f3f52]"
                      }`}
                    >
                      {step.title}
                    </span>
                    <p className="mt-1 text-[12px] text-[#9a9a9a]">
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
        <div className="rounded-[12px] bg-white px-6 py-5">
          <div className="flex items-center justify-between text-[13px] text-[#6f6f6f]">
            <span>Progresso</span>
            <span className="font-semibold text-[#2e2e2e]">
              {progressValue}%
            </span>
          </div>
          <div className="mt-3 h-3 w-full rounded-full bg-[#e6e6e6]">
            <div
              className="h-3 rounded-full bg-[#6bbf46]"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
