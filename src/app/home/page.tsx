"use client";

import { Search } from "lucide-react";
import { Work_Sans } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { pgrSteps } from "@/app/pgr/steps";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

type HomeData = {
  user: { name: string; initials: string };
  title: string;
  subtitle: string;
  cards: Array<{
    id: string;
    title: string;
    code: string;
    status: { label: string; bg: string; text: string; dot: string };
    createdAt: string;
    owner: string;
    progress: number;
    pipefyCardId?: string | null;
    dueDate?: string | null;
  }>;
};

const emptyData: HomeData = {
  user: { name: "Usuário", initials: "US" },
  title: "Programa de Gerenciamento de Riscos - PGR",
  subtitle: "Gerencie todos os PGRs em um só lugar",
  cards: [],
};

const TOTAL_PGR_STEPS = pgrSteps.length;

const STEP_INDEX = new Map(pgrSteps.map((step, index) => [step.id, index]));

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasMeaningfulSelections = (values: unknown) =>
  Array.isArray(values) && values.some((item) => hasText(item));

const deriveProgressPercentFromState = (
  state: Record<string, any>,
  fallbackProgress: number
) => {
  const rawCompleted = Number(state.completedSteps);
  if (!Number.isFinite(rawCompleted)) return fallbackProgress;
  const completedSteps = Math.max(0, Math.min(rawCompleted, TOTAL_PGR_STEPS));

  const inicioDraft = (state.inicioDraft || {}) as Record<string, unknown>;
  const dados = (state.dadosCadastrais || {}) as Record<string, unknown>;
  const gheGroups = Array.isArray(state.gheGroups) ? state.gheGroups : [];
  const functions = Array.isArray(state.functions) ? state.functions : [];
  const riskGheGroups = Array.isArray(state.riskGheGroups)
    ? state.riskGheGroups
    : [];

  const isInicioComplete =
    hasText(inicioDraft.documentTitle) &&
    hasText(inicioDraft.companyName) &&
    hasText(inicioDraft.cnpj) &&
    hasText(inicioDraft.responsible) &&
    hasText(inicioDraft.email);

  const isDadosComplete =
    hasText(dados.empresaRazaoSocial) &&
    hasText(dados.empresaCnpj) &&
    hasText(dados.empresaCnae) &&
    hasText(dados.empresaEndereco) &&
    hasText(dados.empresaCidade) &&
    hasText(dados.empresaEstado);

  const assignedFunctionIds = new Set<string>();
  for (const ghe of gheGroups) {
    const items = Array.isArray(ghe?.items) ? ghe.items : [];
    for (const item of items) {
      if (typeof item?.functionId === "string" && item.functionId) {
        assignedFunctionIds.add(item.functionId);
      }
    }
  }
  const remainingCount = Math.max(functions.length - assignedFunctionIds.size, 0);

  const isGheInfoComplete = (ghe: any) =>
    hasText(ghe?.info?.processo) &&
    hasText(ghe?.info?.observacoes) &&
    hasText(ghe?.info?.ambiente);
  const describedGheCount = gheGroups.filter((ghe) => isGheInfoComplete(ghe)).length;
  const allGhesDescribed = gheGroups.length > 0 && describedGheCount === gheGroups.length;
  const isDescricaoComplete =
    allGhesDescribed &&
    remainingCount === 0 &&
    gheGroups.length > 0 &&
    gheGroups.every((ghe) => Array.isArray(ghe?.items) && ghe.items.length > 0);

  const isRiskFullyFilled = (risk: any) =>
    hasText(risk?.tipoAgente) &&
    hasText(risk?.descricaoAgente) &&
    hasText(risk?.perigo) &&
    hasText(risk?.meioPropagacao) &&
    hasText(risk?.fontes) &&
    hasText(risk?.tipoAvaliacao) &&
    hasText(risk?.intensidade) &&
    hasText(risk?.severidade) &&
    hasText(risk?.probabilidade) &&
    hasText(risk?.classificacao) &&
    hasText(risk?.medidasControle) &&
    hasMeaningfulSelections(risk?.epc) &&
    hasMeaningfulSelections(risk?.epi);

  let isCaracterizacaoComplete = false;
  if (riskGheGroups.length > 0) {
    isCaracterizacaoComplete = riskGheGroups.every((ghe) => {
      const risks = Array.isArray(ghe?.risks) ? ghe.risks : [];
      return risks.length > 0 && risks.every((risk) => isRiskFullyFilled(risk));
    });
  }

  const planRows = riskGheGroups.flatMap((ghe) =>
    Array.isArray(ghe?.risks) ? ghe.risks : []
  );
  const isPlanoComplete =
    planRows.length > 0 &&
    planRows.every((risk: any) => hasText(risk?.medidasControle));

  const stepCompleteness: Partial<Record<string, boolean>> = {
    inicio: isInicioComplete,
    dados: isDadosComplete,
    descricao: isDescricaoComplete,
    caracterizacao: isCaracterizacaoComplete,
    plano: isPlanoComplete,
  };

  const isAlertStep = (stepId: string) => {
    const stepIndex = STEP_INDEX.get(stepId);
    if (stepIndex === undefined) return false;
    const isComplete = stepCompleteness[stepId];
    if (typeof isComplete !== "boolean") return false;
    return completedSteps > stepIndex && !isComplete;
  };

  const doneStepsCount = pgrSteps.reduce((count, step, index) => {
    if (index >= completedSteps) return count;
    if (isAlertStep(step.id)) return count;
    return count + 1;
  }, 0);

  return Math.round((doneStepsCount / TOTAL_PGR_STEPS) * 100);
};

export default function PgrsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [homeData, setHomeData] = useState<HomeData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiGet<HomeData>("/api/frontend/home");
        if (!active) return;
        setHomeData(data);
        setLoadError(null);

        if (!data.cards.length) return;

        const stateProgress = await Promise.allSettled(
          data.cards.map((card) =>
            apiGet<Record<string, any>>(`/api/frontend/pgr/${card.id}/state`)
          )
        );
        if (!active) return;

        const mergedCards = data.cards.map((card, index) => {
          const result = stateProgress[index];
          if (result?.status !== "fulfilled") return card;
          const derivedProgress = deriveProgressPercentFromState(
            result.value,
            card.progress
          );
          return { ...card, progress: derivedProgress };
        });

        setHomeData((prev) => ({ ...prev, cards: mergedCards }));
      } catch (error) {
        if (!active) return;
        setHomeData(emptyData);
        setLoadError(
          error instanceof Error
            ? `Falha ao carregar dados da API: ${error.message}`
            : "Falha ao carregar dados da API."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return homeData.cards;
    return homeData.cards.filter((card) => {
      return (
        card.title.toLowerCase().includes(query) ||
        card.code.toLowerCase().includes(query) ||
        card.status.label.toLowerCase().includes(query) ||
        card.owner.toLowerCase().includes(query)
      );
    });
  }, [homeData.cards, searchQuery]);

  return (
    <div className={`min-h-screen bg-background ${workSans.className}`}>
      <div className="mx-auto w-full max-w-[1480px] px-0 pb-16 pt-8 sm:px-0 lg:px-1">
        <AppHeader user={homeData.user} />

        <div className="mt-12">
          <h1 className="text-[36px] font-semibold text-foreground sm:text-[44px]">
            {homeData.title}
          </h1>
          <p className="mt-3 text-[18px] text-muted-foreground sm:text-[25px]">
            {homeData.subtitle}
          </p>
        </div>

        <div className="mt-8 h-px w-full bg-border" />

        <div className="mt-10 rounded-[12px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex w-full max-w-[520px] items-center gap-3 rounded-[10px] bg-muted px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por código, título, status ou responsável..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Carregando dados...</p>
        ) : null}
        {!loading && loadError ? (
          <p className="mt-8 rounded-[10px] border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
            {loadError}
          </p>
        ) : null}
        {!loading && !loadError && filteredCards.length === 0 ? (
          <p className="mt-8 rounded-[10px] border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
            Nenhum PGR em elaboração encontrado no momento.
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/pgr/${card.id}/inicio`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/pgr/${card.id}/inicio`);
                }
              }}
              className="rounded-[12px] bg-card px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0px_8px_18px_rgba(25,59,79,0.12)] dark:border dark:border-border/60 dark:hover:border-primary/35"
            >
              <h3 className="text-[20px] font-semibold text-foreground sm:text-[22px]">
                {card.title}
              </h3>
              <p className="mt-1 text-[14px] text-muted-foreground">ID: {card.code}</p>
              <div className="my-4 h-px w-full bg-border" />

              <div className="space-y-3 text-[14px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] ${card.status.bg} ${card.status.text}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${card.status.dot}`} />
                    {card.status.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Criado em:</span>
                  <span className="font-medium text-foreground">{card.createdAt}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Responsável:</span>
                  <span className="font-medium text-foreground">{card.owner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Prazo:</span>
                  <span className="font-medium text-foreground">
                    {card.dueDate || "Não informado"}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="text-[14px] font-semibold text-foreground">
                  Progresso: {card.progress}%
                </span>
                <div className="h-3 w-[140px] rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full bg-[#2d8b1f] dark:bg-[#6fd35a]"
                    style={{ width: `${card.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
