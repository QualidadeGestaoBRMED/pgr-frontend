"use client";

import { AlertTriangle } from "lucide-react";

export type FunctionInclusionRequestItem = {
  notificationId: string;
  requestNumber: string;
  prazoSeguranca: string;
  dataSolicitacao: string;
};

type FunctionInclusionRequestsModalProps = {
  open: boolean;
  mode: "view" | "resolve";
  companyLabel: string;
  requests: FunctionInclusionRequestItem[];
  onClose: () => void;
  // resolve-mode only:
  selectedIds?: string[];
  onToggleSelected?: (notificationId: string) => void;
  onResolveSelected?: () => void;
  onResolveAll?: () => void;
  resolving?: boolean;
};

/**
 * Quadro de solicitações de inclusão de função pendentes de uma empresa.
 *
 * Reaproveitado em dois lugares: o banner da Home ("Verificar solicitações",
 * mode="resolve" -- checkboxes + Finalizar selecionadas/todas) e a tela de
 * elaboração do PGR (botão flutuante, mode="view" -- só consulta, sem ação
 * de finalizar, e também usado automaticamente logo após uma finalização de
 * inclusão de função pra já abrir o fluxo de resolução).
 */
export function FunctionInclusionRequestsModal({
  open,
  mode,
  companyLabel,
  requests,
  onClose,
  selectedIds = [],
  onToggleSelected,
  onResolveSelected,
  onResolveAll,
  resolving = false,
}: FunctionInclusionRequestsModalProps) {
  if (!open) return null;

  const isResolveMode = mode === "resolve";

  return (
    <div
      className="fixed inset-0 z-50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="function-inclusion-confirmation-title"
      aria-describedby="function-inclusion-confirmation-description"
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 cursor-default bg-black/55"
        disabled={resolving}
        onClick={onClose}
      />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-[620px] rounded-[16px] border border-border bg-card px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="function-inclusion-confirmation-title"
                className="text-[19px] font-semibold text-foreground"
              >
                {isResolveMode
                  ? "Verificação das solicitações"
                  : "Solicitaçẽos pendentes"}
              </h2>
              <p
                id="function-inclusion-confirmation-description"
                className="mt-2 text-[13px] leading-5 text-muted-foreground"
              >
                {isResolveMode ? (
                  <>
                    Nesta etapa, será possível visualizar as informações referentes
                    ao número da solicitação da empresa:{" "}
                    <strong className="text-foreground">{companyLabel}</strong>.
                  </>
                ) : (
                  <>
                    Solicitações de inclusão de função pendentes para a empresa:{" "}
                    <strong className="text-foreground">{companyLabel}</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[12px] border border-border bg-background px-4 py-4">
            <p className="text-[13px] font-semibold text-foreground">
              Solicitações Nº:
            </p>
            <div className="mt-3 flex max-h-[240px] flex-wrap gap-2 overflow-y-auto">
              {requests.map((request) => {
                const checked = selectedIds.includes(request.notificationId);
                return (
                  <label
                    key={request.notificationId}
                    className="flex items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-2"
                  >
                    {isResolveMode ? (
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={resolving}
                        onChange={() => onToggleSelected?.(request.notificationId)}
                        className="h-4 w-4 accent-primary"
                      />
                    ) : null}
                    <span className="flex flex-col text-[13px] text-foreground">
                      <span className="font-semibold">
                        {request.requestNumber || request.notificationId}
                      </span>
                      {request.dataSolicitacao ? (
                        <span className="text-[11px] text-muted-foreground">
                          Solicitado em: {request.dataSolicitacao}
                        </span>
                      ) : null}
                      {request.prazoSeguranca ? (
                        <span className="text-[11px] text-muted-foreground">
                          Prazo segurança: {request.prazoSeguranca}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {isResolveMode ? (
            <div className="mt-5 rounded-[12px] border border-warning/40 bg-warning/15 px-4 py-3">
              <ul className="space-y-1.5 text-[13px] leading-5 text-foreground">
                <li>
                  <strong className="font-semibold">Finalizar selecionadas:</strong>{" "}
                  Finaliza somente as solicitações marcadas e mantém as demais em aberto.
                </li>
                <li>
                  <strong className="font-semibold">Finalizar todas:</strong>{" "}
                  Encerra todas as pendências desta empresa.
                </li>
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              autoFocus
              disabled={resolving}
              onClick={onClose}
              className={
                resolving ? "btn-disabled px-4 py-2 text-[14px]" : "btn-secondary px-4 py-2 text-[14px]"
              }
            >
              {isResolveMode ? "Cancelar" : "Fechar"}
            </button>
            {isResolveMode ? (
              <>
                <button
                  type="button"
                  disabled={resolving || selectedIds.length === 0}
                  onClick={onResolveSelected}
                  className={
                    resolving || selectedIds.length === 0
                      ? "btn-disabled px-4 py-2 text-[14px]"
                      : "btn-primary px-4 py-2 text-[14px]"
                  }
                >
                  {resolving ? "Finalizando..." : "Finalizar selecionadas"}
                </button>
                <button
                  type="button"
                  disabled={resolving}
                  onClick={onResolveAll}
                  className={
                    resolving ? "btn-disabled px-4 py-2 text-[14px]" : "btn-secondary px-4 py-2 text-[14px]"
                  }
                >
                  {resolving ? "Finalizando..." : "Finalizar todas"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
