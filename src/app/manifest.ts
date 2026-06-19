import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PGR Web",
    short_name: "PGR",
    description: "Plataforma de gestão de PGR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#193b4f",
    theme_color: "#193b4f",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
