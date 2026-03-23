import { FileDown, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  PDF_LAYOUT_TABLES,
  type PdfLayoutState,
} from "@/lib/pgr-pdf-runtime/layout";

type RevisaoPreviewModalProps = {
  open: boolean;
  fakePreviewLines: string[];
  pdfLayout: PdfLayoutState;
  isGeneratingFakePdf: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onPdfLayoutChange: (next: PdfLayoutState) => void;
  onGeneratePreviewPdf: (layoutOverride?: PdfLayoutState) => Promise<string>;
};

const PREVIEW_DEBOUNCE_MS = 500;

export function RevisaoPreviewModal({
  open,
  fakePreviewLines,
  pdfLayout,
  isGeneratingFakePdf,
  onClose,
  onGenerate,
  onPdfLayoutChange,
  onGeneratePreviewPdf,
}: RevisaoPreviewModalProps) {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const selectedTable = useMemo(
    () =>
      PDF_LAYOUT_TABLES.find((table) => table.id === pdfLayout.selectedTableId) ??
      PDF_LAYOUT_TABLES[0],
    [pdfLayout.selectedTableId]
  );

  const selectedWeights = useMemo(() => {
    if (!selectedTable) return [];
    return (
      pdfLayout.tableWeights[selectedTable.id] ?? [...selectedTable.defaultWeights]
    );
  }, [pdfLayout.tableWeights, selectedTable]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsPreviewLoading(true);
    setPreviewError(null);
    const timer = window.setTimeout(() => {
      void onGeneratePreviewPdf(pdfLayout)
        .then((nextUrl) => {
          if (!active) {
            window.URL.revokeObjectURL(nextUrl);
            return;
          }
          setPreviewUrl((prev) => {
            if (prev) window.URL.revokeObjectURL(prev);
            return nextUrl;
          });
        })
        .catch((error) => {
          if (!active) return;
          setPreviewError(
            error instanceof Error
              ? error.message
              : "Não foi possível renderizar a prévia do PDF."
          );
        })
        .finally(() => {
          if (active) setIsPreviewLoading(false);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, onGeneratePreviewPdf, pdfLayout]);

  useEffect(() => {
    if (open) return;
    setPreviewUrl((current) => {
      if (current) window.URL.revokeObjectURL(current);
      return null;
    });
    setPreviewError(null);
  }, [open]);

  const handleSelectTable = (tableId: string) => {
    onPdfLayoutChange({ ...pdfLayout, selectedTableId: tableId });
  };

  const handleWeightChange = (index: number, nextValue: number) => {
    if (!selectedTable) return;
    const safeValue = Number.isFinite(nextValue) ? Math.max(5, nextValue) : 5;
    const current = pdfLayout.tableWeights[selectedTable.id] ?? [
      ...selectedTable.defaultWeights,
    ];
    const nextWeights = [...current];
    nextWeights[index] = safeValue;
    onPdfLayoutChange({
      ...pdfLayout,
      tableWeights: {
        ...pdfLayout.tableWeights,
        [selectedTable.id]: nextWeights,
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed -inset-6 z-50">
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-[1280px] rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-semibold text-foreground">
                Prévia do PDF com ajuste de colunas
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Ajustes atualizam a prévia automaticamente após {PREVIEW_DEBOUNCE_MS}
                ms.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline px-3 py-1 text-[12px]"
            >
              Fechar
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="space-y-4 rounded-[12px] border border-border/60 bg-background/40 p-4">
              <div>
                <p className="text-[12px] font-semibold text-foreground">
                  Tabela selecionada
                </p>
                <select
                  className="mt-2 h-[38px] w-full rounded-[8px] border border-border bg-muted px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedTable?.id ?? ""}
                  onChange={(event) => handleSelectTable(event.target.value)}
                >
                  {PDF_LAYOUT_TABLES.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTable ? (
                <div className="space-y-3">
                  {selectedWeights.map((weight, index) => (
                    <label
                      key={`${selectedTable.id}-${index}`}
                      className="block rounded-[10px] border border-border/60 bg-card px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-foreground">
                          {selectedTable.columnLabels?.[index]
                            ? `${index + 1}. ${selectedTable.columnLabels[index]}`
                            : `Coluna ${index + 1}`}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {Math.round(weight)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={400}
                        value={Math.round(weight)}
                        onChange={(event) =>
                          handleWeightChange(index, Number(event.target.value))
                        }
                        className="mt-2 w-full accent-primary"
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              <div className="rounded-[10px] border border-dashed border-border/60 bg-card/40 px-3 py-2 text-[11px] text-muted-foreground">
                Se preferir, você pode continuar com os padrões. O layout atual será
                salvo no documento.
              </div>
            </div>

            <div className="min-h-[65vh] overflow-hidden rounded-[12px] border border-border/60 bg-background/40">
              {isPreviewLoading ? (
                <div className="flex h-[65vh] items-center justify-center text-[13px] text-muted-foreground">
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Renderizando prévia do PDF...
                </div>
              ) : previewError ? (
                <div className="flex h-[65vh] items-center justify-center px-6 text-center text-[13px] text-danger">
                  {previewError}
                </div>
              ) : previewUrl ? (
                <iframe
                  title="Prévia PDF"
                  src={previewUrl}
                  className="h-[65vh] w-full"
                />
              ) : (
                <div className="flex h-[65vh] items-center justify-center text-[13px] text-muted-foreground">
                  Prévia indisponível no momento.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-[60%] rounded-[10px] border border-border/60 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
              <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                {fakePreviewLines.slice(0, 3).join("\n")}
              </pre>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={onClose} className="btn-outline px-4">
                Voltar
              </button>
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGeneratingFakePdf}
                className={isGeneratingFakePdf ? "btn-disabled px-5" : "btn-primary px-5"}
              >
                {isGeneratingFakePdf ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Gerar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
