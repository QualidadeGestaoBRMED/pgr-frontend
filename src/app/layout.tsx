import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PWARegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "PGR Web",
  description: "Login",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo_metadado.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "PGR",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#193b4f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <PWARegister />
      </body>
    </html>
  );
}
