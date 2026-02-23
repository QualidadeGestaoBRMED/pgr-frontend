"use client";

import { Pencil, PlusCircle, Search, SlidersHorizontal } from "lucide-react";
import { Work_Sans } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const mockHomeData = {
  user: {
    name: "Gabriel Rodrigues",
    initials: "IA",
  },
  title: "GHE's em elaboração",
  subtitle: "Atualizado há 2 minutos · Sincronizado com Pipefy",
  summaryCards: [
    {
      title: "Hoje",
      value: "12",
      note: "3 vencendo nas próximas 4 horas",
      bg: "bg-[#193b4e]",
      titleClass: "text-white",
      valueClass: "text-white",
      noteClass: "text-[#ffd64d]",
    },
    {
      title: "Amanhã",
      value: "23",
      note: "+2 desde ontem",
      bg: "bg-[#e3f0f2]",
      titleClass: "text-[#193b4f]",
      valueClass: "text-[#193b4f]",
      noteClass: "text-[#287a01]",
    },
    {
      title: "Próxima semana",
      value: "36",
      note: "Bem distribuídos",
      bg: "bg-[#e3f0f2]",
      titleClass: "text-[#193b4f]",
      valueClass: "text-[#193b4f]",
      noteClass: "text-[#287a01]",
    },
    {
      title: "Total em Elaboração",
      value: "90",
      note: "+6% em relação a semana passada.",
      bg: "bg-[#e3f0f2]",
      titleClass: "text-[#193b4f]",
      valueClass: "text-[#193b4f]",
      noteClass: "text-[#287a01]",
    },
  ],
  tableRows: [
    {
      id: "ghe-1",
      ghe: "GHE - Manutenção II",
      responsavel: "João silva",
      prioridade: {
        label: "Urgente",
        bg: "bg-[#ffe1e1]",
        dot: "bg-[#f64848]",
      },
      status: {
        label: "Em elaboração",
        bg: "bg-[#f2c977]",
        dot: "bg-[#f2b233]",
      },
      vencimento: "Hoje, 18:00",
      vencimentoClass: "text-[#f64848]",
      atraso: null,
      isUrgent: true,
      isLate: false,
    },
    {
      id: "ghe-2",
      ghe: "GHE - Manutenção II",
      responsavel: "João silva",
      prioridade: {
        label: "Alta",
        bg: "bg-[#ffb413]",
        dot: "bg-[#d97b00]",
      },
      status: {
        label: "Pendente",
        bg: "bg-[#f29177]",
        dot: "bg-[#c95a40]",
      },
      vencimento: "Ontem, 17:00",
      vencimentoClass: "text-[#f64848]",
      atraso: "Atrasado 21h",
      isUrgent: false,
      isLate: true,
    },
  ],
};

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [onlyLate, setOnlyLate] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);

  const handleNewGhe = () => {
    router.push("/ghe/novo");
  };

  const handleEdit = (id: string) => {
    router.push(`/ghe/editar/${id}`);
  };

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mockHomeData.tableRows.filter((row) => {
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
  }, [searchQuery, onlyUrgent, onlyLate]);

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
    <div className={`min-h-screen bg-[#f8f8f8] ${workSans.className}`}>
      <div className="mx-auto w-full max-w-[1480px] px-0 pb-16 pt-8 sm:px-0 lg:px-1">
        <AppHeader user={mockHomeData.user} />

        <div className="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[32px] font-semibold text-[#193b4f] sm:text-[40px]">
              {mockHomeData.title}
            </h1>
            <p className="mt-3 text-[18px] text-[#959595] sm:text-[25px]">
              {mockHomeData.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewGhe}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#007891] px-6 py-3 text-[15px] font-medium text-[#f5f5f5]"
          >
            <PlusCircle className="h-5 w-5" />
            Novo GHE
          </button>
        </div>

        <div className="mt-10 h-px w-full bg-[#dcdcdc]" />

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {mockHomeData.summaryCards.map((card) => (
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

        <div className="mt-8 rounded-[8px] bg-[#fefefe] px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full max-w-[474px] items-center gap-3 rounded-[8px] bg-[#f0f0f0] px-4 py-3">
              <Search className="h-4 w-4 text-[#b9b9b9]" />
              <input
                type="text"
                placeholder="Buscar por GHE, empresa, status..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-transparent text-[14px] text-[#193b4f] placeholder:text-[#b9b9b9] focus:outline-none"
              />
            </div>
            <div className="relative" ref={filtersRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-[5px] bg-white px-4 py-2 text-[14px] text-[#193b4f] shadow-[0px_2px_3px_2px_rgba(29,63,82,0.32)]"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtrar
              </button>
              {filtersOpen && (
                <div className="absolute right-0 z-10 mt-3 w-[220px] rounded-[10px] bg-white p-4 text-[13px] text-[#193b4f] shadow-[0px_8px_20px_rgba(25,59,79,0.15)]">
                  <p className="text-[13px] font-semibold">Filtros rápidos</p>
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
                    className="mt-4 w-full rounded-[6px] bg-[#f0f0f0] px-3 py-2 text-[13px]"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[8px] bg-[#fefefe] px-6 py-6">
          <div className="grid grid-cols-[2.4fr_1.6fr_1.4fr_1.4fr_1fr_0.4fr] gap-4 text-[13px] font-medium text-black">
            <span>GHE / Empresa</span>
            <span>Responsável</span>
            <span>Prioridade</span>
            <span>Status</span>
            <span>Vencimento</span>
            <span></span>
          </div>
          <div className="mt-4 space-y-0 divide-y divide-[#e6e6e6]">
            {filteredRows.map((row, index) => (
              <div
                key={`${row.id}-${index}`}
                className="grid grid-cols-[2.4fr_1.6fr_1.4fr_1.4fr_1fr_0.4fr] items-center gap-4 py-5 text-[14px] text-[#193b4f]"
              >
                <span className="text-[16px] font-medium">{row.ghe}</span>
                <span className="text-[16px] font-medium">
                  {row.responsavel}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-[20px] px-4 py-1 text-[12px] text-black ${row.prioridade.bg}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${row.prioridade.dot}`}
                  />
                  {row.prioridade.label}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-[20px] px-4 py-1 text-[12px] text-black ${row.status.bg}`}
                >
                  <span className={`h-2 w-2 rounded-full ${row.status.dot}`} />
                  {row.status.label}
                </span>
                <div className="text-right">
                  <p className={`text-[12px] font-semibold ${row.vencimentoClass}`}>
                    {row.vencimento}
                  </p>
                  {row.atraso && (
                    <p className="text-[11px] font-light text-[#193b4f]">
                      {row.atraso}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleEdit(row.id)}
                  className="flex items-center justify-center text-[#c0c0c0]"
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
