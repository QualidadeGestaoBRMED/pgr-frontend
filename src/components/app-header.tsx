"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Moon,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { useRouter } from "next/navigation";

const imgMarcaPrincipalCorSmall31 =
  "https://www.figma.com/api/mcp/asset/a7cc84dc-695b-4f12-96ad-9c2879c6ecb5";

type AppHeaderUser = {
  name: string;
  initials: string;
};

type AppHeaderNotification = {
  title: string;
  description: string;
};

type AppHeaderProps = {
  user: AppHeaderUser;
  notifications?: AppHeaderNotification[];
};

export function AppHeader({ user, notifications }: AppHeaderProps) {
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [notificationItems, setNotificationItems] = useState<
    AppHeaderNotification[]
  >(() => {
    if (notifications && notifications.length > 0) return notifications;
    return [
      {
        title: "PGR - Vale",
        description: "Atrasado 21h · Ontem, 17:00",
      },
      {
        title: "Novo PGR atribuído",
        description: "Atualizado há 2 minutos",
      },
    ];
  });

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      setNotificationItems(notifications);
    }
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        notificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (
        profileOpen &&
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationsOpen, profileOpen]);

  const hasNotifications = notificationItems.length > 0;

  return (
    <header className="flex items-center justify-between rounded-[10px] bg-card px-6 py-4 text-foreground">
      <div className="flex items-center gap-4">
        <Link href="/home" aria-label="Ir para Home">
          <img
            src={imgMarcaPrincipalCorSmall31}
            alt="BR MED"
            className="h-[32px] w-[140px] object-contain dark:hidden"
          />
          <img
            src="/logo_darkmode.png"
            alt="BR MED"
            className="hidden h-[32px] w-[140px] object-contain dark:block"
          />
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <div className="group relative">
          <button
            type="button"
            aria-disabled="true"
            className="ai-chip cursor-default opacity-90"
            data-aura="true"
          >
            <Sparkles className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Assistente de IA</span>
          </button>
          <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-[260px] rounded-[10px] bg-popover p-3 text-[12px] text-popover-foreground shadow-[0px_8px_20px_rgba(25,59,79,0.15)] group-hover:block">
            Em breve, você terá uma ajuda para elaborar seus PGRs de forma mais
            rápida e segura. :)
          </div>
        </div>
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            className="relative text-muted-foreground transition hover:text-foreground"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {hasNotifications && (
              <span className="absolute -right-1 top-0 h-2 w-2 rounded-full bg-[#f64848] animate-pulse" />
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 z-10 mt-3 w-[260px] rounded-[10px] bg-popover p-4 text-[13px] text-popover-foreground shadow-[0px_8px_20px_rgba(25,59,79,0.15)]">
              <p className="text-[13px] font-semibold text-foreground">
                Notificações
              </p>
              <div className="mt-3 space-y-3 text-[13px] text-muted-foreground">
                {notificationItems.length === 0 ? (
                  <p>Nenhuma notificação</p>
                ) : (
                  notificationItems.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className="flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {item.title}
                        </p>
                        <p>{item.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationItems((prev) =>
                            prev.filter((_, idx) => idx !== index)
                          );
                        }}
                        className="mt-0.5 text-muted-foreground transition hover:text-foreground"
                        aria-label="Fechar notificação"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-3"
            aria-label="Perfil do usuário"
          >
            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-muted text-[12px] font-semibold text-foreground">
              {user.initials}
            </div>
            <span className="text-[12px] font-bold text-foreground">
              {user.name}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 z-10 mt-3 w-[200px] rounded-[10px] bg-popover p-3 text-[13px] text-popover-foreground shadow-[0px_8px_20px_rgba(25,59,79,0.15)]">
              <button
                type="button"
                className="w-full rounded-[6px] px-3 py-2 text-left transition hover:bg-muted"
              >
                Meu perfil
              </button>
              <button
                type="button"
                className="w-full rounded-[6px] px-3 py-2 text-left transition hover:bg-muted"
              >
                Configurações
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="mt-1 flex w-full items-center justify-between rounded-[6px] px-3 py-2 text-left transition hover:bg-muted"
              >
                <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-[#f5b301]" />
                ) : (
                  <Moon className="h-4 w-4 text-primary" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push("/login");
                }}
                className="w-full rounded-[6px] px-3 py-2 text-left text-[#f64848] transition hover:bg-[#fff1f1] dark:text-[#ffb6b6] dark:hover:bg-[#5a2a2a]"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
