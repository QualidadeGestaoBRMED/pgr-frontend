import type { DadosCadastraisDraft } from "./types";

type SearchableSelectOption = {
  label: string;
  value: string;
};

type SearchableSelectComponentProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  buttonClassName: string;
  placeholder?: string;
  searchPlaceholder?: string;
  menuClassName?: string;
  disabled?: boolean;
};

type DadosStepProps = {
  inputBaseClass: string;
  selectBaseClass: string;
  dadosCadastrais: DadosCadastraisDraft;
  estabelecimentoSelecionado: string;
  estabelecimentoOptions: string[];
  SearchableSelect: (props: SearchableSelectComponentProps) => JSX.Element;
  extraFields: Array<{
    id: string;
    title: string;
    value: string;
    scope: "empresa" | "estabelecimento" | "contratante";
  }>;
  onDadosChange: (field: keyof DadosCadastraisDraft, value: string) => void;
  onCepBlur: (scope: "empresa" | "contratante", value: string) => void;
  onSelectEstabelecimento: (value: string) => void;
  onExtraFieldChange: (
    id: string,
    field: "title" | "value",
    value: string
  ) => void;
  onRemoveExtraField: (id: string) => void;
  onAddExtraField: (scope: "empresa" | "estabelecimento" | "contratante") => void;
};

export function DadosStep({
  inputBaseClass,
  selectBaseClass,
  dadosCadastrais,
  estabelecimentoSelecionado,
  estabelecimentoOptions,
  SearchableSelect,
  extraFields,
  onDadosChange,
  onCepBlur,
  onSelectEstabelecimento,
  onExtraFieldChange,
  onRemoveExtraField,
  onAddExtraField,
}: DadosStepProps) {
  const empresaExtraFields = extraFields.filter((field) => field.scope === "empresa");
  const estabelecimentoExtraFields = extraFields.filter(
    (field) => field.scope === "estabelecimento"
  );
  const contratanteExtraFields = extraFields.filter(
    (field) => field.scope === "contratante"
  );

  const renderExtraFields = (
    fields: Array<{ id: string; title: string; value: string }>
  ) => {
    if (!fields.length) return null;
    return (
      <div className="mt-6 space-y-4">
        <p className="text-[12px] font-semibold text-foreground">Campos adicionais</p>
        {fields.map((field, index) => (
          <div key={field.id}>
            <div className="flex items-center justify-between gap-3">
              <label className="text-[12px] font-medium text-foreground">
                Campo adicional {index + 1}
              </label>
              <button
                type="button"
                onClick={() => onRemoveExtraField(field.id)}
                className="btn-outline px-3 py-1 text-[12px] text-danger hover:bg-danger/10"
              >
                Excluir
              </button>
            </div>
            <div className="mt-2 space-y-3">
              <input
                className={inputBaseClass}
                value={field.title}
                onChange={(event) =>
                  onExtraFieldChange(field.id, "title", event.target.value)
                }
                placeholder="Título do campo"
              />
              <input
                className={inputBaseClass}
                value={field.value}
                onChange={(event) =>
                  onExtraFieldChange(field.id, "value", event.target.value)
                }
                placeholder="Valor"
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleCepInputChange = (
    scope: "empresa" | "contratante",
    value: string,
    field: "empresaCep" | "contratanteCep"
  ) => {
    onDadosChange(field, value);
    if (value.replace(/\D/g, "").length === 8) {
      onCepBlur(scope, value);
    }
  };

  return (
    <>
      <section className="px-2">
        <h1 className="text-[22px] font-medium text-foreground sm:text-[24px]">
          Dados cadastrais
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Preencha os dados da empresa, estabelecimento e contratante
        </p>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <h2 className="text-[16px] font-medium text-foreground">
          Identificação da Empresa:
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1.2fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Razão Social:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaRazaoSocial}
              onChange={(event) =>
                onDadosChange("empresaRazaoSocial", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Grupo:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaGrupo}
              onChange={(event) =>
                onDadosChange("empresaGrupo", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              CNPJ:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaCnpj}
              onChange={(event) =>
                onDadosChange("empresaCnpj", event.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Empresa:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaNome}
              onChange={(event) =>
                onDadosChange("empresaNome", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              CNAE:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaCnae}
              onChange={(event) =>
                onDadosChange("empresaCnae", event.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Endereço
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaEndereco}
              onChange={(event) =>
                onDadosChange("empresaEndereco", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CEP:</label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaCep}
              onChange={(event) =>
                handleCepInputChange("empresa", event.target.value, "empresaCep")
              }
              onBlur={(event) => onCepBlur("empresa", event.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Cidade:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaCidade}
              onChange={(event) =>
                onDadosChange("empresaCidade", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Estado:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaEstado}
              onChange={(event) =>
                onDadosChange("empresaEstado", event.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Grau de Risco:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaGrauRisco}
              onChange={(event) =>
                onDadosChange("empresaGrauRisco", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Descrição de Atividade Principal:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.empresaAtividadePrincipal}
              onChange={(event) =>
                onDadosChange("empresaAtividadePrincipal", event.target.value)
              }
            />
          </div>
        </div>

        {renderExtraFields(empresaExtraFields)}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onAddExtraField("empresa")}
            className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
          >
            Adicionar Campo
          </button>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <h2 className="text-[16px] font-medium text-foreground">
          Identificação da Estabelecimento:
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1.2fr_1fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Nome do Estabelecimento:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoNome}
              onChange={(event) =>
                onDadosChange("estabelecimentoNome", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CNPJ:</label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoCnpj}
              onChange={(event) =>
                onDadosChange("estabelecimentoCnpj", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Estabelecimento:
            </label>
            <div className="mt-2">
              <SearchableSelect
                value={estabelecimentoSelecionado}
                onChange={onSelectEstabelecimento}
                options={estabelecimentoOptions.map((option) => ({
                  label: option,
                  value: option,
                }))}
                buttonClassName={selectBaseClass}
                placeholder="Selecione"
                searchPlaceholder="Filtrar estabelecimento"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_1.2fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Razão Social:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoRazaoSocial}
              onChange={(event) =>
                onDadosChange("estabelecimentoRazaoSocial", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              CNAE:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoCnae}
              onChange={(event) =>
                onDadosChange("estabelecimentoCnae", event.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Grau de Risco:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoGrauRisco}
              onChange={(event) =>
                onDadosChange("estabelecimentoGrauRisco", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Descrição de Atividade Principal:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.estabelecimentoAtividadePrincipal}
              onChange={(event) =>
                onDadosChange(
                  "estabelecimentoAtividadePrincipal",
                  event.target.value
                )
              }
            />
          </div>
        </div>

        {renderExtraFields(estabelecimentoExtraFields)}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onAddExtraField("estabelecimento")}
            className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
          >
            Adicionar Campo
          </button>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <h2 className="text-[16px] font-medium text-foreground">
          Identificação da Contratante:
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1.6fr_1.1fr_1fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Nome Fantasia:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteNomeFantasia}
              onChange={(event) =>
                onDadosChange("contratanteNomeFantasia", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Razão social:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteRazaoSocial}
              onChange={(event) =>
                onDadosChange("contratanteRazaoSocial", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CNPJ:</label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteCnpj}
              onChange={(event) =>
                onDadosChange("contratanteCnpj", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              CNAE:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteCnae}
              onChange={(event) =>
                onDadosChange("contratanteCnae", event.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[2.4fr_0.7fr_1.6fr_1.1fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Endereço
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteEndereco}
              onChange={(event) =>
                onDadosChange("contratanteEndereco", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CEP:</label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteCep}
              onChange={(event) =>
                handleCepInputChange(
                  "contratante",
                  event.target.value,
                  "contratanteCep"
                )
              }
              onBlur={(event) => onCepBlur("contratante", event.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Cidade:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteCidade}
              onChange={(event) =>
                onDadosChange("contratanteCidade", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Estado:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteEstado}
              onChange={(event) =>
                onDadosChange("contratanteEstado", event.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.6fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Grau de Risco:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteGrauRisco}
              onChange={(event) =>
                onDadosChange("contratanteGrauRisco", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Descrição de Atividade Principal:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.contratanteAtividadePrincipal}
              onChange={(event) =>
                onDadosChange("contratanteAtividadePrincipal", event.target.value)
              }
            />
          </div>
        </div>

        {renderExtraFields(contratanteExtraFields)}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onAddExtraField("contratante")}
            className="btn-outline rounded-[10px] px-4 py-2 text-[14px]"
          >
            Adicionar Campo
          </button>
        </div>
      </section>

      <section className="rounded-[14px] bg-card px-6 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none dark:border dark:border-border/60">
        <h2 className="text-[16px] font-medium text-foreground">
          Responsável pelo PGR na Organização:
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.6fr_1.2fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Nome:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.responsavelPgrNome}
              onChange={(event) =>
                onDadosChange("responsavelPgrNome", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Função:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.responsavelPgrFuncao}
              onChange={(event) =>
                onDadosChange("responsavelPgrFuncao", event.target.value)
              }
            />
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_0.9fr]">
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Telefone:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.responsavelPgrTelefone}
              onChange={(event) =>
                onDadosChange("responsavelPgrTelefone", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">
              Email:
            </label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.responsavelPgrEmail}
              onChange={(event) =>
                onDadosChange("responsavelPgrEmail", event.target.value)
              }
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground">CPF:</label>
            <input
              className={inputBaseClass}
              value={dadosCadastrais.responsavelPgrCpf}
              onChange={(event) =>
                onDadosChange("responsavelPgrCpf", event.target.value)
              }
            />
          </div>
        </div>
      </section>
    </>
  );
}
