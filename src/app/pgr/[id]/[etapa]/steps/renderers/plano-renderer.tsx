import { PlanoStep } from "../plano-step";
import type { StepRenderer } from "./types";

export const renderPlanoStep: StepRenderer = (ctx) => (
  <PlanoStep
    ctx={{
      inputBaseClass: ctx.inputBaseClass,
      textareaBaseClass: ctx.textareaBaseClass,
      selectBaseClass: ctx.selectBaseClass,
      defaultResponsibleActionName:
        ctx.dadosCadastrais.empresaGrupo || ctx.inicioDraft.companyName || "",
      handleResetPlanoData: ctx.handleResetPlanoData,
      historicoChanges: ctx.historicoData.changes,
      workflowVersion: ctx.workflow.version,
      planAction: ctx.planAction,
      maskDate: ctx.generalActions.maskDate,
      completeVigencia: ctx.generalActions.completeVigencia,
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
      isRiskCatalogsReady: ctx.riskCatalogs !== null,
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
      getPlanActionRiskOptions: ctx.getPlanActionRiskOptions,
      planActionRiskOptions: ctx.planActionRiskOptions,
      planActionDescription: ctx.planActionDescription,
      setPlanActionDescription: ctx.setPlanActionDescription,
      planActionPriority: ctx.planActionPriority,
      setPlanActionPriority: ctx.setPlanActionPriority,
      persistedOptionsByRowId: ctx.persistedOptionsByRowId,
      setPersistedOptionsByRowId: ctx.setPersistedOptionsByRowId,
      handleSavePlanActionModal: ctx.generalActions.handleSavePlanActionModal,
      handleCreateNrPlanRows: ctx.generalActions.handleCreateNrPlanRows,
    }}
  />
);
