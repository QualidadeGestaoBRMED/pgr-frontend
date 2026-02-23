"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PgrShell } from "@/components/pgr-shell";
import { PgrHistoricoPanel } from "@/components/pgr-historico-panel";
import { pgrSteps } from "@/app/pgr/steps";
import { usePgrProgress } from "@/app/pgr/use-pgr-progress";

const mockPgrDetail = {
  completedSteps: 1,
  title: "Histórico de Versões",
  subtitle: "Visualize o histórico de alterações do PGR",
  changes: [
    {
      id: "chg-1",
      company: "Indústria Metalúrgica ABC Ltda",
      analysis: "Análise Preliminar de Riscos",
      change: "Inclusão de novo GHE",
      reason: "Expansão do setor de soldagem",
      date: "14/01/2024",
    },
    {
      id: "chg-2",
      company: "Indústria Metalúrgica ABC Ltda",
      analysis: "Análise Preliminar de Riscos",
      change: "Inclusão de novo GHE",
      reason: "Expansão do setor de soldagem",
      date: "14/01/2024",
    },
  ],
};

export default function PgrHistoricoPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const currentIndex = useMemo(
    () => pgrSteps.findIndex((step) => step.id === "historico"),
    []
  );
  const nextStep =
    currentIndex >= 0 && currentIndex < pgrSteps.length - 1
      ? pgrSteps[currentIndex + 1]
      : null;
  const initialCompletedSteps = Math.max(
    mockPgrDetail.completedSteps,
    currentIndex
  );
  const [completedSteps, setCompletedSteps] = usePgrProgress(
    params.id,
    initialCompletedSteps
  );

  const handleAdvance = () => {
    // TODO: temporário. Considera a etapa atual como concluída ao avançar.
    setCompletedSteps((prev) => Math.max(prev, currentIndex + 1));
    if (nextStep) {
      router.push(`/pgr/${params.id}/${nextStep.id}`);
    }
  };

  return (
    <PgrShell
      pgrId={params.id}
      currentStep="historico"
      completedSteps={completedSteps}
    >
      <PgrHistoricoPanel
        title={mockPgrDetail.title}
        subtitle={mockPgrDetail.subtitle}
        changes={mockPgrDetail.changes}
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/pgr/${params.id}/inicio`)}
          className="btn-outline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <button
          type="button"
          onClick={handleAdvance}
          className="btn-primary px-6"
        >
          Avançar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </PgrShell>
  );
}
