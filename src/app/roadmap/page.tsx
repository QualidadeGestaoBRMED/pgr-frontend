import type { Metadata } from "next";

import { RoadmapView } from "./roadmap-view";

export const metadata: Metadata = {
  title: "Roadmap XPTO",
  description:
    "Visualize a jornada de conformidade de SST com uma linha do tempo conectando PGR, PCMSO, LTCAT e produtos relacionados.",
};

export default function RoadmapPage() {
  return <RoadmapView />;
}
