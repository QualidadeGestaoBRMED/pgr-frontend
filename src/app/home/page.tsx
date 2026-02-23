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
        bg: "bg-[#f5cf86] dark:bg-[#5a4a1a]",
        text: "text-foreground",
        dot: "bg-[#d59a2b] dark:bg-[#f5cf86]",
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
        bg: "bg-[#efefef] dark:bg-[#2a353c]",
        text: "text-foreground",
        dot: "bg-[#9a9a9a] dark:bg-[#7f8a93]",
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
        bg: "bg-[#cfeadf] dark:bg-[#1e3b2c]",
        text: "text-foreground",
        dot: "bg-[#3da36b] dark:bg-[#6bd59a]",
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
    <div className={`min-h-screen bg-background ${workSans.className}`}>
      <div className="mx-auto w-full max-w-[1480px] px-0 pb-16 pt-8 sm:px-0 lg:px-1">
        <AppHeader user={mockPgrData.user} />

        <div className="mt-12">
          <h1 className="text-[36px] font-semibold text-foreground sm:text-[44px]">
            {mockPgrData.title}
          </h1>
          <p className="mt-3 text-[18px] text-muted-foreground sm:text-[25px]">
            {mockPgrData.subtitle}
          </p>
        </div>

        <div className="mt-8 h-px w-full bg-border" />

        <div className="mt-10 rounded-[12px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full max-w-[520px] items-center gap-3 rounded-[10px] bg-muted px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por ID, empresa, status..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => router.push("/pgr/novo")}
              className="btn-primary rounded-[10px] px-5 py-3 text-[15px]"
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
              className="rounded-[12px] bg-card px-6 py-5 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0px_8px_18px_rgba(25,59,79,0.12)] dark:border dark:border-border/60 dark:hover:border-primary/35"
            >
              <h3 className="text-[20px] font-semibold text-foreground sm:text-[22px]">
                {card.title}
              </h3>
              <p className="mt-1 text-[14px] text-muted-foreground">
                ID: {card.code}
              </p>
              <div className="my-4 h-px w-full bg-border" />

              <div className="space-y-3 text-[14px] text-muted-foreground">
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
                  <span className="font-medium text-foreground">
                    {card.createdAt}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Responsável:</span>
                  <span className="font-medium text-foreground">
                    {card.owner}
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
