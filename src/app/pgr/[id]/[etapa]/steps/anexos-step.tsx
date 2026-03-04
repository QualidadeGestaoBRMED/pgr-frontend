import type { Dispatch, DragEvent, SetStateAction } from "react";
import { SearchableSelect } from "./searchable-select";

type AnexosStepProps = {
  ctx: {
    anexoDiretriz: string;
    setAnexoDiretriz: Dispatch<SetStateAction<string>>;
    diretrizOptions: string[];
    selectBaseClass: string;
    handleAnexoFiles: (anexoId: string, files: FileList | null) => void;
    anexos: Array<{
      id: string;
      title: string;
      files: Array<{ id: string; name: string }>;
    }>;
    handleAnexoDragStart: (anexoId: string) => void;
    handleAnexoDragOver: (event: DragEvent, anexoId: string) => void;
    handleAnexoDrop: (anexoId: string) => void;
    handleAnexoDragEnd: () => void;
    dragOverAnexoId: string | null;
    inputInlineClass: string;
    handleRenameAnexoTitle: (anexoId: string, value: string) => void;
    handleMoveAnexo: (anexoId: string, direction: "up" | "down") => void;
    handleAnexoFileRename: (anexoId: string, fileId: string, value: string) => void;
    handleAnexoFileRemove: (anexoId: string, fileId: string) => void;
    handleAnexoFileDownload: (fileId: string, fileName: string) => void;
    handleAddAnexo: () => void;
  };
};

export function AnexosStep({ ctx }: AnexosStepProps) {
  const {
    anexoDiretriz,
    setAnexoDiretriz,
    diretrizOptions,
    selectBaseClass,
    handleAnexoFiles,
    anexos,
    handleAnexoDragStart,
    handleAnexoDragOver,
    handleAnexoDrop,
    handleAnexoDragEnd,
    dragOverAnexoId,
    inputInlineClass,
    handleRenameAnexoTitle,
    handleMoveAnexo,
    handleAnexoFileRename,
    handleAnexoFileRemove,
    handleAnexoFileDownload,
    handleAddAnexo,
  } = ctx;

  return (
    <>
      <section className="px-2">
        <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
          Inclusão de Anexos
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">Insira documentos</p>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <div className="grid gap-4 md:grid-cols-[1.2fr_1.4fr]">
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground">
              Diretriz para geração de PDF
            </label>
            <div className="mt-2">
              <SearchableSelect
                value={anexoDiretriz}
                onChange={(value) => setAnexoDiretriz(value)}
                options={diretrizOptions.map((option) => ({
                  label: option,
                  value: option,
                }))}
                buttonClassName={selectBaseClass}
                searchPlaceholder="Filtrar diretriz"
              />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground">
              ART - Anotação de Responsabilidade Técnica
            </label>
            <div className="mt-2 flex items-center gap-2">
              <label className="btn-outline px-3 py-2 text-[12px]">
                Escolher arquivos
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(event) =>
                    handleAnexoFiles("anexo-art", event.target.files)
                  }
                />
              </label>
              <span className="text-[12px] text-muted-foreground">
                {anexos.find((item) => item.id === "anexo-art")?.files.length ?? 0}{" "}
                arquivos
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {anexos.map((anexo) => (
            <div
              key={anexo.id}
              draggable
              onDragStart={() => handleAnexoDragStart(anexo.id)}
              onDragOver={(event) => handleAnexoDragOver(event, anexo.id)}
              onDrop={() => handleAnexoDrop(anexo.id)}
              onDragEnd={handleAnexoDragEnd}
              className={`rounded-[12px] border px-4 py-4 ${
                dragOverAnexoId === anexo.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/60 bg-background/40"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  className={`${inputInlineClass} max-w-[320px]`}
                  value={anexo.title}
                  onChange={(event) =>
                    handleRenameAnexoTitle(anexo.id, event.target.value)
                  }
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveAnexo(anexo.id, "up")}
                    className="btn-outline px-3 py-1 text-[12px]"
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveAnexo(anexo.id, "down")}
                    className="btn-outline px-3 py-1 text-[12px]"
                  >
                    Descer
                  </button>
                  <label className="btn-outline px-3 py-1 text-[12px]">
                    Adicionar PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={(event) =>
                        handleAnexoFiles(anexo.id, event.target.files)
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {anexo.files.length ? (
                  anexo.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border/60 bg-card px-3 py-2"
                    >
                      <input
                        className={`${inputInlineClass} max-w-[320px]`}
                        value={file.name}
                        onChange={(event) =>
                          handleAnexoFileRename(
                            anexo.id,
                            file.id,
                            event.target.value
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleAnexoFileDownload(file.id, file.name || file.id)
                        }
                        className="btn-outline px-3 py-1 text-[12px]"
                      >
                        Baixar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnexoFileRemove(anexo.id, file.id)}
                        className="btn-outline px-3 py-1 text-[12px] text-danger hover:bg-danger/10"
                      >
                        Excluir
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    Nenhum arquivo anexado.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleAddAnexo}
            className="btn-outline px-4 py-2"
          >
            Adicionar novo anexo
          </button>
        </div>
      </section>
    </>
  );
}
