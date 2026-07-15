import { PgrHistoricoPanel } from "@/components/pgr-historico-panel";

type HistoricoStepProps = {
  title: string;
  subtitle: string;
  changes: Array<{
    id: string;
    company: string;
    analysis: string;
    change: string;
    reason: string | string[];
    date: string;
    status?: string;
  }>;
  workflow: {
    isLocked: boolean;
    version: number;
    statusLabel?: string | null;
    rejectionSourcePhaseId?: string | null;
    finalizedAt: string | null;
    finalizedBy: string | null;
    finalizedById: number | null;
  };
  isGeneratingFakePdf: boolean;
  onDownloadPdf: () => void;
  onStartNewVersion: () => void;
  onEditCurrentVersion: (reason: string) => void;
  onChangeField: (
    changeId: string,
    field: "company" | "analysis" | "change" | "reason" | "date" | "status",
    value: string
  ) => void;
};

export function HistoricoStep({
  title,
  subtitle,
  changes,
  workflow,
  isGeneratingFakePdf,
  onDownloadPdf,
  onStartNewVersion,
  onEditCurrentVersion,
  onChangeField,
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
      onEditCurrentVersion={onEditCurrentVersion}
      onChangeField={onChangeField}
    />
  );
}
