import { CaracterizacaoStep } from "../caracterizacao-step";
import type { StepRenderer } from "./types";

export const buildCaracterizacaoStepCtx = (ctx: Parameters<StepRenderer>[0]) => ({
  handleResetCaracterizacaoData: ctx.handleResetCaracterizacaoData,
  riskGheGroups: ctx.riskGheGroups,
  setRiskGheGroups: ctx.setRiskGheGroups,
  currentRiskGheId: ctx.currentRiskGheId,
  setCurrentRiskGheId: ctx.setCurrentRiskGheId,
  pushHistory: ctx.pushHistory,
  applyMissingRiskDefaults: ctx.applyMissingRiskDefaults,
  tipoAgenteOptions: ctx.tipoAgenteOptions,
  getDescricaoAgenteOptions: ctx.getDescricaoAgenteOptions,
  getMeioPropagacaoOptions: ctx.getMeioPropagacaoOptions,
  getFontesOptions: ctx.getFontesOptions,
  getTipoAvaliacaoOptions: ctx.getTipoAvaliacaoOptions,
  getUnidadeMedidaOptions: ctx.getUnidadeMedidaOptions,
  getIntensidadeOptions: ctx.getIntensidadeOptions,
  getIsCalculatedCriteria: ctx.getIsCalculatedCriteria,
  getHasQuantitativeCriteria: ctx.getHasQuantitativeCriteria,
  getNivelAcaoOptions: ctx.getNivelAcaoOptions,
  getSeveridadeOptions: ctx.getSeveridadeOptions,
  getMedidasControleOptions: ctx.getMedidasControleOptions,
  getEpiOptions: ctx.getEpiOptions,
  getEpcOptions: ctx.getEpcOptions,
  calculateRiskClassification: ctx.calculateRiskClassification,
  inputBaseClass: ctx.inputBaseClass,
  inputInlineClass: ctx.inputInlineClass,
  textareaBaseClass: ctx.textareaBaseClass,
  selectSmallClass: ctx.selectSmallClass,
});

export type CaracterizacaoStepCtx = ReturnType<typeof buildCaracterizacaoStepCtx>;

export const renderCaracterizacaoStep: StepRenderer = (ctx) => (
  <CaracterizacaoStep ctx={buildCaracterizacaoStepCtx(ctx)} />
);
