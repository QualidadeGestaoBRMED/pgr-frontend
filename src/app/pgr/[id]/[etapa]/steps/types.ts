export type InicioDraft = {
  syncedAt: string | null;
  pipefyCardId: string;
  documentTitle: string;
  companyName: string;
  unitName: string;
  cnpj: string;
  responsible: string;
  email: string;
  notes: string;
};

export type InicioDraftEditableField = keyof Omit<InicioDraft, "syncedAt">;

export type DadosCadastraisDraft = {
  empresaRazaoSocial: string;
  empresaGrupo: string;
  empresaCnpj: string;
  empresaNome: string;
  empresaCnae: string;
  empresaEndereco: string;
  empresaCep: string;
  empresaCidade: string;
  empresaEstado: string;
  empresaGrauRisco: string;
  empresaAtividadePrincipal: string;
  estabelecimentoNome: string;
  estabelecimentoCnpj: string;
  estabelecimentoRazaoSocial: string;
  estabelecimentoCnae: string;
  estabelecimentoGrauRisco: string;
  estabelecimentoAtividadePrincipal: string;
  contratanteNomeFantasia: string;
  contratanteRazaoSocial: string;
  contratanteCnpj: string;
  contratanteCnae: string;
  contratanteEndereco: string;
  contratanteCep: string;
  contratanteCidade: string;
  contratanteEstado: string;
  contratanteGrauRisco: string;
  contratanteAtividadePrincipal: string;
  responsavelPgrNome: string;
  responsavelPgrFuncao: string;
  responsavelPgrTelefone: string;
  responsavelPgrEmail: string;
  responsavelPgrCpf: string;
};
