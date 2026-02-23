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
            <h1 className="text-[22px] font-medium text-[#1f3f52] sm:text-[24px]">
              Dados cadastrais
            </h1>
            <p className="mt-1 text-[14px] text-[#8c8c8c]">
              Preencha os dados da empresa, estabelecimento e contratante
            </p>
          </section>

          <section className="rounded-[14px] bg-white px-6 py-6">
            <h2 className="text-[16px] font-medium text-[#1f3f52]">
              Identificação da Empresa:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Razão Social:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Grupo:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  CNPJ:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Empresa:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  CNAE:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Endereço
                </label>
                <input
                  defaultValue="Avenida Armando Lombardi, 55"
                  className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  CEP:
                </label>
                <input
                  defaultValue="20230-130"
                  className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Cidade:
                </label>
                <input
                  defaultValue="São José do Vale do Rio Preto"
                  className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Estado:
                </label>
                <input
                  defaultValue="Rio de Janeiro"
                  className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Grau de Risco:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Descrição de Atividade Principal:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
            </div>
          </section>

          <section className="rounded-[14px] bg-white px-6 py-6">
            <h2 className="text-[16px] font-medium text-[#1f3f52]">
              Identificação da Estabelecimento:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1.2fr_1fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Nome do Estabelecimento:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  CNPJ:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Estabelecimento:
                </label>
                <div className="relative mt-2">
                  <select className="h-[40px] w-full appearance-none rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 pr-10 text-[13px] text-[#1f3f52]">
                    <option>Selecione:</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Razão Social:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  CNAE:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Grau de Risco:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Descrição de Atividade Principal:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#007891] px-4 py-2 text-[14px] font-medium text-[#007891] transition hover:bg-[#eef7f8]"
              >
                <PlusCircle className="h-4 w-4" />
                Adicionar Campo
              </button>
            </div>
          </section>

          <section className="rounded-[14px] bg-white px-6 py-6">
            <h2 className="text-[16px] font-medium text-[#1f3f52]">
              Identificação da Contratante:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1.6fr_1fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Nome Fantasia:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Razão social:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  CNAE:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Endereço
                </label>
                <input
                  defaultValue="Avenida Armando Lombardi, 55"
                  className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  CEP:
                </label>
                <input
                  defaultValue="20230-130"
                  className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Cidade:
                </label>
                <input
                  defaultValue="São José do Vale do Rio Preto"
                  className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Estado:
                </label>
                <input
                  defaultValue="Rio de Janeiro"
                  className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Grau de Risco:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Descrição de Atividade Principal:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
            </div>
          </section>

          <section className="rounded-[14px] bg-white px-6 py-6">
            <h2 className="text-[16px] font-medium text-[#1f3f52]">
              Responsável pelo PGR na Organização:
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.6fr_1.2fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Nome:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Função:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_0.9fr]">
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Telefone:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  Email:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#1f3f52]">
                  CPF:
                </label>
                <input className="mt-2 h-[40px] w-full rounded-[8px] border border-[#d6d6d6] bg-[#f6f6f6] px-3 text-[13px]" />
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[14px] bg-white px-6 py-6">
          <h1 className="text-[22px] font-semibold text-[#1f3f52] sm:text-[24px]">
            {step.title}
          </h1>
          <p className="mt-1 text-[14px] text-[#8c8c8c]">{step.subtitle}</p>
          <div className="mt-6 rounded-[10px] bg-[#f6f7f9] px-4 py-4 text-[14px] text-[#6b6b6b]">
            Conteúdo da etapa <strong>{step.title}</strong> será exibido aqui.
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        {prevStep ? (
          <button
            type="button"
            onClick={() => router.push(`/pgr/${params.id}/${prevStep.id}`)}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#007891] px-5 py-2 text-[14px] font-medium text-[#007891] transition hover:bg-[#eef7f8]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#c9d3d8] px-5 py-2 text-[14px] font-medium text-[#9aa6ad]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}

        {nextStep ? (
          <button
            type="button"
            onClick={handleAdvance}
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#007891] px-6 py-2 text-[14px] font-medium text-white transition hover:brightness-110"
          >
            Avançar
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#c9d3d8] px-6 py-2 text-[14px] font-medium text-white"
          >
            Avançar
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </PgrShell>
  );
}
