import { ChevronDown, Download, LoaderCircle, PencilLine, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type PgrHistoricoPanelProps = {
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
    finalizedAt: string | null;
    finalizedBy: string | null;
    finalizedById: number | null;
  };
  isGeneratingFakePdf: boolean;
  onDownloadPdf: () => void;
  onStartNewVersion: () => void;
  onChangeField: (
    changeId: string,
    field: "company" | "analysis" | "change" | "reason" | "date" | "status",
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
  const [hasStartedNewVersion, setHasStartedNewVersion] = useState(false);
  const [openReasonSelectRowId, setOpenReasonSelectRowId] = useState<string | null>(null);
  const [reasonQuery, setReasonQuery] = useState("");

  const splitRevisionReasons = (value: string | string[]) =>
    (Array.isArray(value) ? value.join(";") : String(value || ""))
      .split(/\r?\n|;/g)
      .map((item) => item.trim())
      .filter(Boolean);

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const hasOptionInsensitive = (options: string[], value: string) => {
    const normalizedValue = normalizeText(value.trim());
    if (!normalizedValue) return false;
    return options.some((option) => normalizeText(option) === normalizedValue);
  };

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
  const canStartNewVersion = workflow.isLocked && Boolean(workflow.finalizedAt);
  const canClickStartNewVersion = canStartNewVersion && !hasStartedNewVersion;
  const statusOptions = ["Em edição", "Documento finalizado"];
  const allReasonOptions = useMemo(
    () =>
      Array.from(
        new Set([
          "Elaboração inicial",
          ...changes.flatMap((row) => splitRevisionReasons(row.reason)),
        ])
      ),
    [changes]
  );

  const resolveStatusValue = (value: string | undefined) => {
    const normalized = String(value || "").trim();
    if (statusOptions.includes(normalized)) return normalized;
    return workflow.isLocked ? "Documento finalizado" : "Em edição";
  };

  useEffect(() => {
    if (!openReasonSelectRowId) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-reason-multiselect]")) return;
      setOpenReasonSelectRowId(null);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [openReasonSelectRowId]);

  useEffect(() => {
    if (openReasonSelectRowId) {
      setReasonQuery("");
    }
  }, [openReasonSelectRowId]);

  const filterOptionsByQuery = (options: string[]) => {
    const term = normalizeText(reasonQuery.trim());
    if (!term) return options;
    return options.filter((option) => normalizeText(option).includes(term));
  };

  const handleToggleReason = (rowId: string, selectedReasons: string[], option: string) => {
    const safeOption = option.trim();
    if (!safeOption) return;
    const next = selectedReasons.includes(safeOption)
      ? selectedReasons.filter((item) => item !== safeOption)
      : [...selectedReasons, safeOption];
    onChangeField(rowId, "reason", next.join("; "));
  };

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
              onClick={() => {
                if (!canClickStartNewVersion) return;
                setHasStartedNewVersion(true);
                onStartNewVersion();
              }}
              disabled={!canClickStartNewVersion}
              title={
                canClickStartNewVersion
                  ? "Iniciar nova versão"
                  : hasStartedNewVersion
                    ? "A nova versão já foi iniciada."
                    : "Finalize a versão atual para iniciar uma nova."
              }
              className={
                canClickStartNewVersion
                  ? "btn-primary px-4 py-2 text-[14px]"
                  : "btn-disabled px-4 py-2 text-[14px]"
              }
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
        <div className="mt-4 overflow-x-auto overflow-y-visible">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[2.8fr_0.9fr_0.9fr_1.2fr_0.9fr_1fr] gap-4 border-b border-border pb-3 text-[13px] font-medium text-muted-foreground">
              <span className="text-center">Empresa</span>
              <span className="text-center">Análise</span>
              <span className="text-center">Alteração</span>
              <span className="text-center">Motivo</span>
              <span className="text-center">Data de Emissão</span>
              <span className="text-center">Status</span>
            </div>
            <div className="divide-y divide-border">
              {changes.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[2.8fr_0.9fr_0.9fr_1.2fr_0.9fr_1fr] gap-4 py-4 text-[13px] text-foreground"
                >
                  <input
                    value={row.company}
                    onChange={(event) =>
                      onChangeField(row.id, "company", event.target.value)
                    }
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-center text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={row.analysis}
                    onChange={(event) =>
                      onChangeField(row.id, "analysis", toTwoDigitCode(event.target.value))
                    }
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-center text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="00"
                  />
                  <input
                    value={row.change}
                    onChange={(event) =>
                      onChangeField(row.id, "change", toTwoDigitCode(event.target.value))
                    }
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-center text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="01"
                  />
                  <div className="relative" data-reason-multiselect>
                    {(() => {
                      const selectedReasons = splitRevisionReasons(row.reason);
                      const reasonOptions = Array.from(
                        new Set([...allReasonOptions, ...selectedReasons])
                      );
                      const filteredReasonOptions = filterOptionsByQuery(reasonOptions);
                      const customReasonValue = reasonQuery.trim();
                      const canAddCustomReason =
                        !!customReasonValue &&
                        !hasOptionInsensitive(reasonOptions, customReasonValue) &&
                        !hasOptionInsensitive(selectedReasons, customReasonValue);
                      return (
                        <>
                          <button
                            type="button"
                            className="h-[38px] w-full rounded-[8px] border border-border bg-muted px-3 pr-8 text-center text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            onClick={() =>
                              setOpenReasonSelectRowId((prev) =>
                                prev === row.id ? null : row.id
                              )
                            }
                            title={selectedReasons.join("; ")}
                          >
                            <span className="block truncate text-center">
                              {selectedReasons.length
                                ? "Clique para visualizar"
                                : "Selecione motivo"}
                            </span>
                            <ChevronDown
                              className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform ${
                                openReasonSelectRowId === row.id ? "rotate-180" : "rotate-0"
                              }`}
                            />
                          </button>
                          {openReasonSelectRowId === row.id ? (
                            <div className="mt-2 w-full rounded-[10px] border border-border bg-popover p-2 shadow-md">
                              <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                  className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 pl-8 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={reasonQuery}
                                  onChange={(event) => setReasonQuery(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (!canAddCustomReason || event.key !== "Enter") return;
                                    event.preventDefault();
                                    handleToggleReason(row.id, selectedReasons, customReasonValue);
                                    setReasonQuery("");
                                  }}
                                  placeholder="Filtrar ou adicionar motivo"
                                />
                              </div>
                              {customReasonValue ? (
                                canAddCustomReason ? (
                                  <button
                                    type="button"
                                    className="mb-2 w-full rounded-[6px] border border-border px-2 py-1 text-left text-[12px] text-foreground hover:bg-muted"
                                    onClick={() => {
                                      handleToggleReason(row.id, selectedReasons, customReasonValue);
                                      setReasonQuery("");
                                    }}
                                  >
                                    {`Adicionar "${customReasonValue}"`}
                                  </button>
                                ) : (
                                  <p className="mb-2 rounded-[6px] border border-border/70 bg-muted/50 px-2 py-1 text-[12px] text-muted-foreground">
                                    Este motivo já existe na lista.
                                  </p>
                                )
                              ) : (
                                <p className="mb-2 rounded-[6px] border border-dashed border-border/70 bg-muted/30 px-2 py-1 text-[12px] text-muted-foreground">
                                  Digite para adicionar um novo motivo.
                                </p>
                              )}
                              <div className="max-h-44 space-y-1 overflow-auto">
                                {filteredReasonOptions.length ? (
                                  filteredReasonOptions.map((option) => {
                                    const isChecked = selectedReasons.includes(option);
                                    return (
                                      <label
                                        key={`${row.id}-motivo-${option}`}
                                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-[12px] hover:bg-muted"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() =>
                                            handleToggleReason(row.id, selectedReasons, option)
                                          }
                                        />
                                        <span>{option}</span>
                                      </label>
                                    );
                                  })
                                ) : (
                                  <p className="px-2 py-1 text-[12px] text-muted-foreground">
                                    Nenhum motivo encontrado.
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                  <input
                    type="date"
                    value={toDateInputValue(row.date)}
                    onChange={(event) =>
                      onChangeField(row.id, "date", event.target.value)
                    }
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-center text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={resolveStatusValue(row.status)}
                    disabled
                    readOnly
                    className="h-[36px] w-full rounded-[8px] border border-border bg-muted px-3 text-center text-[12px] text-foreground opacity-70"
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
