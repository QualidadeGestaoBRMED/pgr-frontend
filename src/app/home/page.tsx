"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { FunctionInclusionRequestsModal } from "@/components/function-inclusion-requests-modal";
import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { getFunctionInclusionDeadlineAlert } from "./function-inclusion-deadline";

type HomeCard = {
  id: string;
  title: string;
  code: string;
  syncStatus?: string | null;
  isFinalized?: boolean;
  finalizedAt?: string | null;
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
  companyName?: string | null;
  groupName?: string | null;
  cnpj?: string | null;
  showServicePortalBadge?: boolean;
};

type HomePagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type HomeData = {
  user: { name: string; initials: string };
  title: string;
  subtitle: string;
  cards: HomeCard[];
  canUseAdvancedSearch: boolean;
  pagination?: HomePagination;
};

// O backend ja pagina de verdade (page/pageSize/totalPages na resposta) --
// antes o frontend sempre pedia page_size=200 (o teto permitido) numa unica
// tacada, forcando o pior caso de carga (Exists() por card, join com
// FrontendPgrState, resolucao de responsavel) pra ate 200 registros de uma
// vez so. Isso e o principal suspeito por tras dos 500/timeout esporadicos
// na Home. Reduzir pra um tamanho de pagina razoavel e buscar o resto sob
// demanda (scroll infinito) mantem a carga inicial leve sem esconder cards
// de quem tem mais que isso.
const HOME_PAGE_SIZE = 30;

type FunctionInclusionAlert = {
  companyId: number;
  companyLabel: string;
  count: number;
  requestNumbers: string[];
  elaboration: {
    active: boolean;
    responsibleName: string | null;
  };
  relatedToCurrentUser: boolean;
  requests: Array<{
    notificationId: string;
    requestNumber: string;
    prazoSeguranca: string;
    dataSolicitacao: string;
  }>;
};

type FrontendNotification = {
  id?: string;
  title: string;
  description: string;
  source?: string;
  companyId?: number | null;
  requestNumber?: string | number | null;
  prazoSeguranca?: string | number | null;
  dataSolicitacao?: string | number | null;
  functionInclusionElaboration?: {
    active?: boolean;
    responsibleName?: string | null;
  };
  relatedToCurrentUser?: boolean;
};

type FunctionInclusionCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "found"; pgrId: string }
  | { status: "notFound" };

const emptyData: HomeData = {
  user: { name: "Usuário", initials: "US" },
  title: "Programa de Gerenciamento de Riscos - PGR",
  subtitle: "Gerencie todos os PGRs em um só lugar",
  cards: [],
  canUseAdvancedSearch: false,
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
      const pgrWebLocked = Boolean(card.isFinalized);
      return {
        ...card,
        status: pgrWebLocked
          ? {
              ...card.status,
              label: "Aguardando finalização",
              bg: "bg-[#cfe0f5]",
              text: "text-black",
              dot: "bg-[#3d78a3]",
            }
          : card.status,
        finalizedAt: pgrWebLocked ? null : card.finalizedAt,
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

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isFinalizedCard(card: HomeCard) {
  return Boolean(card.isFinalized);
}

function formatFinalizedAt(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PipefyCardLink({ card }: { card: HomeCard }) {
  const pipefyCardId = String(card.pipefyCardId || "").trim();
  if (!pipefyCardId) return null;

  return (
    <a
      href={`https://app.pipefy.com/open-cards/${encodeURIComponent(pipefyCardId)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label={`Abrir card ${pipefyCardId} no Pipefy`}
      title="Abrir este card no Pipefy"
      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:text-primary hover:underline hover:underline-offset-2"
    >
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
      Abrir no Pipefy
    </a>
  );
}

function ServicePortalBadge({ card }: { card: HomeCard }) {
  if (!card.showServicePortalBadge) return null;

  return (
    <span className="mt-2 inline-flex items-center rounded-full border border-[#193b4f]/30 bg-[#193b4f]/10 px-2.5 py-1 text-[11px] font-semibold text-[#193b4f] dark:border-[#45a9c1]/40 dark:bg-[#193b4f]/45 dark:text-[#7ebfcc]">
      Portal de Serviço
    </span>
  );
}

function HomePgrCard({
  card,
  onOpen,
}: {
  card: HomeCard;
  onOpen: () => void;
}) {
  const finalized = isFinalizedCard(card);
  const finalizedAt = formatFinalizedAt(card.finalizedAt);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="flex h-full flex-col rounded-[12px] bg-card px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0px_8px_18px_rgba(25,59,79,0.12)] dark:border dark:border-border/60 dark:hover:border-primary/35"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[20px] font-semibold text-foreground sm:text-[22px]">
            {card.title}
          </h3>
          <p className="mt-1 text-[14px] text-muted-foreground">
            ID: {card.code}
          </p>
          {card.companyName && card.companyName !== card.title ? (
            <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
              {card.companyName}
            </p>
          ) : null}
          <ServicePortalBadge card={card} />
        </div>
        {finalized && card.status.label === "Concluído" ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-success-foreground/20 bg-success px-3 py-1 text-[12px] font-semibold text-success-foreground">
            Finalizado
          </span>
        ) : card.syncStatus === "REJECTED" ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-[#d7263d]/20 bg-[#fff1f2] px-3 py-1 text-[12px] font-semibold text-[#b42318]">
            Rejeitado
          </span>
        ) : null}
      </div>
      <div className="my-4 h-px w-full bg-border" />

      <div className="space-y-3 text-[14px] text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>Status:</span>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] ${card.status.bg} ${card.status.text}`}
          >
            <span className={`h-2 w-2 rounded-full ${card.status.dot}`} />
            {card.status.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Criado em:</span>
          <span className="text-right font-medium text-foreground">
            {card.createdAt}
          </span>
        </div>
        {finalizedAt ? (
          <div className="flex items-center justify-between gap-3">
            <span>Finalizado em:</span>
            <span className="text-right font-medium text-foreground">
              {finalizedAt}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span>Responsável:</span>
          <span className="text-right font-medium text-foreground">
            {card.owner}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Prazo:</span>
          <span className="text-right font-medium text-foreground">
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
            style={{ width: `${Math.max(0, Math.min(100, card.progress))}%` }}
          />
        </div>
      </div>
      {card.pipefyCardId ? (
        <div className="mt-auto flex justify-end pt-4">
          <PipefyCardLink card={card} />
        </div>
      ) : null}
    </div>
  );
}

function HomePageFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1480px] px-4 pb-16 pt-8 sm:px-6 lg:px-1">
        <div className="mt-12 h-12 w-full max-w-2xl animate-pulse rounded-[10px] bg-muted" />
        <div className="mt-8 h-px w-full bg-border" />
        <p className="mt-8 text-sm text-muted-foreground">Carregando PGRs...</p>
      </div>
    </div>
  );
}

function PgrsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [homeData, setHomeData] = useState<HomeData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchCards, setSearchCards] = useState<HomeCard[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [functionInclusionAlerts, setFunctionInclusionAlerts] = useState<
    FunctionInclusionAlert[]
  >([]);
  const [companyFilter, setCompanyFilter] = useState<{
    id: number;
    label: string;
    pgrId: string;
  } | null>(null);
  const [functionInclusionChecks, setFunctionInclusionChecks] = useState<
    Record<number, FunctionInclusionCheck>
  >({});
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [resolvingCompanyId, setResolvingCompanyId] = useState<number | null>(
    null
  );
  const [functionInclusionToResolve, setFunctionInclusionToResolve] = useState<{
    companyId: number;
    companyLabel: string;
    requests: FunctionInclusionAlert["requests"];
  } | null>(null);
  const [selectedFunctionInclusionIds, setSelectedFunctionInclusionIds] = useState<
    string[]
  >([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreCards, setHasMoreCards] = useState(false);
  const pageRef = useRef(1);

  const loadHomeData = useCallback(async () => {
    try {
      const data = await apiGet<HomeData>(
        `/api/v1/frontend/home?page_size=${HOME_PAGE_SIZE}&page=1`
      );
      const normalized = normalizeHomeData(data);
      setHomeData(normalized);
      pageRef.current = 1;
      setHasMoreCards(
        (normalized.pagination?.totalPages ?? 1) > 1
      );
      setLoadError(null);
    } catch (error) {
      setHomeData(emptyData);
      setHasMoreCards(false);
      setLoadError(
        error instanceof Error
          ? `Falha ao carregar dados da API: ${error.message}`
          : "Falha ao carregar dados da API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Scroll infinito: so busca a proxima pagina sob demanda (ver sentinel
  // mais abaixo), em vez do antigo page_size=200 que sempre trazia tudo de
  // uma vez. So se aplica a listagem padrao (sem busca/filtro de empresa
  // ativos), que tem sua propria paginacao server-side.
  const loadMoreCards = useCallback(async () => {
    if (loadingMore || !hasMoreCards) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const data = await apiGet<HomeData>(
        `/api/v1/frontend/home?page_size=${HOME_PAGE_SIZE}&page=${nextPage}`
      );
      const normalized = normalizeHomeData(data);
      pageRef.current = nextPage;
      setHomeData((prev) => ({
        ...normalized,
        cards: [...prev.cards, ...normalized.cards],
      }));
      setHasMoreCards(nextPage < (normalized.pagination?.totalPages ?? nextPage));
    } catch {
      // Falha pontual ao buscar mais uma pagina: mantem o que ja carregou e
      // deixa o usuario tentar de novo rolando a lista.
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreCards, loadingMore]);

  const isDefaultListing = !companyFilter && !(homeData.canUseAdvancedSearch && searchQuery.trim());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDefaultListing || !hasMoreCards) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreCards();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isDefaultListing, hasMoreCards, loadMoreCards]);

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

  const loadFunctionInclusionAlerts = useCallback(async () => {
    try {
      const payload = await apiGet<{ notifications: FrontendNotification[] }>(
        "/api/v1/frontend/notifications/function-inclusion"
      );
      const byCompany = new Map<number, FunctionInclusionAlert>();
      for (const item of payload.notifications || []) {
        if (item.source !== "function_inclusion_process") continue;
        if (item.companyId == null) continue;
        const notificationId = String(item.id || "").trim();
        if (!notificationId) continue;
        const match = /Empresa:\s*([^·]+)/.exec(item.description || "");
        const companyLabel = match ? match[1].trim() : `Empresa #${item.companyId}`;
        const requestNumber = String(item.requestNumber ?? "").trim();
        const prazoSeguranca = String(item.prazoSeguranca ?? "").trim();
        const dataSolicitacao = String(item.dataSolicitacao ?? "").trim();
        const request = {
          notificationId,
          requestNumber,
          prazoSeguranca,
          dataSolicitacao,
        };
        const elaboration = {
          active: Boolean(item.functionInclusionElaboration?.active),
          responsibleName:
            typeof item.functionInclusionElaboration?.responsibleName === "string"
              ? item.functionInclusionElaboration.responsibleName
              : null,
        };
        const existing = byCompany.get(item.companyId);
        if (existing) {
          existing.count += 1;
          existing.requests.push(request);
          if (elaboration.active) {
            existing.elaboration = elaboration;
          }
          if (item.relatedToCurrentUser) {
            existing.relatedToCurrentUser = true;
          }
          if (
            requestNumber &&
            !existing.requestNumbers.includes(requestNumber)
          ) {
            existing.requestNumbers.push(requestNumber);
          }
        } else {
          byCompany.set(item.companyId, {
            companyId: item.companyId,
            companyLabel,
            count: 1,
            requestNumbers: requestNumber ? [requestNumber] : [],
            elaboration,
            relatedToCurrentUser: Boolean(item.relatedToCurrentUser),
            requests: [request],
          });
        }
      }
      setFunctionInclusionAlerts(Array.from(byCompany.values()));
    } catch {
      // mantém a lista anterior em caso de falha pontual do fetch
    }
  }, []);

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (active && document.visibilityState === "visible") {
        void loadFunctionInclusionAlerts();
      }
    };
    tick();
    const intervalId = window.setInterval(tick, 30000);
    // Sem o gate de visibilidade, uma aba minimizada/em background
    // continuava batendo no backend a cada 30s pra sempre -- o listener
    // de foco/visibilidade garante que a lista atualiza assim que o
    // usuario volta pra aba, em vez de esperar o proximo tick do timer.
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [loadFunctionInclusionAlerts]);

  useEffect(() => {
    // Redirect vindo do editor de PGR logo após finalizar uma inclusão de
    // função (ver handleFinalizePgr): em vez de abrir o modal de resolução
    // ali mesmo, redireciona pra cá com a empresa já sinalizada, e a Home
    // abre o modal sozinha assim que a lista de pendências carregar.
    const rawCompanyId = searchParams?.get("resolveFunctionInclusionCompanyId");
    if (!rawCompanyId) return;
    const companyId = Number(rawCompanyId);
    if (!Number.isFinite(companyId)) return;
    const alert = functionInclusionAlerts.find((item) => item.companyId === companyId);
    if (!alert) return;
    setSelectedFunctionInclusionIds([]);
    setFunctionInclusionToResolve({
      companyId: alert.companyId,
      companyLabel: alert.companyLabel,
      requests: alert.requests,
    });
    router.replace("/home");
  }, [searchParams, functionInclusionAlerts, router]);

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
      `/api/v1/frontend/home?page_size=200&companyId=${companyFilter.id}&pgrId=${encodeURIComponent(companyFilter.pgrId)}`
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

  useEffect(() => {
    const query = searchQuery.trim();
    if (!homeData.canUseAdvancedSearch || !query || companyFilter) {
      setSearchCards(null);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let active = true;
    setSearchCards(null);
    setSearchError(null);
    const timeoutId = window.setTimeout(() => {
      setSearchLoading(true);
      apiGet<HomeData>(
        `/api/v1/frontend/home?page_size=200&search=${encodeURIComponent(query)}`
      )
        .then((data) => {
          if (!active) return;
          setSearchCards(normalizeHomeData(data).cards);
        })
        .catch((error) => {
          if (!active) return;
          setSearchCards([]);
          setSearchError(
            error instanceof Error
              ? `Falha ao pesquisar PGRs: ${error.message}`
              : "Falha ao pesquisar PGRs."
          );
        })
        .finally(() => {
          if (active) setSearchLoading(false);
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [companyFilter, homeData.canUseAdvancedSearch, searchQuery]);

  const filteredCards = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    const base = companyFilter
      ? companyFilteredCards ?? []
      : query && homeData.canUseAdvancedSearch
        ? searchCards ?? []
        : homeData.cards;
    if (!query) return base;
    if (homeData.canUseAdvancedSearch && !companyFilter) return base;
    return base.filter((card) => {
      const searchableText = [
        card.title,
        card.code,
        card.status.label,
        card.owner,
        ...(homeData.canUseAdvancedSearch
          ? [card.companyName, card.groupName, card.cnpj]
          : []),
      ]
        .map(normalizeSearchText)
        .join(" ");
      return searchableText.includes(query);
    });
  }, [
    homeData.cards,
    homeData.canUseAdvancedSearch,
    searchQuery,
    companyFilter,
    companyFilteredCards,
    searchCards,
  ]);

  const showSeparatedResults = Boolean(
    homeData.canUseAdvancedSearch && searchQuery.trim() && !companyFilter
  );
  const currentCards = useMemo(
    () => filteredCards.filter((card) => !isFinalizedCard(card)),
    [filteredCards]
  );
  const finalizedCards = useMemo(
    () => filteredCards.filter(isFinalizedCard),
    [filteredCards]
  );

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
          [companyId]: result.found && result.pgrId
            ? {
                status: "found",
                pgrId: result.pgrId,
              }
            : { status: "notFound" },
        }));
        // Achar o card não depende da fase de retorno estar confirmada —
        // isso é só um indicador visual à parte. Filtra sempre que existir.
        if (result.found && result.pgrId) {
          setSearchQuery("");
          setCompanyFilter({ id: companyId, label: companyLabel, pgrId: result.pgrId });
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

  const resolveFunctionInclusion = useCallback(
    async (
      companyId: number,
      options: { resolveAll: boolean; notificationIds?: string[] }
    ) => {
      if (resolvingCompanyId !== null) return;
      if (!options.resolveAll && !options.notificationIds?.length) return;
      setResolvingCompanyId(companyId);
      try {
        const result = await apiPost<{
          resolvedCount: number;
          remainingCount: number;
          blocked?: Array<{ id: string; requestNumber: string | null }>;
        }>("/api/v1/frontend/notifications/function-inclusion/resolve", {
          companyId,
          resolveAll: options.resolveAll,
          notificationIds: options.resolveAll
            ? undefined
            : options.notificationIds,
        });
        if (result.remainingCount === 0) {
          setFunctionInclusionChecks((prev) => {
            const next = { ...prev };
            delete next[companyId];
            return next;
          });
          setCompanyFilter((current) =>
            current?.id === companyId ? null : current
          );
        }
        await loadFunctionInclusionAlerts();
        setFunctionInclusionToResolve(null);
        setSelectedFunctionInclusionIds([]);
        if (result.blocked && result.blocked.length > 0 && typeof window !== "undefined") {
          const labels = result.blocked.map(
            (item) => item.requestNumber || item.id
          );
          window.alert(
            `${result.blocked.length === 1 ? "A solicitação" : "As solicitações"} ${labels.join(", ")} ainda não ${
              result.blocked.length === 1 ? "foi finalizada" : "foram finalizadas"
            } no Portal de Serviços e não ${
              result.blocked.length === 1 ? "foi resolvida" : "foram resolvidas"
            } aqui. Finalize no Portal de Serviços primeiro.`
          );
        }
      } catch {
        if (typeof window !== "undefined") {
          window.alert("Não foi possível marcar como incluída agora. Tente novamente.");
        }
      } finally {
        setResolvingCompanyId(null);
      }
    },
    [loadFunctionInclusionAlerts, resolvingCompanyId]
  );

  useEffect(() => {
    if (!functionInclusionToResolve || resolvingCompanyId !== null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFunctionInclusionToResolve(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [functionInclusionToResolve, resolvingCompanyId]);

  const relatedFunctionInclusions = functionInclusionAlerts.filter(
    (alert) => alert.relatedToCurrentUser
  );
  const otherFunctionInclusions = functionInclusionAlerts.filter(
    (alert) => !alert.relatedToCurrentUser
  );
  const orderedFunctionInclusionAlerts = [
    ...relatedFunctionInclusions.map((alert, index) => ({
      alert,
      sectionTitle: index === 0 ? "Inclusões relacionadas a você" : null,
    })),
    ...otherFunctionInclusions.map((alert, index) => ({
      alert,
      sectionTitle:
        relatedFunctionInclusions.length > 0 && index === 0
          ? "Outras inclusões"
          : null,
    })),
  ];

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
          <div className="mt-8 rounded-[12px] border border-border bg-card shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-[#193b4f] dark:shadow-none">
            <button
              type="button"
              onClick={() => setAlertsExpanded((prev) => !prev)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
              aria-expanded={alertsExpanded}
            >
              <p className="text-[14px] font-semibold text-foreground dark:text-white">
                {functionInclusionAlerts.length === 1
                  ? "Alteração documental pendente em 1 empresa"
                  : `Alteração documental pendentes em ${functionInclusionAlerts.length} empresas`}
              </p>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-foreground dark:text-white">
                {alertsExpanded ? "Ver menos" : "Ver todas"}
                {alertsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </button>
            {alertsExpanded ? (
              <div className="space-y-2 border-t border-border px-5 py-4 dark:border-white/10">
                {orderedFunctionInclusionAlerts.map(({ alert, sectionTitle }) => {
                  const check = functionInclusionChecks[alert.companyId] || {
                    status: "idle",
                  };
                  const deadlineAlert = getFunctionInclusionDeadlineAlert(
                    alert.requests.map((request) => request.prazoSeguranca)
                  );
                  return (
                    <Fragment key={alert.companyId}>
                      {sectionTitle ? (
                        <p className="pt-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-white/70">
                          {sectionTitle}
                        </p>
                      ) : null}
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border/60 bg-background/40 px-4 py-3 dark:border-white/10 dark:bg-[#173446]"
                      >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-medium text-foreground dark:text-white">
                            {alert.companyLabel}
                            {alert.count > 1 ? ` · ${alert.count} funções` : ""}
                          </p>
                          {deadlineAlert ? (
                            <span
                              title={`${deadlineAlert.label} · Prazo segurança: ${deadlineAlert.deadline}`}
                              aria-label={`${deadlineAlert.label}. Prazo segurança: ${deadlineAlert.deadline}`}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
                                deadlineAlert.severity === "danger"
                                  ? "border-danger-foreground/30 bg-danger text-danger-foreground"
                                  : "border-warning-foreground/25 bg-warning text-warning-foreground"
                              }`}
                            >
                              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            </span>
                          ) : null}
                        </div>
                        {alert.requestNumbers.length > 0 ? (
                          <p className="mt-1 text-[12px] font-medium text-muted-foreground dark:text-white/70">
                            {alert.requestNumbers.length === 1
                              ? `Solicitação nº ${alert.requestNumbers[0]}`
                              : `Solicitações nº ${alert.requestNumbers.join(", ")}`}
                          </p>
                        ) : null}
                        {alert.elaboration.active ? (
                          <p className="mt-1 text-[12px] font-medium text-warning-foreground dark:text-amber-200">
                            {alert.elaboration.responsibleName?.trim() ||
                              "O usuário responsável"}{" "}
                            está elaborando este documento.
                          </p>
                        ) : null}
                        {check.status === "found" ? (
                          <p className="mt-1 text-[12px] text-success-foreground dark:text-white" >
                            PGR encontrado.
                          </p>
                        ) : null}
                        {check.status === "notFound" ? (
                          <p className="mt-1 text-[12px] text-muted-foreground dark:text-white/70">
                            Nenhum card dessa empresa foi encontrado.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                      {check.status === "found" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setCompanyFilter({
                              id: alert.companyId,
                              label: alert.companyLabel,
                              pgrId: check.pgrId,
                            });
                          }}
                          className="inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-transparent px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
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
                          className="inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-transparent px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                        >
                          {check.status === "checking"
                            ? "Verificando..."
                            : check.status === "notFound"
                              ? "Verificar novamente"
                              : "Verificar"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={resolvingCompanyId === alert.companyId}
                        onClick={() => {
                          setSelectedFunctionInclusionIds([]);
                          setFunctionInclusionToResolve({
                            companyId: alert.companyId,
                            companyLabel: alert.companyLabel,
                            requests: alert.requests,
                          });
                        }}
                        title="Marcar que a função já foi incluída nesse PGR"
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-transparent px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                      >
                        {resolvingCompanyId === alert.companyId
                          ? "Finalizando..."
                          : "Verificar solicitações"}
                      </button>
                      </div>
                      </div>
                    </Fragment>
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
                placeholder={
                  homeData.canUseAdvancedSearch
                    ? "Buscar por empresa, CNPJ, ID, status ou responsável..."
                    : "Buscar por código, título, status ou responsável..."
                }
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

        {loading || searchLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">
            {searchLoading ? "Pesquisando PGRs..." : "Carregando dados..."}
          </p>
        ) : null}
        {!loading && loadError ? (
          <p className="mt-8 rounded-[10px] border border-danger-foreground/30 bg-danger px-4 py-3 text-sm text-danger-foreground">
            {loadError}
          </p>
        ) : null}
        {!searchLoading && searchError ? (
          <p className="mt-8 rounded-[10px] border border-danger-foreground/30 bg-danger px-4 py-3 text-sm text-danger-foreground">
            {searchError}
          </p>
        ) : null}
        {!loading && !searchLoading && !loadError && !searchError && filteredCards.length === 0 ? (
          <p className="mt-8 rounded-[10px] border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
            {showSeparatedResults
              ? "Nenhum PGR encontrado para esta pesquisa."
              : "Nenhum PGR ativo encontrado no momento."}
          </p>
        ) : null}

        {showSeparatedResults && !searchLoading && !searchError && filteredCards.length > 0 ? (
          <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[24px] font-semibold text-foreground">
                PGRs em andamento
              </h2>
              <p className="mt-1 text-[14px] text-muted-foreground">
                PGRs atuais nas fases de elaboração e revisão
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
              {currentCards.length} {currentCards.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>
        ) : null}
        {showSeparatedResults && filteredCards.length > 0 && currentCards.length === 0 ? (
          <p className="mt-4 rounded-[10px] border border-dashed border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
            Nenhum PGR em andamento encontrado.
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(showSeparatedResults ? currentCards : filteredCards).map((card) => {
            const finalized = isFinalizedCard(card);
            return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                router.push(
                  `/pgr/${card.id}/inicio${companyFilter ? "?functionInclusion=1" : ""}`
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(
                    `/pgr/${card.id}/inicio${companyFilter ? "?functionInclusion=1" : ""}`
                  );
                }
              }}
              className="flex h-full flex-col rounded-[12px] bg-card px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0px_8px_18px_rgba(25,59,79,0.12)] dark:border dark:border-border/60 dark:hover:border-primary/35"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[20px] font-semibold text-foreground sm:text-[22px]">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    ID: {card.code}
                  </p>
                  {card.companyName && card.companyName !== card.title ? (
                    <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                      {card.companyName}
                    </p>
                  ) : null}
                  <ServicePortalBadge card={card} />
                </div>
                {finalized && card.status.label === "Concluído" ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-success-foreground/20 bg-success px-3 py-1 text-[12px] font-semibold text-success-foreground">
                    Finalizado
                  </span>
                ) : card.syncStatus === "REJECTED" ? (
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
                {formatFinalizedAt(card.finalizedAt) ? (
                  <div className="flex items-center justify-between">
                    <span>Finalizado em:</span>
                    <span className="font-medium text-foreground">
                      {formatFinalizedAt(card.finalizedAt)}
                    </span>
                  </div>
                ) : null}
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
              {card.pipefyCardId ? (
                <div className="mt-auto flex justify-end pt-4">
                  <PipefyCardLink card={card} />
                </div>
              ) : null}
            </div>
            );
          })}
        </div>

        {isDefaultListing && hasMoreCards ? (
          <div ref={sentinelRef} className="mt-6 flex justify-center py-4">
            {loadingMore ? (
              <p className="text-[13px] text-muted-foreground">
                Carregando mais PGRs...
              </p>
            ) : null}
          </div>
        ) : null}

        {showSeparatedResults && !searchLoading && !searchError && filteredCards.length > 0 ? (
          <section className="mt-12 border-t border-border pt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-semibold text-foreground">
                  PGRs finalizados
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  Documentos concluídos e disponíveis para consulta
                </p>
              </div>
              <span className="rounded-full bg-success/60 px-3 py-1 text-[12px] font-semibold text-success-foreground">
                {finalizedCards.length}{" "}
                {finalizedCards.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>

            {finalizedCards.length > 0 ? (
              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {finalizedCards.map((card) => (
                  <HomePgrCard
                    key={card.id}
                    card={card}
                    onOpen={() =>
                      router.push(
                        `/pgr/${card.id}/inicio${companyFilter ? "?functionInclusion=1" : ""}`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-[10px] border border-dashed border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
                Nenhum PGR finalizado encontrado.
              </p>
            )}
          </section>
        ) : null}
      </div>

      <FunctionInclusionRequestsModal
        open={functionInclusionToResolve !== null}
        mode="resolve"
        companyLabel={functionInclusionToResolve?.companyLabel ?? ""}
        requests={functionInclusionToResolve?.requests ?? []}
        onClose={() => setFunctionInclusionToResolve(null)}
        selectedIds={selectedFunctionInclusionIds}
        onToggleSelected={(notificationId) =>
          setSelectedFunctionInclusionIds((current) =>
            current.includes(notificationId)
              ? current.filter((item) => item !== notificationId)
              : [...current, notificationId]
          )
        }
        onResolveSelected={() => {
          if (!functionInclusionToResolve) return;
          void resolveFunctionInclusion(functionInclusionToResolve.companyId, {
            resolveAll: false,
            notificationIds: selectedFunctionInclusionIds,
          });
        }}
        onResolveAll={() => {
          if (!functionInclusionToResolve) return;
          void resolveFunctionInclusion(functionInclusionToResolve.companyId, {
            resolveAll: true,
          });
        }}
        resolving={resolvingCompanyId !== null}
      />
    </div>
  );
}

export default function PgrsPage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <PgrsPageContent />
    </Suspense>
  );
}
