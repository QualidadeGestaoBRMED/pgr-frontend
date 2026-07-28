import type {Dispatch, DragEvent, SetStateAction} from "react";
import {SearchableSelect} from "./searchable-select";
import type {AnexoOrientation, PgrDiretrizOption} from "../types";

type AnexosStepProps = {
    ctx: {
        anexoDiretriz: string;
        anexoDiretrizTemplateId: number | null;
        setAnexoDiretriz: Dispatch<SetStateAction<string>>;
        setAnexoDiretrizTemplateId: Dispatch<SetStateAction<number | null>>;
        diretrizOptions: PgrDiretrizOption[];
        selectBaseClass: string;
        handleAnexoFiles: (anexoId: string, files: FileList | null) => void;
        anexos: Array<{
            id: string;
            title: string;
            files: Array<{
                id: string;
                name: string;
                date?: string;
                orientation?: AnexoOrientation;
            }>;
        }>;
        handleAnexoDragStart: (anexoId: string) => void;
        handleAnexoDragOver: (event: DragEvent, anexoId: string) => void;
        handleAnexoDrop: (anexoId: string) => void;
        handleAnexoDragEnd: () => void;
        dragOverAnexoId: string | null;
        inputInlineClass: string;
        handleRenameAnexoTitle: (anexoId: string, value: string) => void;
        handleMoveAnexo: (anexoId: string, direction: "up" | "down") => void;
        handleAnexoFileOrientationChange: (
            anexoId: string,
            fileId: string,
            value: AnexoOrientation
        ) => void;
        handleAnexoFileRename: (anexoId: string, fileId: string, value: string) => void;
        handleAnexoFileDateChange: (anexoId: string, fileId: string, value: string) => void;
        handleAnexoFileRemove: (anexoId: string, fileId: string) => void;
        handleAnexoFileDownload: (fileId: string, fileName: string) => void;
        handleAddAnexo: () => void;
        handleRemoveAnexo: (anexoId: string) => void;
    };
};

export function AnexosStep({ctx}: AnexosStepProps) {
    const {
        anexoDiretriz,
        anexoDiretrizTemplateId,
        setAnexoDiretriz,
        setAnexoDiretrizTemplateId,
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
        handleAnexoFileOrientationChange,
        handleAnexoFileRename,
        handleAnexoFileDateChange,
        handleAnexoFileRemove,
        handleAnexoFileDownload,
        handleAddAnexo,
        handleRemoveAnexo,
    } = ctx;

    const toDateInputValue = (value: string | undefined) => {
        const safe = String(value || "").trim();
        if (!safe) return "";
        const isoMatch = safe.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const [, yyyy, mm, dd] = isoMatch;
            return `${yyyy}-${mm}-${dd}`;
        }
        const brMatch = safe.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (!brMatch) return "";
        const [, dd, mm, yyyy] = brMatch;
        return `${yyyy}-${mm}-${dd}`;
    };

    const selectedDiretrizValue =
        anexoDiretrizTemplateId === null
            ? (diretrizOptions[0]?.value ?? "")
            : (diretrizOptions.find((option) => option.templateId === anexoDiretrizTemplateId)?.value ??
                diretrizOptions[0]?.value ??
                "");

    const handleAttachmentInput = (anexoId: string, files: FileList | null) => {
        handleAnexoFiles(anexoId, files);
    };

    const orientationOptions: Array<{ label: string; value: AnexoOrientation }> = [
        {label: "Automático", value: "auto"},
        {label: "Retrato", value: "portrait"},
        {label: "Paisagem", value: "landscape"},
    ];
    const orientationLabelByValue: Record<AnexoOrientation, string> = {
        auto: "Orientação: automática",
        portrait: "Orientação: retrato",
        landscape: "Orientação: paisagem",
    };

    return (
        <>
            <section className="px-2">
                <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
                    Inclusão de Anexos
                </h1>
                <p className="mt-1 text-[14px] text-muted-foreground">Insira documentos</p>
            </section>

            <section
                className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
                <div className="mb-4">
                    <p className="text-[12px] font-semibold text-muted-foreground">Anexos opcionais</p>
                    <p className="text-[12px] text-muted-foreground">
                        Adicione documentos complementares quando necessário.
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-[1.2fr_1.4fr]">
                    <div>
                        <label className="text-[12px] font-semibold text-muted-foreground">
                            Modelo para geração de PDF
                        </label>
                        <div className="mt-2">
                            <SearchableSelect
                                value={selectedDiretrizValue}
                                onChange={(value) => {
                                    const selectedOption =
                                        diretrizOptions.find((option) => option.value === value) ??
                                        diretrizOptions[0];
                                    if (!selectedOption) return;
                                    setAnexoDiretriz(selectedOption.label);
                                    setAnexoDiretrizTemplateId(selectedOption.templateId);
                                }}
                                options={diretrizOptions.map((option) => ({
                                    label: option.label,
                                    value: option.value,
                                }))}
                                buttonClassName={selectBaseClass}
                                searchPlaceholder="Filtrar modelo"
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
                                    accept="application/pdf,image/png,image/jpeg"
                                    multiple
                                    className="hidden"
                                    onChange={(event) =>
                                        handleAttachmentInput("anexo-art", event.target.files)
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
                                <div className="flex items-center gap-2">
                                    <input
                                        className={`${inputInlineClass} w-auto min-w-[180px] max-w-[420px]`}
                                        size={Math.max(18, Math.min(48, (anexo.title || "").length + 2))}
                                        value={anexo.title}
                                        onChange={(event) =>
                                            handleRenameAnexoTitle(anexo.id, event.target.value)
                                        }
                                    />
                                    <input
                                        type="date"
                                        className="h-[36px] w-[130px] rounded-[8px] border border-border bg-muted px-3 text-center text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                        aria-label="Data do anexo"
                                        value={toDateInputValue(anexo.files[0]?.date)}
                                        onChange={(event) => {
                                            anexo.files.forEach((file) => {
                                                handleAnexoFileDateChange(anexo.id, file.id, event.target.value);
                                            });
                                        }}
                                    />
                                </div>
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
                                        Adicionar anexo
                                        <input
                                            type="file"
                                            accept="application/pdf,image/png,image/jpeg"
                                            multiple
                                            className="hidden"
                                            onChange={(event) =>
                                                handleAttachmentInput(anexo.id, event.target.files)
                                            }
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAnexo(anexo.id)}
                                        disabled={anexo.id === "anexo-art"}
                                        className={
                                            anexo.id === "anexo-art"
                                                ? "btn-disabled px-3 py-1 text-[12px]"
                                                : "btn-outline px-3 py-1 text-[12px] text-danger-foreground hover:bg-danger/10"
                                        }
                                    >
                                        Remover anexo
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {anexo.files.length ? (
                                    anexo.files.map((file) => (
                                        <div
                                            key={file.id}
                                            className="rounded-[10px] border border-border/60 bg-card px-3 py-2"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
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
                                                <div className="flex items-center gap-2">
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
                                                        onClick={() => {
                                                            handleAnexoFileRemove(anexo.id, file.id);
                                                        }}
                                                        className="btn-outline px-3 py-1 text-[12px] text-danger-foreground hover:bg-danger/10"
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            </div>
                                            <text className="text-[12px] text-muted-foreground">
                                                Orientação do anexo:
                                            </text>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">

                                                <div className="w-[150px]">
                                                    <SearchableSelect
                                                        value={file.orientation ?? "auto"}
                                                        onChange={(value) =>
                                                            handleAnexoFileOrientationChange(
                                                                anexo.id,
                                                                file.id,
                                                                (value as AnexoOrientation) || "auto"
                                                            )
                                                        }
                                                        options={orientationOptions}
                                                        buttonClassName={selectBaseClass}
                                                        searchPlaceholder="Filtrar orientação"
                                                    />
                                                </div>

                                            </div>
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
