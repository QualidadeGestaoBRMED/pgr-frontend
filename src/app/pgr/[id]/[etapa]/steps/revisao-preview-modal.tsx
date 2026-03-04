import { FileDown, LoaderCircle } from "lucide-react";

type RevisaoPreviewModalProps = {
  open: boolean;
  fakePreviewLines: string[];
  isGeneratingFakePdf: boolean;
  onClose: () => void;
  onGenerate: () => void;
};

export function RevisaoPreviewModal({
  open,
  fakePreviewLines,
  isGeneratingFakePdf,
  onClose,
  onGenerate,
}: RevisaoPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed -inset-6 z-50">
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-5xl rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-semibold text-foreground">
                Prévia do payload do documento
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                JSON consolidado de todas as steps usado para gerar o PDF.
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

          <div className="mt-6 max-h-[65vh] overflow-auto rounded-[12px] border border-border/60 bg-background/40 px-4 py-4">
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-foreground">
              {fakePreviewLines.join("\n")}
            </pre>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
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
  );
}
