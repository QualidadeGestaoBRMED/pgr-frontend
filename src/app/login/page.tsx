"use client";

import { Chrome, Eye, EyeOff, Lock as LockIcon, Mail } from "lucide-react";
import { Work_Sans } from "next/font/google";
import { useRouter } from "next/navigation";
import { useState } from "react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const imgRectangle2 =
  "https://www.figma.com/api/mcp/asset/04ffb70e-401e-4996-bcd5-1819cbe54c80";
const imgImage2 = "/logo.png";
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username === "admin" && password === "admin") {
      setError("");
      router.push("/home");
      return;
    }
    setError("Usuário ou senha inválidos");
  };

  return (
    <div
      className={`min-h-screen w-full bg-background ${workSans.className}`}
    >
      <div className="min-h-screen w-full lg:grid lg:grid-cols-[49.75%_50.25%]">
        <div className="flex min-h-screen w-full flex-col items-center justify-start px-6 pb-12 pt-16 text-foreground sm:px-10 lg:px-[96px] lg:pt-[120px]">
          <div className="mt-4 w-full lg:max-w-[600px]">
            <img
              src={imgImage2}
              alt="BR MED"
              className="h-auto w-[220px] max-w-full object-contain sm:w-[220px] lg:w-[220px] dark:hidden"
            />
            <img
              src="/logo_darkmode.png"
              alt="BR MED"
              className="hidden h-auto w-[220px] max-w-full object-contain sm:w-[220px] lg:w-[220px] dark:block"
            />
            <div className="mt-12">
              <p className="text-[26px] font-semibold text-foreground tracking-[0.02em] sm:text-[28px]">
                Módulo PGR Web
              </p>
              <p className="mt-1 text-[14px] font-medium text-muted-foreground">
                Gestão integrada de riscos ocupacionais
              </p>
            </div>
            <p className="mt-8 text-[16px] font-normal text-foreground">
              Entre com suas credenciais para acessar
            </p>
            <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="username" className="text-[12px] font-medium">
                  Usuário:
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-[12px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-[44px] w-full rounded-[7px] border-[0.5px] border-border bg-muted pl-11 pr-3 text-[14px] text-foreground outline-none placeholder:text-[10px] placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[12px] font-medium">
                  Senha:
                </label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-[12px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite seu senha"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-[44px] w-full rounded-[7px] border-[0.5px] border-border bg-muted pl-11 pr-12 text-[14px] text-foreground outline-none placeholder:text-[10px] placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-[12px] top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[20px] w-[20px]" />
                    ) : (
                      <Eye className="h-[20px] w-[20px]" />
                    )}
                  </button>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    className="text-[12px] font-medium text-foreground"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border bg-muted text-primary focus:ring-primary"
                />
                Lembrar-me
              </label>

              <button
                type="submit"
                className="btn-primary h-[46px] w-full rounded-[8px] bg-[#193b4e] text-[15px] font-semibold text-white hover:bg-[#193b4e]/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90"
              >
                Entrar
              </button>
              {error && (
                <p className="text-[12px] font-medium text-destructive">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled
                className="btn-outline h-[46px] w-full rounded-[8px] text-[14px] opacity-60 cursor-not-allowed"
                aria-disabled="true"
              >
                <Chrome className="h-4 w-4" />
                Entrar com o Google
              </button>
            </form>
          </div>
        </div>

        <div className="relative hidden min-h-screen lg:block">
          <img
            src={imgRectangle2}
            alt=""
            className="absolute inset-0 h-full w-full rounded-bl-[10px] rounded-tl-[10px] object-cover"
          />
        </div>
      </div>
    </div>
  );
}
