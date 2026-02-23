"use client";

import { PlusCircle, Search } from "lucide-react";
import { Work_Sans } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const mockPgrData = {
  user: {
    name: "User Admin",
    initials: "UA",
  },
  title: "Programa de Gerenciamento de Riscos - PGR",
  subtitle: "Gerencie todos os PGRs em um só lugar",
  cards: [
    {
      id: "pgr-1",
      title: "PGR - Aeroclínica",
      code: "PGR1234",
      status: {
        label: "Em andamento",
        bg: "bg-[#f5cf86]",
        text: "text-black",
        dot: "bg-[#d59a2b]",
      },
      createdAt: "10/01/2026",
      owner: "João Silva",
      progress: 45,
    },
    {
      id: "pgr-2",
      title: "PGR - Aeroclínica",
      code: "PGR1234",
      status: {
        label: "Em rascunho",
        bg: "bg-[#efefef]",
        text: "text-black",
        dot: "bg-[#9a9a9a]",
      },
      createdAt: "10/01/2026",
      owner: "João Silva",
      progress: 45,
    },
    {
      id: "pgr-3",
      title: "PGR - Aeroclínica",
      code: "PGR1234",
      status: {
        label: "Completo",
        bg: "bg-[#cfeadf]",
        text: "text-black",
        dot: "bg-[#3da36b]",
      },
      createdAt: "10/01/2026",
      owner: "João Silva",
      progress: 45,
    },
  ],
};

export default function PgrsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return mockPgrData.cards;
    return mockPgrData.cards.filter((card) => {
      return (
        card.title.toLowerCase().includes(query) ||
        card.code.toLowerCase().includes(query) ||
        card.status.label.toLowerCase().includes(query) ||
        card.owner.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  return (
    <div className={`min-h-screen bg-[#f8f8f8] ${workSans.className}`}>
      <div className="mx-auto w-full max-w-[1480px] px-0 pb-16 pt-8 sm:px-0 lg:px-1">
        <AppHeader user={mockPgrData.user} />

        <div className="mt-12">
          <h1 className="text-[36px] font-semibold text-[#193b4f] sm:text-[44px]">
            {mockPgrData.title}
          </h1>
          <p className="mt-3 text-[18px] text-[#959595] sm:text-[25px]">
            {mockPgrData.subtitle}
          </p>
        </div>

        <div className="mt-8 h-px w-full bg-[#e6e6e6]" />

        <div className="mt-10 rounded-[12px] bg-white px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full max-w-[520px] items-center gap-3 rounded-[10px] bg-[#f0f0f0] px-4 py-3">
              <Search className="h-4 w-4 text-[#b9b9b9]" />
              <input
                type="text"
                placeholder="Buscar por ID, empresa, status..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-transparent text-[14px] text-[#193b4f] placeholder:text-[#b9b9b9] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => router.push("/pgr/novo")}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#007891] px-5 py-3 text-[15px] font-medium text-white transition hover:brightness-110"
            >
              <PlusCircle className="h-5 w-5" />
              Novo PGR
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/pgr/${card.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/pgr/${card.id}`);
                }
              }}
              className="rounded-[12px] bg-white px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0px_8px_18px_rgba(25,59,79,0.12)]"
            >
              <h3 className="text-[20px] font-semibold text-[#1f3f52] sm:text-[22px]">
                {card.title}
              </h3>
              <p className="mt-1 text-[14px] text-[#a0a0a0]">
                ID: {card.code}
              </p>
              <div className="my-4 h-px w-full bg-[#ededed]" />

              <div className="space-y-3 text-[14px] text-[#8a8a8a]">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] ${card.status.bg} ${card.status.text}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${card.status.dot}`}
                    />
                    {card.status.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Criado em:</span>
                  <span className="text-[#1f3f52] font-medium">
                    {card.createdAt}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Responsável:</span>
                  <span className="text-[#1f3f52] font-medium">
                    {card.owner}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="text-[14px] font-semibold text-[#1f3f52]">
                  Progresso: {card.progress}%
                </span>
                <div className="h-3 w-[140px] rounded-full bg-[#e6e6e6]">
                  <div
                    className="h-3 rounded-full bg-[#2d8b1f]"
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
