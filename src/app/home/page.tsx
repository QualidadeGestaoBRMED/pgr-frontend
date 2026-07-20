"use client";

import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

type HomeData = {
  user: { name: string; initials: string };
  title: string;
  subtitle: string;
  cards: Array<{
    id: string;
    title: string;
    code: string;
    syncStatus?: string | null;
    status: { label: string; bg: string; text: string; dot: string };
    createdAt: string;
    owner: string;
    responsible?: string | null;
    responsavel?: string | null;
    ownerName?: string | null;
    responsibleName?: string | null;
    responsible_name?: string | null;
    "Responsável pela elaboração do documento (ST)"?: string | null;
    progress: number;
    pipefyCardId?: string | null;
    dueDate?: string | null;
    companyId?: number | null;
  }>;
};

type FunctionInclusionAlert = {
  companyId: number;
  companyLabel: string;
  count: number;
};

type FrontendNotification = {
  id?: string;
  title: string;
  description: string;
  source?: string;
  companyId?: number | null;
};

type FunctionInclusionCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "found"; unlocked: boolean; reason: string }
  | { status: "notFound" };

const emptyData: HomeData = {
  user: { name: "Usuário", initials: "US" },
  title: "Programa de Gerenciamento de Riscos - PGR",
  subtitle: "Gerencie todos os PGRs em um só lugar",
  cards: [],
};

function pickFirstText(values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeHomeData(data: HomeData): HomeData {
  return {
    ...data,
    cards: (data.cards || []).map((card) => {
      const rawCard = card as Record<string, unknown>;
      return {
        ...card,
        owner:
          pickFirstText([
            card.owner,
            card.ownerName,
            card.responsible,
            card.responsibleName,
            card.responsavel,
            card.responsible_name,
            card["Responsável pela elaboração do documento (ST)"],
            rawCard["Responsavel pela elaboracao do documento (ST)"],
          ]) || "Não informado",
      };
    }),
  };
}

export default function PgrsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [homeData, setHomeData] = useState<HomeData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [functionInclusionAlerts, setFunctionInclusionAlerts] = useState<
    FunctionInclusionAlert[]
  >([]);
  const [companyFilter, setCompanyFilter] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const [functionInclusionChecks, setFunctionInclusionChecks] = useState<
    Record<number, FunctionInclusionCheck>
  >({});
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  const loadHomeData = useCallback(async () => {
    try {
      const data = await apiGet<HomeData>(
        "/api/v1/frontend/home?page_size=200"
      );
      setHomeData(normalizeHomeData(data));
      setLoadError(null);
    } catch (error) {
      setHomeData(emptyData);
      setLoadError(
        error instanceof Error
          ? `Falha ao carregar dados da API: ${error.message}`
          : "Falha ao carregar dados da API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const safeLoad = async () => {
      if (!active) return;
      await loadHomeData();
    };

    safeLoad();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void safeLoad();
      }
    };
    const onWindowFocus = () => {
      void safeLoad();
    };
    const onPageShow = () => {
      void safeLoad();
    };

    // fallback para refletir mudanças em segundo plano sem navegação manual
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void safeLoad();
      }
    }, 15000);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [loadHomeData]);

  useEffect(() => {
    let active = true;

    const loadFunctionInclusionAlerts = async () => {
      try {
        const payload = await apiGet<{ notifications: FrontendNotification[] }>(
          "/api/v1/frontend/notifications/function-inclusion"
        );
        if (!active) return;
        const byCompany = new Map<number, FunctionInclusionAlert>();
        for (const item of payload.notifications || []) {
          if (item.source !== "function_inclusion_process") continue;
          if (item.companyId == null) continue;
          const match = /Empresa:\s*([^·]+)/.exec(item.description || "");
          const companyLabel = match ? match[1].trim() : `Empresa #${item.companyId}`;
          const existing = byCompany.get(item.companyId);
          if (existing) {
            existing.count += 1;
          } else {
            byCompany.set(item.companyId, {
              companyId: item.companyId,
              companyLabel,
              count: 1,
            });
          }
        }
        setFunctionInclusionAlerts(Array.from(byCompany.values()));
      } catch {
        if (!active) return;
      }
    };

    loadFunctionInclusionAlerts();
    const intervalId = window.setInterval(loadFunctionInclusionAlerts, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  // A listagem padrão da Home só traz cards em sync_status ativo
  // (IN_PROGRESS/REJECTED). Quando o usuário filtra por empresa a partir do
  // banner de inclusão de função, buscamos à parte, sem essa restrição —
  // senão um card já finalizado ou numa fase ainda não sincronizada como
  // "ativa" simplesmente não apareceria, mesmo estando desbloqueado.
  const [companyFilteredCards, setCompanyFilteredCards] = useState<
    HomeData["cards"] | null
  >(null);

  useEffect(() => {
    if (!companyFilter) {
      setCompanyFilteredCards(null);
      return;
    }
    let active = true;
    apiGet<HomeData>(
      `/api/v1/frontend/home?page_size=200&companyId=${companyFilter.id}`
    )
      .then((data) => {
        if (!active) return;
        setCompanyFilteredCards(normalizeHomeData(data).cards);
      })
      .catch(() => {
        if (active) setCompanyFilteredCards([]);
      });
    return () => {
      active = false;
    };
  }, [companyFilter]);

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const base = companyFilter ? companyFilteredCards ?? [] : homeData.cards;
    if (!query) return base;
    return base.filter((card) => {
      return (
        card.title.toLowerCase().includes(query) ||
        card.code.toLowerCase().includes(query) ||
        card.status.label.toLowerCase().includes(query) ||
        card.owner.toLowerCase().includes(query)
      );
    });
  }, [homeData.cards, searchQuery, companyFilter, companyFilteredCards]);

  const checkFunctionInclusion = useCallback(
    async (companyId: number, companyLabel: string) => {
      setFunctionInclusionChecks((prev) => ({
        ...prev,
        [companyId]: { status: "checking" },
      }));
      try {
        const result = await apiGet<{
          found: boolean;
          unlocked: boolean;
          pgrId: string | null;
          reason: string;
        }>(
          `/api/v1/frontend/notifications/function-inclusion/check?companyId=${companyId}`
        );
        setFunctionInclusionChecks((prev) => ({
          ...prev,
          [companyId]: result.found
            ? { status: "found", unlocked: result.unlocked, reason: result.reason }
            : { status: "notFound" },
        }));
        // Achar o card não depende da fase de retorno estar confirmada —
        // isso é só um indicador visual à parte. Filtra sempre que existir.
        if (result.found) {
          setSearchQuery("");
          setCompanyFilter({ id: companyId, label: companyLabel });
        }
      } catch {
        setFunctionInclusionChecks((prev) => ({
          ...prev,
          [companyId]: { status: "notFound" },
        }));
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-background">
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

        {functionInclusionAlerts.length > 0 ? (
          <div className="mt-8 rounded-[12px] border border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10">
            <button
              type="button"
              onClick={() => setAlertsExpanded((prev) => !prev)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
              aria-expanded={alertsExpanded}
            >
              <p className="text-[14px] font-semibold text-amber-900 dark:text-amber-200">
                {functionInclusionAlerts.length === 1
                  ? "Inclusão de função pendente em 1 empresa"
                  : `Inclusões de função pendentes em ${functionInclusionAlerts.length} empresas`}
              </p>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-amber-800 dark:text-amber-200">
                {alertsExpanded ? "Ver menos" : "Ver todas"}
                {alertsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </button>
            {alertsExpanded ? (
              <div className="space-y-2 border-t border-amber-200 px-5 py-4 dark:border-amber-500/30">
                {functionInclusionAlerts.map((alert) => {
                  const check = functionInclusionChecks[alert.companyId] || {
                    status: "idle",
                  };
                  return (
                    <div
                      key={alert.companyId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-white/60 px-4 py-3 dark:bg-black/10"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-amber-900 dark:text-amber-200">
                          {alert.companyLabel}
                          {alert.count > 1 ? ` · ${alert.count} funções` : ""}
                        </p>
                        {check.status === "found" && check.unlocked ? (
                          <p className="mt-1 text-[12px] text-amber-700 dark:text-amber-300">
                            Card liberado: {check.reason}
                          </p>
                        ) : null}
                        {check.status === "found" && !check.unlocked ? (
                          <p className="mt-1 text-[12px] text-amber-700/80 dark:text-amber-300/80">
                            Card encontrado, mas ainda não confirmado na fase
                            de retorno.
                          </p>
                        ) : null}
                        {check.status === "notFound" ? (
                          <p className="mt-1 text-[12px] text-amber-700/80 dark:text-amber-300/80">
                            Nenhum card dessa empresa foi encontrado.
                          </p>
                        ) : null}
                      </div>
                      {check.status === "found" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setCompanyFilter({
                              id: alert.companyId,
                              label: alert.companyLabel,
                            });
                          }}
                          className="inline-flex min-h-9 items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-amber-700"
                        >
                          Ver PGR desta empresa
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={check.status === "checking"}
                          onClick={() =>
                            checkFunctionInclusion(alert.companyId, alert.companyLabel)
                          }
                          className="inline-flex min-h-9 items-center justify-center rounded-md border border-amber-400 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10"
                        >
                          {check.status === "checking"
                            ? "Verificando..."
                            : check.status === "notFound"
                              ? "Verificar novamente"
                              : "Verificar"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

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
            {companyFilter ? (
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[13px] font-medium text-primary">
                <span>Filtrando por: {companyFilter.label}</span>
                <button
                  type="button"
                  onClick={() => setCompanyFilter(null)}
                  className="text-primary/70 transition hover:text-primary"
                  aria-label="Limpar filtro de empresa"
                >
                  ×
                </button>
              </div>
            ) : null}
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
            Nenhum PGR ativo encontrado no momento.
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[20px] font-semibold text-foreground sm:text-[22px]">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-[14px] text-muted-foreground">ID: {card.code}</p>
                </div>
                {card.syncStatus === "REJECTED" ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-[#d7263d]/20 bg-[#fff1f2] px-3 py-1 text-[12px] font-semibold text-[#b42318]">
                    Rejeitado
                  </span>
                ) : null}
              </div>
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
