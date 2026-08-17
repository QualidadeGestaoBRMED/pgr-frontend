"use client";

import { ExternalLink, History } from "lucide-react";

// O pgr_id É o id do card no Pipefy (Card.pipefy_id), então serve de deep link.
const PIPEFY_CARD_BASE_URL =
  process.env.NEXT_PUBLIC_PIPEFY_CARD_BASE_URL?.replace(/\/$/, "") ||
  "https://app.pipefy.com/open-cards";

// Estados de desenvolvimento/seed usam ids sintéticos ("pgr-import-..."), que
// não resolvem no Pipefy — nesses casos o id aparece como texto, sem link.
const pipefyCardUrl = (sourcePgrId: string) =>
  /^\d+$/.test(sourcePgrId) ? `${PIPEFY_CARD_BASE_URL}/${sourcePgrId}` : null;

export type PreviousVersionCandidate = {
  sourcePgrId: string;
  companyName?: string | null;
  responsible?: string | null;
  finalizedAt?: string | null;
  updatedAt?: string | null;
  importable?: boolean;
  blockedReason?: string | null;
};

type PreviousVersionDialogProps = {
  open: boolean;
  companyName: string;
  finalizedAt: string;
  attachmentsCount: number;
  candidates: PreviousVersionCandidate[];
  selectedSourcePgrId: string;
  onSelectSource: (sourcePgrId: string) => void;
  // Preenchido quando nenhum candidato é importável.
  unavailableNotice: string | null;
  onDismiss: (() => void) | null;
  importing: boolean;
  error: string | null;
  onImport: () => void;
};

/**
 * Seleção de PGR anterior para importar.
 *
 * Aparece ao abrir um card novo (recém-sincronizado com o Pipefy) quando a
 * mesma unidade já tem PGR na plataforma, e também no clique explícito em
 * "Importar dados de PGR anterior". Importar herda dados cadastrais, funções,
 * GHEs, riscos, plano de ação e anexos, abrindo a próxima revisão.
 *
 * Três estados:
 *
 * - vários candidatos: lista para escolher, do mais antigo para o mais novo;
 * - candidato único importável: aviso direto, sem lista;
 * - nenhum importável: informativo, listando os PGRs da unidade e o motivo de
 *   cada bloqueio.
 *
 * Sempre dispensável. Preencher do zero é uma escolha legítima, e fechar não
 * perde a oferta -- o botão na etapa Início reabre este modal.
 */
export function PreviousVersionDialog({
  open,
  companyName,
  finalizedAt,
  attachmentsCount,
  candidates,
  selectedSourcePgrId,
  onSelectSource,
  unavailableNotice,
  onDismiss,
  importing,
  error,
  onImport,
}: PreviousVersionDialogProps) {
  if (!open) return null;

  const importableCount = candidates.filter(
    (candidate) => candidate.importable
  ).length;
  // Lista quando há escolha a fazer OU quando nada é importável -- nesse caso a
  // lista é a explicação de por que não há origem disponível.
  const showPicker = candidates.length > 1 || importableCount === 0;
  const hasSelection = Boolean(selectedSourcePgrId);

  return (
    <div className="fixed inset-0 z-50" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
        <div
          className={`w-full rounded-[16px] bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] dark:border dark:border-border/60 ${
            showPicker ? "max-w-xl" : "max-w-md"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <History className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[18px] font-semibold text-foreground">
                {importableCount === 0
                  ? "Nenhum PGR anterior está disponível para importar"
                  : showPicker
                    ? "Selecione o PGR anterior para importar"
                    : "Encontramos um PGR anterior desta empresa"}
              </h3>
              {importableCount === 0 ? (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {unavailableNotice ||
                    "Os PGRs abaixo são desta mesma empresa, mas nenhum pode servir de origem agora."}
                </p>
              ) : showPicker ? (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Esta empresa tem mais de um PGR registrado. Escolha de qual
                  documento os dados serão herdados — a lista vai do mais antigo
                  para o mais novo.
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {companyName ? (
                    <>
                      A empresa <strong>{companyName}</strong> já possui um PGR
                      finalizado na plataforma
                    </>
                  ) : (
                    <>Esta empresa já possui um PGR finalizado na plataforma</>
                  )}
                  {finalizedAt ? <> em {finalizedAt}</> : null}.
                </p>
              )}
              {importableCount === 0 ? null : (
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Vamos preencher este documento com os dados cadastrais,
                  funções, GHEs, riscos, plano de ação
                  {attachmentsCount > 0
                    ? ` e ${attachmentsCount} anexo${attachmentsCount > 1 ? "s" : ""}`
                    : ""}{" "}
                  da versão anterior, abrindo a próxima revisão para edição.
                </p>
              )}
              {error ? (
                <p className="mt-2 text-[13px] font-medium text-danger-foreground">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          {showPicker ? (
            <ul className="mt-4 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {candidates.map((candidate) => {
                const importable = Boolean(candidate.importable);
                const selected = candidate.sourcePgrId === selectedSourcePgrId;
                const date = candidate.finalizedAt || candidate.updatedAt || "";
                const cardUrl = pipefyCardUrl(candidate.sourcePgrId);
                return (
                  <li
                    key={candidate.sourcePgrId}
                    className={`flex items-start gap-2 rounded-[10px] border px-3 py-2.5 transition-colors ${
                      importable
                        ? selected
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/70 hover:bg-muted/60"
                        : "border-border/50 bg-muted/40 opacity-70"
                    }`}
                  >
                    {/* O link do Pipefy fica FORA do label: um <a> aninhado em
                        label ativa o rádio junto ao clique. */}
                    <label
                      className={`flex min-w-0 flex-1 items-start gap-3 ${
                        importable ? "cursor-pointer" : "cursor-not-allowed"
                      }`}
                    >
                      <input
                        type="radio"
                        name="previous-pgr-source"
                        className="mt-1"
                        value={candidate.sourcePgrId}
                        checked={selected}
                        disabled={!importable || importing}
                        onChange={() => onSelectSource(candidate.sourcePgrId)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {candidate.companyName || "Empresa não identificada"}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-muted-foreground">
                          {candidate.responsible || "responsável não informado"}
                          {date ? ` · ${date}` : ""}
                        </span>
                        {!importable ? (
                          <span className="mt-1 block text-[12px] font-medium text-muted-foreground">
                            Aguardando finalização — precisa ser finalizado antes
                            de servir como origem.
                          </span>
                        ) : null}
                      </span>
                    </label>
                    {cardUrl ? (
                      <a
                        href={cardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Abrir o card ${candidate.sourcePgrId} no Pipefy`}
                        className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {candidate.sourcePgrId}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="mt-0.5 shrink-0 px-1.5 py-0.5 font-mono text-[12px] text-muted-foreground">
                        {candidate.sourcePgrId}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                disabled={importing}
                className="btn-outline px-3 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
                autoFocus={importableCount === 0}
              >
                Fechar
              </button>
            ) : null}
            {importableCount === 0 ? null : (
              <button
                type="button"
                onClick={onImport}
                disabled={importing || !hasSelection}
                className="btn-primary px-3 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
                autoFocus
              >
                {importing ? "Importando..." : "Importar dados"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
