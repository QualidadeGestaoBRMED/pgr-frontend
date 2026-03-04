import { PgrHistoricoPanel } from "@/components/pgr-historico-panel";

type HistoricoStepProps = {
  title: string;
  subtitle: string;
  changes: Array<{
    id: string;
    company: string;
    analysis: string;
    change: string;
    reason: string;
    date: string;
  }>;
};

export function HistoricoStep({ title, subtitle, changes }: HistoricoStepProps) {
  return (
    <PgrHistoricoPanel title={title} subtitle={subtitle} changes={changes} />
  );
}
