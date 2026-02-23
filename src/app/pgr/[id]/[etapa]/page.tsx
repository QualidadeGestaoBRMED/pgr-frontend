"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown, PlusCircle } from "lucide-react";
import { PgrShell } from "@/components/pgr-shell";
import { PgrHistoricoPanel } from "@/components/pgr-historico-panel";
import { pgrSteps, type PgrStepId } from "@/app/pgr/steps";
import { notFound } from "next/navigation";
import { usePgrProgress } from "@/app/pgr/use-pgr-progress";

const mockPgrDetail = {
  completedSteps: 1,
  historico: {
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
  },
};

export default function PgrEtapaPage({
  params,
}: {
  params: { id: string; etapa: string };
}) {
  const router = useRouter();
  const step = pgrSteps.find((item) => item.id === params.etapa);
  if (!step) {
    notFound();
  }

  const currentIndex = useMemo(
    () => pgrSteps.findIndex((item) => item.id === step.id),
    [step.id]
  );
  const prevStep = currentIndex > 0 ? pgrSteps[currentIndex - 1] : null;
  const nextStep =
    currentIndex < pgrSteps.length - 1 ? pgrSteps[currentIndex + 1] : null;
  const initialCompletedSteps = Math.max(
    mockPgrDetail.completedSteps,
    currentIndex
  );
  const [completedSteps, setCompletedSteps] = usePgrProgress(
    params.id,
    initialCompletedSteps
  );
  const inputBaseClass =
    "mt-2 h-[40px] w-full rounded-[8px] border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const selectBaseClass =
    "h-[40px] w-full appearance-none rounded-[8px] border border-border bg-muted px-3 pr-10 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

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
      currentStep={step.id as PgrStepId}
      completedSteps={completedSteps}
    >
      {step.id === "historico" ? (
        <PgrHistoricoPanel
          title={mockPgrDetail.historico.title}
          subtitle={mockPgrDetail.historico.subtitle}
          changes={mockPgrDetail.historico.changes}
        />
      ) : step.id === "dados" ? (
        <>
          <section className="px-2">
            <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
              Dados cadastrais
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Preencha os dados da empresa, estabelecimento e contratante
            </p>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <h2 className="text-[16px] font-medium text-foreground">
              Identificação da Empresa:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Razão Social:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Grupo:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNPJ:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Empresa:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNAE:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Endereço
                </label>
                <input
                  defaultValue="Avenida Armando Lombardi, 55"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CEP:
                </label>
                <input
                  defaultValue="20230-130"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Cidade:
                </label>
                <input
                  defaultValue="São José do Vale do Rio Preto"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Estado:
                </label>
                <input
                  defaultValue="Rio de Janeiro"
                  className={inputBaseClass}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Grau de Risco:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Descrição de Atividade Principal:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <h2 className="text-[16px] font-medium text-foreground">
              Identificação da Estabelecimento:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1.2fr_1fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Nome do Estabelecimento:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNPJ:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Estabelecimento:
                </label>
                <div className="relative mt-2">
                  <select className={selectBaseClass}>
                    <option>Selecione:</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Razão Social:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNAE:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Grau de Risco:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Descrição de Atividade Principal:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
              >
                <PlusCircle className="h-4 w-4" />
                Adicionar Campo
              </button>
            </div>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <h2 className="text-[16px] font-medium text-foreground">
              Identificação da Contratante:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1.6fr_1fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Nome Fantasia:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Razão social:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CNAE:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Endereço
                </label>
                <input
                  defaultValue="Avenida Armando Lombardi, 55"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CEP:
                </label>
                <input
                  defaultValue="20230-130"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Cidade:
                </label>
                <input
                  defaultValue="São José do Vale do Rio Preto"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Estado:
                </label>
                <input
                  defaultValue="Rio de Janeiro"
                  className={inputBaseClass}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Grau de Risco:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Descrição de Atividade Principal:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>
          </section>

          <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
            <h2 className="text-[16px] font-medium text-foreground">
              Responsável pelo PGR na Organização:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.6fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Nome:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Função:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_0.9fr]">
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Telefone:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  Email:
                </label>
                <input className={inputBaseClass} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  CPF:
                </label>
                <input className={inputBaseClass} />
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
          <h1 className="text-[22px] font-semibold text-foreground sm:text-[24px]">
            {step.title}
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{step.subtitle}</p>
          <div className="mt-6 rounded-[10px] bg-muted px-4 py-4 text-[14px] text-muted-foreground">
            Conteúdo da etapa <strong>{step.title}</strong> será exibido aqui.
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        {prevStep ? (
          <button
            type="button"
            onClick={() => router.push(`/pgr/${params.id}/${prevStep.id}`)}
            className="btn-outline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="btn-disabled"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}

        {nextStep ? (
          <button
            type="button"
            onClick={handleAdvance}
            className="btn-primary px-6"
          >
            Avançar
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="btn-disabled border-0 px-6"
          >
            Avançar
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </PgrShell>
  );
}
