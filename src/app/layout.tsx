import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PGR Web",
  description: "Login",
  icons: {
    icon: "/logo_metadado.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
