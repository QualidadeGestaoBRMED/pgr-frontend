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
  workflow: {
    isLocked: boolean;
    version: number;
    finalizedAt: string | null;
    finalizedBy: string | null;
    finalizedById: number | null;
  };
  isGeneratingFakePdf: boolean;
  onDownloadPdf: () => void;
  onStartNewVersion: () => void;
};

export function HistoricoStep({
  title,
  subtitle,
  changes,
  workflow,
  isGeneratingFakePdf,
  onDownloadPdf,
  onStartNewVersion,
}: HistoricoStepProps) {
  return (
    <PgrHistoricoPanel
      title={title}
      subtitle={subtitle}
      changes={changes}
      workflow={workflow}
      isGeneratingFakePdf={isGeneratingFakePdf}
      onDownloadPdf={onDownloadPdf}
      onStartNewVersion={onStartNewVersion}
    />
  );
}
