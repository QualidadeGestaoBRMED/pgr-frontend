"use client";

import { Work_Sans } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { useEffect, useState, type ReactNode } from "react";
import { apiGet } from "@/lib/api";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function PgrLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const [user, setUser] = useState({ name: "Usuário", initials: "US" });

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const summary = await apiGet<{ user: { name: string; initials: string } }>(
          `/api/frontend/pgr/${params.id}/summary`
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
    <div className={`min-h-screen bg-background ${workSans.className}`}>
      <div className="mx-auto w-full max-w-[1480px] px-0 pb-16 pt-8 sm:px-0 lg:px-1">
        <AppHeader user={user} />
        {children}
      </div>
    </div>
  );
}
