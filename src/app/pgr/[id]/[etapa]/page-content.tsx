"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { PgrShell } from "@/components/pgr-shell";
import { PgrStepBody } from "./steps/pgr-step-body";
import { StepFooterActions } from "./steps/step-footer-actions";
import { SaveConflictDialog } from "./steps/save-conflict-dialog";
import { SaveErrorBanner } from "./steps/save-error-banner";
import { FunctionInclusionBanner } from "./steps/function-inclusion-banner";
import {
  shouldShowFunctionInclusionBanner,
  shouldUseReadOnlyPgrView,
} from "./steps/function-inclusion-banner-visibility";
import { PreviousVersionDialog } from "./steps/previous-version-dialog";
import { FinalizationLockDialog } from "./steps/finalization-lock-dialog";
import { usePgrEtapaController } from "./hooks/use-pgr-etapa-controller";

const EDITABLE_TARGET_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="switch"]',
  '[draggable="true"]',
].join(",");

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest(EDITABLE_TARGET_SELECTOR));

export default function PgrEtapaPage({
  params,
}: {
  params: { id: string; etapa: string };
}) {
  const {
    conflict,
    saveError,
    previousImportDialog,
    finalizationLock,
    shellProps,
    bodyCtx,
    footerProps,
  } = usePgrEtapaController({
    params,
  });
  const readOnlyContentRef = useRef<HTMLDivElement>(null);
  const [editAttempted, setEditAttempted] = useState(false);
  const functionInclusionReadOnly = Boolean(
    bodyCtx.functionInclusionElaboration?.readOnly
  );
  const contentReadOnly = shouldUseReadOnlyPgrView({
    finalizationActive: finalizationLock.active,
    functionInclusionReadOnly,
  });

  const notifyBlockedEdit = useCallback(() => {
    setEditAttempted(true);
  }, []);

  useEffect(() => {
    if (!contentReadOnly) {
      setEditAttempted(false);
      return;
    }
    const focusedElement = document.activeElement;
    if (
      focusedElement instanceof HTMLElement &&
      readOnlyContentRef.current?.contains(focusedElement)
    ) {
      focusedElement.blur();
    }
  }, [contentReadOnly]);

  useEffect(() => {
    if (!editAttempted) return;
    const timeoutId = window.setTimeout(() => setEditAttempted(false), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [editAttempted]);

  const blockPointerEdit = (event: PointerEvent<HTMLDivElement>) => {
    if (!contentReadOnly || !isEditableTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    notifyBlockedEdit();
  };

  const blockClickEdit = (event: MouseEvent<HTMLDivElement>) => {
    if (!contentReadOnly || !isEditableTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    notifyBlockedEdit();
  };

  const blockKeyboardEdit = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!contentReadOnly || !isEditableTarget(event.target)) return;
    const allowedCopyShortcut =
      (event.ctrlKey || event.metaKey) && ["a", "c"].includes(event.key.toLowerCase());
    if (event.key === "Tab" || event.key === "Escape" || allowedCopyShortcut) return;
    event.preventDefault();
    event.stopPropagation();
    notifyBlockedEdit();
  };

  const blockClipboardEdit = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!contentReadOnly || !isEditableTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    notifyBlockedEdit();
  };

  const blockDropEdit = (event: DragEvent<HTMLDivElement>) => {
    if (!contentReadOnly || !isEditableTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    notifyBlockedEdit();
  };

  return (
    <PgrShell
      pgrId={shellProps.pgrId}
      currentStep={shellProps.currentStep}
      completedSteps={shellProps.completedSteps}
      progressPercent={shellProps.progressPercent}
      stepStatusById={shellProps.stepStatusById}
      alertSteps={shellProps.alertSteps}
      accessibleStepIds={shellProps.accessibleStepIds}
      onNavigateStep={shellProps.onNavigateStep}
      cycleTimeMs={shellProps.cycleTimeMs}
      cycleSessionStartedAtMs={shellProps.cycleSessionStartedAtMs}
    >
      <FinalizationLockDialog
        open={finalizationLock.active}
        startedAt={finalizationLock.startedAt}
        startedBy={finalizationLock.startedBy}
        isCancelling={finalizationLock.isCancelling}
        editAttempted={editAttempted}
        onCancel={finalizationLock.onCancel}
      />
      <div
        ref={readOnlyContentRef}
        aria-readonly={contentReadOnly}
        className={`space-y-5 sm:space-y-6 ${
          contentReadOnly
            ? "[&_button]:cursor-not-allowed [&_input]:cursor-not-allowed [&_select]:cursor-not-allowed [&_textarea]:cursor-not-allowed"
            : ""
        }`}
        onPointerDownCapture={blockPointerEdit}
        onClickCapture={blockClickEdit}
        onKeyDownCapture={blockKeyboardEdit}
        onPasteCapture={blockClipboardEdit}
        onCutCapture={blockClipboardEdit}
        onDropCapture={blockDropEdit}
      >
        <FunctionInclusionBanner
          active={shouldShowFunctionInclusionBanner({
            functionInclusionPending: Boolean(bodyCtx.functionInclusionPending),
            isInElaborationPhase: Boolean(
              bodyCtx.functionInclusionElaboration?.active
            ),
            isLocked: bodyCtx.workflow.isLocked,
          })}
          responsibleName={bodyCtx.functionInclusionElaboration?.responsibleName}
          readOnly={functionInclusionReadOnly}
        />
        <PgrStepBody ctx={bodyCtx} />
      </div>
      <StepFooterActions {...footerProps} readOnly={contentReadOnly} />
      <SaveConflictDialog
        open={conflict.open}
        onReload={conflict.onReload}
        onDismiss={conflict.onDismiss}
      />
      <SaveErrorBanner active={saveError} />
      <PreviousVersionDialog
        open={previousImportDialog.open}
        companyName={previousImportDialog.companyName}
        finalizedAt={previousImportDialog.finalizedAt}
        attachmentsCount={previousImportDialog.attachmentsCount}
        importing={previousImportDialog.importing}
        error={previousImportDialog.error}
        onImport={previousImportDialog.onImport}
      />
    </PgrShell>
  );
}
