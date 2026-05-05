import { Download, LoaderCircle, PencilLine } from "lucide-react";

type PgrHistoricoPanelProps = {
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
  onChangeField: (
    changeId: string,
    field: "company" | "analysis" | "change" | "reason" | "date",
    value: string
  ) => void;
};

export function PgrHistoricoPanel({
  title,
  subtitle,
  changes,
  workflow,
  isGeneratingFakePdf,
  onDownloadPdf,
  onStartNewVersion,
  onChangeField,
}: PgrHistoricoPanelProps) {
  const toTwoDigitCode = (value: string) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 2);
    return digits;
  };

  const toDateInputValue = (value: string) => {
    const safe = String(value || "").trim();
    if (!safe) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(safe)) return safe;
    const match = safe.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  };

  const finalizedInfo =
    workflow.isLocked && workflow.finalizedAt
      ? new Date(workflow.finalizedAt).toLocaleString("pt-BR")
      : null;

  return (
    <>
      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-foreground sm:text-[24px]">
              {title}
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">{subtitle}</p>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Versão atual: v{workflow.version}
              {workflow.isLocked ? " • Documento finalizado" : " • Em edição"}
            </p>
            {finalizedInfo ? (
              <p className="text-[12px] text-muted-foreground">
                Finalizado em {finalizedInfo}
                {workflow.finalizedBy ? ` por ${workflow.finalizedBy}` : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStartNewVersion}
              className="btn-primary px-4 py-2 text-[14px]"
            >
              <PencilLine className="h-4 w-4" />
              Iniciar nova versão
            </button>
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={isGeneratingFakePdf}
              className={isGeneratingFakePdf ? "btn-disabled px-4 py-2 text-[14px]" : "btn-primary px-4 py-2 text-[14px]"}
            >
              {isGeneratingFakePdf ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <h2 className="text-[16px] font-semibold text-foreground">
          Registro de Alterações
        </h2>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[2.8fr_0.9fr_0.9fr_1.2fr_0.9fr] gap-4 border-b border-border pb-3 text-[13px] font-medium text-muted-foreground">
              <span>Empresa</span>
              <span>Análise</span>
              <span>Alteração</span>
              <span>Motivo</span>
              <span>Data de Emissão</span>
            </div>
            <div className="divide-y divide-border">
              {changes.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[2.8fr_0.9fr_0.9fr_1.2fr_0.9fr] gap-4 py-4 text-[13px] text-foreground"
                >
                  <input
                    value={row.company}
                    onChange={(event) =>
                      onChangeField(row.id, "company", event.target.value)
                    }
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={row.analysis}
                    onChange={(event) =>
                      onChangeField(row.id, "analysis", toTwoDigitCode(event.target.value))
                    }
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="00"
                  />
                  <input
                    value={row.change}
                    onChange={(event) =>
                      onChangeField(row.id, "change", toTwoDigitCode(event.target.value))
                    }
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="01"
                  />
                  <input
                    value={row.reason}
                    onChange={(event) =>
                      onChangeField(row.id, "reason", event.target.value)
                    }
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Motivo"
                  />
                  <input
                    type="date"
                    value={toDateInputValue(row.date)}
                    onChange={(event) =>
                      onChangeField(row.id, "date", event.target.value)
                    }
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
