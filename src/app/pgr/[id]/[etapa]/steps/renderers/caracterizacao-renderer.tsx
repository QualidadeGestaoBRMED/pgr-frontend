import { CaracterizacaoStep } from "../caracterizacao-step";
import type { StepRenderer } from "./types";

export const renderCaracterizacaoStep: StepRenderer = (ctx) => (
  <CaracterizacaoStep
    ctx={{
      riskGheGroups: ctx.riskGheGroups,
      setRiskGheGroups: ctx.setRiskGheGroups,
      currentRiskGheId: ctx.currentRiskGheId,
      setCurrentRiskGheId: ctx.setCurrentRiskGheId,
      pushHistory: ctx.pushHistory,
      applyMissingRiskDefaults: ctx.applyMissingRiskDefaults,
      tipoAgenteOptions: ctx.tipoAgenteOptions,
      getDescricaoAgenteOptions: ctx.getDescricaoAgenteOptions,
      inputBaseClass: ctx.inputBaseClass,
      inputInlineClass: ctx.inputInlineClass,
      textareaBaseClass: ctx.textareaBaseClass,
      selectSmallClass: ctx.selectSmallClass,
    }}
  />
);
