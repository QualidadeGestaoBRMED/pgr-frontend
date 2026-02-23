"use client";

import { Eye, EyeOff, Lock as LockIcon, Mail } from "lucide-react";
import { Work_Sans } from "next/font/google";
import { useRouter } from "next/navigation";
import { useState } from "react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const imgRectangle2 =
  "https://www.figma.com/api/mcp/asset/04ffb70e-401e-4996-bcd5-1819cbe54c80";
const imgImage2 =
  "https://www.figma.com/api/mcp/asset/2f80db46-917a-45bd-8cd8-6ad0272e6a3d";
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
    <div className={`min-h-screen w-full bg-white ${workSans.className}`}>
      <div className="min-h-screen w-full lg:grid lg:grid-cols-[49.75%_50.25%]">
        <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-12 text-[#193b4e] sm:px-10 lg:px-[96px]">
          <div className="w-full lg:max-w-[600px] mt-4">
            <img
              src={imgImage2}
              alt="BR MED"
              className="-mt-64 w-[220px] h-auto max-w-full object-contain sm:w-[220px] lg:w-[250px]"

            />
            <p className="mt-20 text-[16px] font-normal">
              Entre com suas credenciais para acessar
            </p>
            <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="username" className="text-[12px] font-medium">
                  Usuário:
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-[12px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#aeadad]" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-[44px] w-full rounded-[7px] border-[0.5px] border-[#aeadad] bg-[#f3f3f5] pl-11 pr-3 text-[14px] text-[#193b4e] outline-none placeholder:text-[10px] placeholder:text-[#aeadad] focus:border-[#193b4e] focus:ring-1 focus:ring-[#193b4e]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[12px] font-medium">
                  Senha:
                </label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-[12px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#aeadad]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#aeadad] transition hover:text-[#193b4e]"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[20px] w-[20px]" />
                    ) : (
                      <Eye className="h-[20px] w-[20px]" />
                    )}
                  </button>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite seu senha"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-[44px] w-full rounded-[7px] border-[0.5px] border-[#aeadad] bg-[#f3f3f5] pl-11 pr-12 text-[14px] text-[#193b4e] outline-none placeholder:text-[10px] placeholder:text-[#aeadad] focus:border-[#193b4e] focus:ring-1 focus:ring-[#193b4e]"
                  />
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    className="text-[12px] font-medium text-[#193b4e]"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="h-[46px] w-full rounded-[8px] bg-[#193b4e] text-[15px] font-semibold text-white transition hover:brightness-110"
              >
                Entrar
              </button>
              {error && (
                <p className="text-[12px] font-medium text-[#f64848]">
                  {error}
                </p>
              )}
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
