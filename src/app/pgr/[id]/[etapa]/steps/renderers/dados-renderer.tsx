import { DadosStep } from "../dados-step";
import { SearchableSelect } from "../searchable-select";
import type { StepRenderer } from "./types";

export const renderDadosStep: StepRenderer = (ctx) => (
  <DadosStep
    inputBaseClass={ctx.inputBaseClass}
    selectBaseClass={ctx.selectBaseClass}
    pendingReviewFocus={ctx.pendingReviewFocus}
    dadosCadastrais={ctx.dadosCadastrais}
    estabelecimentoSelecionado={ctx.estabelecimentoSelecionado}
    estabelecimentoOptions={ctx.estabelecimentoOptions}
    SearchableSelect={SearchableSelect}
    extraFields={ctx.extraEstabelecimentoFields.filter(
      (
        field
      ): field is typeof field & {
        scope: "empresa" | "estabelecimento" | "quantitativo";
      } =>
        field.scope === "empresa" ||
        field.scope === "estabelecimento" ||
        field.scope === "quantitativo"
    )}
    onDadosChange={ctx.generalActions.handleDadosCadastraisChange}
    onCepBlur={ctx.generalActions.handleRecalculateByCep}
    establishments={ctx.dadosCadastrais.estabelecimentos}
    onEstablishmentChange={ctx.generalActions.handleEstablishmentChange}
    onAddEstablishment={ctx.generalActions.handleAddEstablishment}
    onDuplicateEstablishment={ctx.generalActions.handleDuplicateEstablishment}
    onRemoveEstablishment={ctx.generalActions.handleRemoveEstablishment}
    contractors={ctx.dadosCadastrais.contratantes}
    onContractorChange={ctx.generalActions.handleContractorChange}
    onContractorCepBlur={(index, value) =>
      ctx.generalActions.handleRecalculateByCep("contratante", value, index)
    }
    onAddContractorExtraField={ctx.generalActions.handleAddContractorExtraField}
    onContractorExtraFieldChange={ctx.generalActions.handleContractorExtraFieldChange}
    onRemoveContractorExtraField={ctx.generalActions.handleRemoveContractorExtraField}
    onAddContractor={ctx.generalActions.handleAddContractor}
    onDuplicateContractor={ctx.generalActions.handleDuplicateContractor}
    onRemoveContractor={ctx.generalActions.handleRemoveContractor}
    technicalCoordinators={ctx.dadosCadastrais.responsaveisCoordenacaoTecnica}
    onTechnicalCoordinatorChange={ctx.generalActions.handleTechnicalCoordinatorChange}
    onAddTechnicalCoordinator={ctx.generalActions.handleAddTechnicalCoordinator}
    onRemoveTechnicalCoordinator={ctx.generalActions.handleRemoveTechnicalCoordinator}
    onSelectEstabelecimento={ctx.setEstabelecimentoSelecionado}
    onExtraFieldChange={ctx.generalActions.handleExtraEstabelecimentoFieldChange}
    onRemoveExtraField={ctx.generalActions.handleRemoveExtraField}
    onAddExtraField={ctx.generalActions.handleAddExtraField}
    onClearData={ctx.handleResetDadosData}
  />
);
