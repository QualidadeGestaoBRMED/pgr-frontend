import { PlanoStep } from "../plano-step";
import type { StepRenderer } from "./types";

export const renderPlanoStep: StepRenderer = (ctx) => (
  <PlanoStep
    ctx={{
      inputBaseClass: ctx.inputBaseClass,
      textareaBaseClass: ctx.textareaBaseClass,
      selectBaseClass: ctx.selectBaseClass,
      defaultResponsibleActionName:
        ctx.dadosCadastrais.empresaRazaoSocial ||
        ctx.dadosCadastrais.empresaNome ||
        "",
      handleResetPlanoData: ctx.handleResetPlanoData,
      planAction: ctx.planAction,
      maskDate: ctx.generalActions.maskDate,
      setPlanAction: ctx.setPlanAction,
      planTableRows: ctx.planTableRows,
      planTableRowsPage: ctx.planTableRowsPage,
      getActionDescriptionOptions: ctx.getActionDescriptionOptions,
      handlePlanRiskFieldChange: ctx.generalActions.handlePlanRiskFieldChange,
      handlePlanMedidasChange: ctx.generalActions.handlePlanMedidasChange,
      handleDeleteMedidas: ctx.generalActions.handleDeleteMedidas,
      planTableCurrentPage: ctx.planTableCurrentPage,
      planTableTotalPages: ctx.planTableTotalPages,
      setPlanTablePage: ctx.setPlanTablePage,
      isPlanActionModalOpen: ctx.isPlanActionModalOpen,
      setIsPlanActionModalOpen: ctx.setIsPlanActionModalOpen,
      handleOpenPlanActionModal: ctx.generalActions.handleOpenPlanActionModal,
      handleChangePlanActionScope: ctx.generalActions.handleChangePlanActionScope,
      planActionScope: ctx.planActionScope,
      planActionGheId: ctx.planActionGheId,
      handlePlanActionGheChange: ctx.generalActions.handlePlanActionGheChange,
      planActionGheOptions: ctx.planActionGheOptions,
      planActionRiskId: ctx.planActionRiskId,
      setPlanActionRiskId: ctx.setPlanActionRiskId,
      planActionRiskOptions: ctx.planActionRiskOptions,
      planActionDescription: ctx.planActionDescription,
      setPlanActionDescription: ctx.setPlanActionDescription,
      handleSavePlanActionModal: ctx.generalActions.handleSavePlanActionModal,
    }}
  />
);
