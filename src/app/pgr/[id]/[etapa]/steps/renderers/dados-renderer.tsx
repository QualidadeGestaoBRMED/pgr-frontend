import { DadosStep } from "../dados-step";
import { SearchableSelect } from "../searchable-select";
import type { StepRenderer } from "./types";

export const renderDadosStep: StepRenderer = (ctx) => (
  <DadosStep
    inputBaseClass={ctx.inputBaseClass}
    selectBaseClass={ctx.selectBaseClass}
    dadosCadastrais={ctx.dadosCadastrais}
    estabelecimentoSelecionado={ctx.estabelecimentoSelecionado}
    estabelecimentoOptions={ctx.estabelecimentoOptions}
    SearchableSelect={SearchableSelect}
    extraFields={ctx.extraEstabelecimentoFields}
    onDadosChange={ctx.generalActions.handleDadosCadastraisChange}
    onCepBlur={ctx.generalActions.handleRecalculateByCep}
    onSelectEstabelecimento={ctx.setEstabelecimentoSelecionado}
    onExtraFieldChange={ctx.generalActions.handleExtraEstabelecimentoFieldChange}
    onRemoveExtraField={ctx.generalActions.handleRemoveExtraField}
    onAddExtraField={ctx.generalActions.handleAddExtraField}
  />
);
