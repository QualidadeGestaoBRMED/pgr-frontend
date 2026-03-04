import { AnexosStep } from "../anexos-step";
import type { StepRenderer } from "./types";

export const renderAnexosStep: StepRenderer = (ctx) => (
  <AnexosStep
    ctx={{
      anexoDiretriz: ctx.anexoDiretriz,
      setAnexoDiretriz: ctx.setAnexoDiretriz,
      diretrizOptions: ctx.diretrizOptions,
      selectBaseClass: ctx.selectBaseClass,
      handleAnexoFiles: ctx.generalActions.handleAnexoFiles,
      anexos: ctx.anexos,
      handleAnexoDragStart: ctx.generalActions.handleAnexoDragStart,
      handleAnexoDragOver: ctx.generalActions.handleAnexoDragOver,
      handleAnexoDrop: ctx.generalActions.handleAnexoDrop,
      handleAnexoDragEnd: ctx.generalActions.handleAnexoDragEnd,
      dragOverAnexoId: ctx.dragOverAnexoId,
      inputInlineClass: ctx.inputInlineClass,
      handleRenameAnexoTitle: ctx.generalActions.handleRenameAnexoTitle,
      handleMoveAnexo: ctx.generalActions.handleMoveAnexo,
      handleAnexoFileRename: ctx.generalActions.handleAnexoFileRename,
      handleAnexoFileRemove: ctx.generalActions.handleAnexoFileRemove,
      handleAnexoFileDownload: ctx.generalActions.handleAnexoFileDownload,
      handleAddAnexo: ctx.generalActions.handleAddAnexo,
    }}
  />
);
