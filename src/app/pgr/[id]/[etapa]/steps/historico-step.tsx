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
    currentVersionEditHistory: Array<{
      version: number;
      openedAt: string;
      openedBy: string;
      openedById: number | null;
    }>;
  };
  isGeneratingFakePdf: boolean;
  onDownloadPdf: () => void;
  onStartNewVersion: () => void;
  onEditCurrentVersion: (reason: string) => void;
  onEditCurrentFinalizedVersion: () => void;
  onChangeField: (
    changeId: string,
    field: "company" | "analysis" | "change" | "reason" | "date" | "status",
    value: string
  ) => void;
  onDeleteRow: (changeId: string) => void;
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
  onEditCurrentFinalizedVersion,
  onChangeField,
  onDeleteRow,
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
      onEditCurrentFinalizedVersion={onEditCurrentFinalizedVersion}
      onChangeField={onChangeField}
      onDeleteRow={onDeleteRow}
    />
  );
}
