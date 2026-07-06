import { AnexosStep } from "../anexos-step";
import type { StepRenderer } from "./types";

export const renderAnexosStep: StepRenderer = (ctx) => (
  <AnexosStep
    ctx={{
      anexoDiretriz: ctx.anexoDiretriz,
      anexoDiretrizTemplateId: ctx.anexoDiretrizTemplateId,
      setAnexoDiretriz: ctx.setAnexoDiretriz,
      setAnexoDiretrizTemplateId: ctx.setAnexoDiretrizTemplateId,
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
      handleAnexoFileOrientationChange: ctx.generalActions.handleAnexoFileOrientationChange,
      handleAnexoFileRename: ctx.generalActions.handleAnexoFileRename,
      handleAnexoFileDateChange: ctx.generalActions.handleAnexoFileDateChange,
      handleAnexoFileRemove: ctx.generalActions.handleAnexoFileRemove,
      handleAnexoFileDownload: ctx.generalActions.handleAnexoFileDownload,
      handleAddAnexo: ctx.generalActions.handleAddAnexo,
      handleRemoveAnexo: ctx.generalActions.handleRemoveAnexo,
    }}
  />
);
