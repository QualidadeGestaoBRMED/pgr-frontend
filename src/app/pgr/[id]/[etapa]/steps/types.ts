export type InicioDraft = {
  syncedAt: string | null;
  pipefyCardId: string;
  documentTitle: string;
  companyName: string;
  unitName: string;
  cnpj: string;
  responsible: string;
  responsibleRole: string;
  email: string;
  notes: string;
};

export type InicioDraftEditableField = keyof Omit<InicioDraft, "syncedAt">;

export type CampoAdicionalDraft = {
  id: string;
  title: string;
  value: string;
};

export type EstabelecimentoDraft = {
  id: string;
  tipo: string;
  nome: string;
  cnpj: string;
  razaoSocial: string;
  cnae: string;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  grauRisco: string;
  atividadePrincipal: string;
  camposAdicionais: CampoAdicionalDraft[];
};

export type ContratanteDraft = {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  cnae: string;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  grauRisco: string;
  atividadePrincipal: string;
  camposAdicionais: CampoAdicionalDraft[];
};

export type ResponsavelCoordenacaoTecnicaDraft = {
  id: string;
  nome: string;
  funcao: string;
  registroProfissional: string;
  telefone: string;
  email: string;
  cpf: string;
};

export type DadosCadastraisDraft = {
  empresaRazaoSocial: string;
  empresaGrupo: string;
  empresaCnpj: string;
  empresaNome: string;
  empresaCnae: string;
  empresaEndereco: string;
  empresaNumero: string;
  empresaBairro: string;
  empresaCep: string;
  empresaCidade: string;
  empresaEstado: string;
  empresaGrauRisco: string;
  empresaAtividadePrincipal: string;
  estabelecimentos: EstabelecimentoDraft[];
  estabelecimentoNome: string;
  estabelecimentoCnpj: string;
  estabelecimentoRazaoSocial: string;
  estabelecimentoCnae: string;
  estabelecimentoEndereco: string;
  estabelecimentoNumero: string;
  estabelecimentoBairro: string;
  estabelecimentoCep: string;
  estabelecimentoCidade: string;
  estabelecimentoEstado: string;
  estabelecimentoGrauRisco: string;
  estabelecimentoAtividadePrincipal: string;
  contratantes: ContratanteDraft[];
  contratanteNomeFantasia: string;
  contratanteRazaoSocial: string;
  contratanteCnpj: string;
  contratanteCnae: string;
  contratanteEndereco: string;
  contratanteNumero: string;
  contratanteBairro: string;
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
  responsavelImplementacaoPgrNome: string;
  responsavelImplementacaoPgrFuncao: string;
  responsavelImplementacaoPgrTelefone: string;
  responsavelImplementacaoPgrEmail: string;
  responsavelImplementacaoPgrCpf: string;
  responsavelImplementacaoPgrRegistroProfissional: string;
  responsaveisCoordenacaoTecnica: ResponsavelCoordenacaoTecnicaDraft[];
};
