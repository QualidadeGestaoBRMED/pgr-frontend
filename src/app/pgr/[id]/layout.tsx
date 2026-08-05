"use client";

import { AppHeader } from "@/components/app-header";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import PgrEtapaPageContent from "./[etapa]/page-content";

export default function PgrLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const [user, setUser] = useState({ name: "Usuário", initials: "US" });
  const router = useRouter();
  const routeParams = useParams();
  const rawEtapa = routeParams?.etapa;
  const etapa = Array.isArray(rawEtapa) ? rawEtapa[0] : rawEtapa;
  const [optimisticEtapa, setOptimisticEtapa] = useState<string | null>(null);
  const displayedEtapa = optimisticEtapa ?? etapa;

  useEffect(() => {
    if (optimisticEtapa && optimisticEtapa === etapa) {
      setOptimisticEtapa(null);
    }
  }, [etapa, optimisticEtapa]);

  const handleNavigateStep = useCallback(
    (nextEtapa: string) => {
      if (nextEtapa === displayedEtapa) return;
      // Troca o renderer no mesmo evento do clique. A transição do App Router
      // continua em segundo plano apenas para sincronizar URL/histórico.
      setOptimisticEtapa(nextEtapa);
      router.push(`/pgr/${params.id}/${nextEtapa}`, { scroll: false });
    },
    [displayedEtapa, params.id, router]
  );

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const summary = await apiGet<{ user: { name: string; initials: string } }>(
          `/api/v1/frontend/pgr/${params.id}/summary`
        );
        if (!active) return;
        setUser(summary.user);
      } catch {
        if (!active) return;
        setUser({ name: "Usuário", initials: "US" });
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1480px] px-0 pb-16 pt-8 sm:px-0 lg:px-1">
        <AppHeader user={user} />
        {typeof displayedEtapa === "string" && displayedEtapa ? (
          // O host do wizard vive no layout [id], que não é desmontado quando
          // apenas o segmento [etapa] muda. Assim a navegação troca somente o
          // renderer da etapa e preserva controller/state/catálogos em memória.
          <PgrEtapaPageContent
            key={params.id}
            params={{ id: params.id, etapa: displayedEtapa }}
            onNavigateStep={handleNavigateStep}
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
