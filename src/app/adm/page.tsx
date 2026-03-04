"use client";

import { Pencil, PlusCircle, Search, SlidersHorizontal } from "lucide-react";
import { Work_Sans } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

type AdmData = {
  user: { name: string; initials: string };
  title: string;
  subtitle: string;
  summaryCards: Array<{
    title: string;
    value: string;
    note: string;
    bg: string;
    titleClass: string;
    valueClass: string;
    noteClass: string;
  }>;
  tableRows: Array<{
    id: string;
    ghe: string;
    responsavel: string;
    prioridade: { label: string; bg: string; dot: string };
    status: { label: string; bg: string; dot: string };
    vencimento: string;
    vencimentoClass: string;
    atraso: string | null;
    isUrgent: boolean;
    isLate: boolean;
  }>;
};

const emptyHomeData: AdmData = {
  user: {
    name: "Usuário",
    initials: "US",
  },
  title: "GHE's em elaboração",
  subtitle: "Atualizado automaticamente via API",
  summaryCards: [],
  tableRows: [],
};

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [homeData, setHomeData] = useState<AdmData>(emptyHomeData);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [onlyLate, setOnlyLate] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);

  const handleNewGhe = async () => {
    try {
      const result = await apiPost<{ pgrId: string }>("/api/frontend/pgrs");
      router.push(`/pgr/${result.pgrId}/inicio`);
    } catch {
      // Sem bloqueio visual em falha de criação.
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/pgr/${id}`);
  };

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return homeData.tableRows.filter((row) => {
      if (onlyUrgent && !row.isUrgent) return false;
      if (onlyLate && !row.isLate) return false;
      if (!query) return true;
      return (
        row.ghe.toLowerCase().includes(query) ||
        row.responsavel.toLowerCase().includes(query) ||
        row.prioridade.label.toLowerCase().includes(query) ||
        row.status.label.toLowerCase().includes(query) ||
        row.vencimento.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, onlyUrgent, onlyLate, homeData.tableRows]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiGet<AdmData>("/api/frontend/adm");
        if (!active) return;
        setHomeData(data);
      } catch {
        if (!active) return;
        setHomeData(emptyHomeData);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        filtersOpen &&
        filtersRef.current &&
        !filtersRef.current.contains(target)
      ) {
        setFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filtersOpen]);

  return (
    <div className={`min-h-screen bg-background ${workSans.className}`}>
      <div className="mx-auto w-full max-w-[1480px] px-0 pb-16 pt-8 sm:px-0 lg:px-1">
        <AppHeader user={homeData.user} />

        <div className="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[32px] font-semibold text-foreground sm:text-[40px]">
              {homeData.title}
            </h1>
            <p className="mt-3 text-[18px] text-muted-foreground sm:text-[25px]">
              {homeData.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewGhe}
            className="btn-primary px-6 py-3 text-[15px]"
          >
            <PlusCircle className="h-5 w-5" />
            Novo GHE
          </button>
        </div>

        <div className="mt-10 h-px w-full bg-border" />

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {homeData.summaryCards.map((card) => (
            <div
              key={card.title}
              className={`${card.bg} rounded-[8px] px-6 py-5`}
            >
              <p className={`text-[18px] font-medium ${card.titleClass}`}>
                {card.title}
              </p>
              <p className={`mt-6 text-[40px] font-medium ${card.valueClass}`}>
                {card.value}
              </p>
              <p className={`mt-4 text-[14px] font-light ${card.noteClass}`}>
                {card.note}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[8px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full max-w-[474px] items-center gap-3 rounded-[8px] bg-muted px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por GHE, empresa, status..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div className="relative" ref={filtersRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-[5px] bg-card px-4 py-2 text-[14px] text-foreground shadow-[0px_2px_3px_2px_rgba(29,63,82,0.32)] dark:border dark:border-border/60 dark:shadow-none"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtrar
              </button>
              {filtersOpen && (
                <div className="absolute right-0 z-10 mt-3 w-[220px] rounded-[10px] bg-popover p-4 text-[13px] text-popover-foreground shadow-[0px_8px_20px_rgba(25,59,79,0.15)]">
                  <p className="text-[13px] font-semibold text-foreground">
                    Filtros rápidos
                  </p>
                  <label className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={onlyUrgent}
                      onChange={(event) => setOnlyUrgent(event.target.checked)}
                    />
                    Somente urgentes
                  </label>
                  <label className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={onlyLate}
                      onChange={(event) => setOnlyLate(event.target.checked)}
                    />
                    Somente atrasados
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setOnlyUrgent(false);
                      setOnlyLate(false);
                    }}
                    className="mt-4 w-full rounded-[6px] bg-muted px-3 py-2 text-[13px] text-foreground"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[8px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
          <div className="grid grid-cols-[2.4fr_1.6fr_1.4fr_1.4fr_1fr_0.4fr] gap-4 text-[13px] font-medium text-muted-foreground">
            <span>GHE / Empresa</span>
            <span>Responsável</span>
            <span>Prioridade</span>
            <span>Status</span>
            <span>Vencimento</span>
            <span></span>
          </div>
          <div className="mt-4 space-y-0 divide-y divide-border">
            {filteredRows.map((row, index) => (
              <div
                key={`${row.id}-${index}`}
                className="grid grid-cols-[2.4fr_1.6fr_1.4fr_1.4fr_1fr_0.4fr] items-center gap-4 py-5 text-[14px] text-foreground"
              >
                <span className="text-[16px] font-medium">{row.ghe}</span>
                <span className="text-[16px] font-medium">
                  {row.responsavel}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-[20px] px-4 py-1 text-[12px] text-foreground ${row.prioridade.bg}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${row.prioridade.dot}`}
                  />
                  {row.prioridade.label}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-[20px] px-4 py-1 text-[12px] text-foreground ${row.status.bg}`}
                >
                  <span className={`h-2 w-2 rounded-full ${row.status.dot}`} />
                  {row.status.label}
                </span>
                <div className="text-right">
                  <p className={`text-[12px] font-semibold ${row.vencimentoClass}`}>
                    {row.vencimento}
                  </p>
                  {row.atraso && (
                    <p className="text-[11px] font-light text-foreground">
                      {row.atraso}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleEdit(row.id)}
                  className="flex items-center justify-center text-muted-foreground transition hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
